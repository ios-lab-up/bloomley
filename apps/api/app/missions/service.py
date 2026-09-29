"""Business logic for the Missions domain (Módulo 2).

Cross-module writes go through explicit owners, never direct UPDATEs:
- XP/level: ``app.users.service.add_xp`` (single write path, per Module 1).
- Streak: ``app.wellness.service.bump_streak_for_activity`` (wellness owns
  how streaks work; missions decides when an action counts).
"""

from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

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


def _feedback_message(mission: Mission, xp_earned: int, criteria_met: bool) -> str:
    if criteria_met:
        return f"¡Lo lograste! Completaste \"{mission.title}\" y ganaste {xp_earned} XP."
    return (
        f"No pasa nada, lo importante es el camino. La próxima te acercas a "
        f"los {mission.duration_minutes} minutos de \"{mission.title}\"."
    )


async def complete_mission(
    session: AsyncSession,
    user: User,
    mission_id: UUID,
    engaged_minutes: int,
    group_id: UUID | None,
) -> tuple[MissionCompletion, BloomFeedback, Mission] | None:
    mission = await get_mission(session, mission_id)
    if mission is None:
        return None

    criteria_met = engaged_minutes >= mission.duration_minutes
    xp_earned = mission.xp_reward if criteria_met else 0

    completion = MissionCompletion(
        user_id=user.id,
        mission_id=mission.id,
        group_id=group_id,
        engaged_minutes=engaged_minutes,
        xp_earned=xp_earned,
        criteria_met=criteria_met,
    )
    session.add(completion)
    await session.flush()

    feedback = BloomFeedback(
        user_id=user.id,
        mission_completion_id=completion.id,
        message=_feedback_message(mission, xp_earned, criteria_met),
        feedback_type="congrats" if criteria_met else "encouragement",
    )
    session.add(feedback)
    await session.commit()
    await session.refresh(completion)
    await session.refresh(feedback)

    if criteria_met:
        # Wellbeing rewards only on full completion: streak + XP/level.
        await wellness_service.bump_streak_for_activity(session, user.id)
        await users_service.add_xp(session, user.id, xp_earned)

    return completion, feedback, mission


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