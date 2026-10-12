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

from datetime import date, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

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


def _feedback_message(mission: Mission, xp_earned: int, criteria_met: bool) -> str:
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
) -> tuple[MissionCompletion, BloomFeedback, Mission] | None:
    mission = await get_mission(session, mission_id)
    if mission is None:
        return None

    if group_id is not None:
        await _ensure_group_access(session, user.id, group_id)

    completed_on = datetime.utcnow().date()
    existing = await _find_completion_on(session, user.id, mission_id, completed_on)
    if existing is not None:
        # Idempotent: a double-tap on "complete" returns the existing
        # completion instead of inserting a duplicate / awarding XP again.
        feedback = await _feedback_for_completion(session, existing.id)
        return existing, feedback, mission

    criteria_met = engaged_minutes >= mission.duration_minutes
    xp_earned = mission.xp_reward if criteria_met else 0

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
            await wellness_service.bump_streak_for_activity(session, user.id)
            await users_service.grant_xp(session, user.id, xp_earned)

        await session.commit()
    except IntegrityError:
        # Lost the race: another request just completed the same mission
        # today. Roll back and return the existing completion untouched.
        await session.rollback()
        existing = await _find_completion_on(session, user.id, mission_id, completed_on)
        if existing is None:
            raise
        feedback = await _feedback_for_completion(session, existing.id)
        return existing, feedback, mission

    await session.refresh(completion)
    await session.refresh(feedback)
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