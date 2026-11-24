"""Achievement rules and unlocking.

:func:`evaluate_and_unlock` is called by the actions that can move a metric
(today: a mission completion), inside that action's transaction and before its
commit -- so the unlock, its inbox notification and the XP/streak that earned
it all land together or not at all.
"""

from uuid import UUID, uuid4

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.achievements.models import Achievement, UserAchievement
from app.missions.models import Mission, MissionCompletion
from app.notifications import service as notifications
from app.users.models import User
from app.wellness.models import Streak


async def metrics(session: AsyncSession, user_id: UUID) -> dict[str, int]:
    """Current value of every rule_type for this user. Only fully completed
    missions (criteria_met) count, same as the streak."""
    done = MissionCompletion.criteria_met.is_(True)
    missions_completed = (
        await session.exec(
            select(func.count())
            .select_from(MissionCompletion)
            .where(MissionCompletion.user_id == user_id, done)
        )
    ).one()
    areas_tried = (
        await session.exec(
            select(func.count(func.distinct(Mission.wellness_area_id)))
            .select_from(MissionCompletion)
            .join(Mission, Mission.id == MissionCompletion.mission_id)
            .where(MissionCompletion.user_id == user_id, done)
        )
    ).one()
    longest = (
        await session.exec(select(Streak.longest_streak).where(Streak.user_id == user_id))
    ).first()
    level = (await session.exec(select(User.level).where(User.id == user_id))).first()
    return {
        "missions_completed": int(missions_completed),
        "areas_tried": int(areas_tried),
        "streak_days": int(longest or 0),
        "level": int(level or 1),
    }


async def evaluate_and_unlock(session: AsyncSession, user_id: UUID) -> list[Achievement]:
    """Unlocks every achievement whose rule is now met and returns the new ones.
    Does NOT commit. The unique (user, achievement) constraint makes it safe
    against concurrent evaluations: only the one that inserts gets to announce."""
    catalogue = (
        await session.exec(select(Achievement).order_by(Achievement.sort_order))
    ).all()
    unlocked_ids = set(
        (
            await session.exec(
                select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
            )
        ).all()
    )
    current = await metrics(session, user_id)

    newly: list[Achievement] = []
    for achievement in catalogue:
        if achievement.id in unlocked_ids:
            continue
        if current.get(achievement.rule_type, 0) < achievement.threshold:
            continue
        inserted = await session.exec(
            pg_insert(UserAchievement)
            .values(id=uuid4(), user_id=user_id, achievement_id=achievement.id)
            .on_conflict_do_nothing(constraint="uq_user_achievements_user_achievement")
            .returning(UserAchievement.id)
        )
        if inserted.first() is None:
            continue
        newly.append(achievement)
        await notifications.create_notification(
            session,
            user_id,
            "achievement_unlocked",
            f"Logro: {achievement.title}",
            achievement.description,
            {"achievement_key": achievement.key, "screen": "progress"},
            dedupe_key=f"achievement:{achievement.key}",
        )
    return newly


async def list_for_user(
    session: AsyncSession, user_id: UUID
) -> list[tuple[Achievement, UserAchievement | None, int]]:
    catalogue = (
        await session.exec(select(Achievement).order_by(Achievement.sort_order))
    ).all()
    unlocked = {
        ua.achievement_id: ua
        for ua in (
            await session.exec(select(UserAchievement).where(UserAchievement.user_id == user_id))
        ).all()
    }
    current = await metrics(session, user_id)
    return [
        (a, unlocked.get(a.id), min(current.get(a.rule_type, 0), a.threshold)) for a in catalogue
    ]
