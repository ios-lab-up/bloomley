"""Business logic for the Missions domain (Módulo 2).

Cross-module writes go through explicit owners, never direct UPDATEs:
- XP/level: ``app.users.service.add_xp`` / ``grant_xp`` (single write path,
  per Module 1; `grant_xp` is the non-committing variant missions uses so the
  whole completion lands in one transaction).
- Streak: ``app.wellness.service.bump_streak_for_activity`` (wellness owns
  how streaks work; missions decides when an action counts).
- Group access: ``app.groups.models`` (Group/GroupMembership) is read to
  validate that a completion's group_id exists and the user belongs to it.
"""

import hashlib
from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.achievements import service as achievements_service
from app.achievements.models import Achievement
from app.groups import service as groups_service
from app.groups.models import Group, GroupMembership
from app.missions.models import BloomFeedback, Mission, MissionCompletion
from app.users import service as users_service
from app.users.models import User
from app.wellness import service as wellness_service
from app.wellness.models import UserWellnessArea


async def list_missions(
    session: AsyncSession,
    user_id: UUID,
    area_id: UUID | None,
    mine: bool,
) -> list[Mission]:
    query = select(Mission).order_by(Mission.title)
    if area_id is not None:
        query = query.where(Mission.wellness_area_id == area_id)
    elif mine:
        selected = select(UserWellnessArea.wellness_area_id).where(
            UserWellnessArea.user_id == user_id
        )
        query = query.where(Mission.wellness_area_id.in_(selected))
    result = await session.exec(query)
    return list(result.all())


async def get_mission(session: AsyncSession, mission_id: UUID) -> Mission | None:
    return await session.get(Mission, mission_id)


# Energy chips on the onboarding / home screens: "Poca energía · 5 minutos",
# "Normal · 10", "Con todo · 20".
ENERGY_MINUTES = {"low": 5, "medium": 10, "high": 20}

# Anti-abuse limits that need no client change (see complete_mission).
DAILY_XP_CAP = 150  # max XP a user can earn from missions per local day
MAX_ENGAGED_FACTOR = 3  # stored engaged_minutes never exceeds duration x 3


async def _xp_earned_on(session: AsyncSession, user_id: UUID, day: date) -> int:
    result = await session.exec(
        select(func.coalesce(func.sum(MissionCompletion.xp_earned), 0)).where(
            MissionCompletion.user_id == user_id,
            MissionCompletion.completed_on == day,
        )
    )
    return int(result.one())


async def _reward_for(
    session: AsyncSession, user_id: UUID, mission: Mission, day: date
) -> int:
    """XP still payable today: the mission's reward, trimmed to what is left of
    the daily cap. The completion and the streak count regardless."""
    remaining = DAILY_XP_CAP - await _xp_earned_on(session, user_id, day)
    return max(0, min(mission.xp_reward, remaining))


async def completed_mission_ids_on(
    session: AsyncSession, user_id: UUID, day: date
) -> set[UUID]:
    result = await session.exec(
        select(MissionCompletion.mission_id).where(
            MissionCompletion.user_id == user_id,
            MissionCompletion.completed_on == day,
        )
    )
    return set(result.all())


async def pick_missions(
    session: AsyncSession,
    user: User,
    *,
    energy: str,
    intention: str | None,
    today: date,
    limit: int = 4,
) -> list[Mission]:
    """Today's mission first, then the "próximas actividades".

    Candidates come from the areas the user picked in onboarding (all areas if
    they picked none) and exclude what they already completed today. Order:
    mission serving their weekly intention first, then closest to the energy's
    duration, then a per-user, per-day shuffle so the suggestions change daily
    but don't flicker between two requests of the same day.
    """
    selected = select(UserWellnessArea.wellness_area_id).where(
        UserWellnessArea.user_id == user.id
    )
    has_areas = (await session.exec(selected.limit(1))).first() is not None
    query = select(Mission)
    if has_areas:
        query = query.where(Mission.wellness_area_id.in_(selected))
    candidates = list((await session.exec(query)).all())

    done = await completed_mission_ids_on(session, user.id, today)
    target = ENERGY_MINUTES.get(energy, ENERGY_MINUTES["medium"])

    def sort_key(m: Mission):
        shuffle = hashlib.sha256(f"{user.id}:{today}:{m.id}".encode()).hexdigest()
        return (
            0 if intention is not None and m.intention == intention else 1,
            abs(m.duration_minutes - target),
            shuffle,
        )

    pool = sorted((m for m in candidates if m.id not in done), key=sort_key)
    # One suggestion per intention/area keeps the "próximas" row varied.
    picked: list[Mission] = []
    seen: set[str | UUID] = set()
    for m in pool:
        group = m.intention or m.wellness_area_id
        if group in seen:
            continue
        seen.add(group)
        picked.append(m)
        if len(picked) == limit:
            break
    return picked


async def active_days(
    session: AsyncSession, user_id: UUID, start: date, end: date
) -> set[date]:
    """Local days in [start, end] on which the user fully completed a mission
    (the days the streak counted)."""
    result = await session.exec(
        select(MissionCompletion.completed_on).where(
            MissionCompletion.user_id == user_id,
            MissionCompletion.criteria_met.is_(True),
            MissionCompletion.completed_on >= start,
            MissionCompletion.completed_on <= end,
        )
    )
    return set(result.all())


def _feedback_message(mission: Mission, xp_earned: int, criteria_met: bool) -> str:
    if criteria_met and xp_earned == 0:
        return (
            f"¡Lo lograste! Completaste \"{mission.title}\". Hoy ya llegaste al "
            "tope de XP, pero tu racha sigue creciendo."
        )
    if criteria_met:
        return f"¡Lo lograste! Completaste \"{mission.title}\" y ganaste {xp_earned} XP."
    return (
        f"No pasa nada, lo importante es el camino. La próxima te acercas a "
        f"los {mission.duration_minutes} minutos de \"{mission.title}\"."
    )


async def _find_completion_on(
    session: AsyncSession, user_id: UUID, mission_id: UUID, completed_on: date
) -> MissionCompletion | None:
    result = await session.exec(
        select(MissionCompletion).where(
            MissionCompletion.user_id == user_id,
            MissionCompletion.mission_id == mission_id,
            MissionCompletion.completed_on == completed_on,
        )
    )
    return result.first()


async def _feedback_for_completion(
    session: AsyncSession, completion_id: UUID
) -> BloomFeedback | None:
    result = await session.exec(
        select(BloomFeedback).where(
            BloomFeedback.mission_completion_id == completion_id
        )
    )
    return result.first()


async def _ensure_group_access(
    session: AsyncSession, user_id: UUID, group_id: UUID
) -> None:
    """A group_id coming from the client must exist and the user must belong.

    404/403 map to missing group vs. not-a-member (review 2026-09-25).
    """
    group = await session.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    result = await session.exec(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == user_id,
        )
    )
    if result.first() is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You are not a member of this group"
        )


async def complete_mission(
    session: AsyncSession,
    user: User,
    mission_id: UUID,
    engaged_minutes: int,
    group_id: UUID | None,
) -> tuple[MissionCompletion, BloomFeedback, Mission, list[Achievement]] | None:
    """Returns (completion, feedback, mission, achievements unlocked by this call)."""
    mission = await get_mission(session, mission_id)
    if mission is None:
        return None

    if group_id is not None:
        await _ensure_group_access(session, user.id, group_id)

    completed_on = users_service.local_today(user)
    existing = await _find_completion_on(session, user.id, mission_id, completed_on)
    if existing is not None:
        # Idempotent: a double-tap on "complete" returns the existing
        # completion instead of inserting a duplicate / awarding XP again.
        # The one exception is a first attempt that fell short: finishing it
        # later the same day upgrades it, or "No pasa nada" would be final.
        if existing.criteria_met or engaged_minutes < mission.duration_minutes:
            feedback = await _feedback_for_completion(session, existing.id)
            return existing, feedback, mission, []
        return await _upgrade_partial_completion(
            session, user, mission, existing, engaged_minutes, completed_on
        )

    # Whatever the client claims, don't store absurd values (a forgotten timer,
    # or 2880). Clamping never changes `criteria_met`, so nobody loses a reward.
    engaged_minutes = min(engaged_minutes, mission.duration_minutes * MAX_ENGAGED_FACTOR)
    criteria_met = engaged_minutes >= mission.duration_minutes
    xp_earned = await _reward_for(session, user.id, mission, completed_on) if criteria_met else 0

    completion = MissionCompletion(
        user_id=user.id,
        mission_id=mission.id,
        group_id=group_id,
        completed_on=completed_on,
        engaged_minutes=engaged_minutes,
        xp_earned=xp_earned,
        criteria_met=criteria_met,
    )
    session.add(completion)

    try:
        await session.flush()

        feedback = BloomFeedback(
            user_id=user.id,
            mission_completion_id=completion.id,
            message=_feedback_message(mission, xp_earned, criteria_met),
            feedback_type="congrats" if criteria_met else "encouragement",
        )
        session.add(feedback)

        if criteria_met:
            # Wellbeing rewards only on full completion: streak + XP/level.
            # Neither commits: completion + feedback + streak + XP land in
            # the single `session.commit()` below.
            await wellness_service.bump_streak_for_activity(session, user.id, completed_on)
            await users_service.grant_xp(session, user.id, xp_earned)
            await _bump_group_streaks(session, user.id, completed_on)
            newly = await achievements_service.evaluate_and_unlock(session, user.id)
        else:
            newly = []

        await session.commit()
    except IntegrityError:
        # Lost the race: another request just completed the same mission
        # today. Roll back and return the existing completion untouched.
        await session.rollback()
        existing = await _find_completion_on(session, user.id, mission_id, completed_on)
        if existing is None:
            raise
        feedback = await _feedback_for_completion(session, existing.id)
        return existing, feedback, mission, []

    await session.refresh(completion)
    await session.refresh(feedback)
    return completion, feedback, mission, newly


async def _bump_group_streaks(
    session: AsyncSession, user_id: UUID, day: date
) -> None:
    """A fully completed mission counts for every group the user is in (the
    "Hoy en el grupo" design counts anyone's small step, not only ones tagged
    with a group). Row-locked and uncommitted: see record_group_activity."""
    for gid in sorted(await groups_service.list_user_group_ids(session, user_id)):
        await groups_service.record_group_activity(
            session, group_id=gid, activity_date=day, commit=False
        )


async def _upgrade_partial_completion(
    session: AsyncSession,
    user: User,
    mission: Mission,
    completion: MissionCompletion,
    engaged_minutes: int,
    day: date,
) -> tuple[MissionCompletion, BloomFeedback, Mission, list[Achievement]]:
    # Lock the row so two concurrent retries can't both upgrade it and pay twice.
    locked = await session.exec(
        select(MissionCompletion)
        .where(MissionCompletion.id == completion.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    completion = locked.one()
    newly: list[Achievement] = []
    if not completion.criteria_met:
        xp = await _reward_for(session, user.id, mission, day)
        completion.engaged_minutes = min(
            engaged_minutes, mission.duration_minutes * MAX_ENGAGED_FACTOR
        )
        completion.criteria_met = True
        completion.xp_earned = xp
        session.add(completion)
        feedback = await _feedback_for_completion(session, completion.id)
        if feedback is None:
            feedback = BloomFeedback(
                user_id=user.id,
                mission_completion_id=completion.id,
                message="",
                feedback_type="congrats",
            )
        feedback.message = _feedback_message(mission, xp, True)
        feedback.feedback_type = "congrats"
        session.add(feedback)
        await wellness_service.bump_streak_for_activity(session, user.id, day)
        await users_service.grant_xp(session, user.id, xp)
        await _bump_group_streaks(session, user.id, day)
        newly = await achievements_service.evaluate_and_unlock(session, user.id)
        await session.commit()
    await session.refresh(completion)
    feedback = await _feedback_for_completion(session, completion.id)
    return completion, feedback, mission, newly


async def list_user_completions(
    session: AsyncSession, user_id: UUID, limit: int, offset: int
) -> list[tuple[MissionCompletion, Mission]]:
    result = await session.exec(
        select(MissionCompletion, Mission)
        .join(Mission, MissionCompletion.mission_id == Mission.id)
        .where(MissionCompletion.user_id == user_id)
        .order_by(MissionCompletion.completed_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def list_user_feedback(
    session: AsyncSession, user_id: UUID, limit: int, offset: int
) -> list[BloomFeedback]:
    result = await session.exec(
        select(BloomFeedback)
        .where(BloomFeedback.user_id == user_id)
        .order_by(BloomFeedback.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())