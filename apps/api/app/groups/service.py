"""Business logic for the Groups domain.

`record_group_activity` is the single write-point for `group_streaks`,
mirroring the pattern used by `app.users.service.add_xp`: Module 2
(missions) should import and call it when a `mission_completion` with a
non-null `group_id` is created, instead of updating `group_streaks` itself.
"""

import secrets
import string
from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.groups.models import Group, GroupMembership, GroupStreak
from app.users.models import User

_INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits
_INVITE_CODE_LENGTH = 8
_MAX_INVITE_CODE_ATTEMPTS = 5


async def _generate_unique_invite_code(session: AsyncSession) -> str:
    for _ in range(_MAX_INVITE_CODE_ATTEMPTS):
        code = "".join(secrets.choice(_INVITE_CODE_ALPHABET) for _ in range(_INVITE_CODE_LENGTH))
        result = await session.exec(select(Group).where(Group.invite_code == code))
        if result.first() is None:
            return code
    raise RuntimeError("Could not generate a unique invite code")


async def create_group(session: AsyncSession, *, owner_id: UUID, name: str) -> Group:
    invite_code = await _generate_unique_invite_code(session)
    group = Group(name=name, invite_code=invite_code, created_by=owner_id)
    session.add(group)
    await session.flush()

    session.add(GroupMembership(group_id=group.id, user_id=owner_id))
    session.add(GroupStreak(group_id=group.id))
    await session.commit()
    await session.refresh(group)
    return group


async def get_group_or_404(session: AsyncSession, group_id: UUID) -> Group:
    group = await session.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    return group


async def get_member_group_or_404(session: AsyncSession, group_id: UUID, user_id: UUID) -> Group:
    """404s for non-members too, so group ids can't be probed for existence."""
    group = await get_group_or_404(session, group_id)
    result = await session.exec(
        select(GroupMembership.id).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == user_id,
        )
    )
    if result.first() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    return group


async def list_user_groups(session: AsyncSession, user_id: UUID) -> list[Group]:
    result = await session.exec(
        select(Group)
        .join(GroupMembership, GroupMembership.group_id == Group.id)
        .where(GroupMembership.user_id == user_id)
    )
    return list(result.all())


async def join_group(session: AsyncSession, *, user_id: UUID, invite_code: str) -> Group:
    result = await session.exec(select(Group).where(Group.invite_code == invite_code))
    group = result.first()
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid invite code")

    existing = await session.exec(
        select(GroupMembership).where(
            GroupMembership.group_id == group.id,
            GroupMembership.user_id == user_id,
        )
    )
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already a member of this group")

    session.add(GroupMembership(group_id=group.id, user_id=user_id))
    await session.commit()
    return group


async def leave_group(session: AsyncSession, *, user_id: UUID, group_id: UUID) -> None:
    result = await session.exec(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == user_id,
        )
    )
    membership = result.first()
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a member of this group")

    await session.delete(membership)
    await session.commit()


async def get_member_count(session: AsyncSession, group_id: UUID) -> int:
    result = await session.exec(
        select(func.count()).select_from(GroupMembership).where(GroupMembership.group_id == group_id)
    )
    return result.one()


async def list_group_members(
    session: AsyncSession, group_id: UUID
) -> list[tuple[GroupMembership, User]]:
    result = await session.exec(
        select(GroupMembership, User)
        .join(User, User.id == GroupMembership.user_id)
        .where(GroupMembership.group_id == group_id)
    )
    return list(result.all())


async def get_group_streak(session: AsyncSession, group_id: UUID) -> GroupStreak:
    result = await session.exec(select(GroupStreak).where(GroupStreak.group_id == group_id))
    streak = result.first()
    if streak is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group streak not found")
    return streak


async def record_group_activity(
    session: AsyncSession, *, group_id: UUID, activity_date: date | None = None
) -> GroupStreak:
    activity_date = activity_date or datetime.utcnow().date()
    streak = await get_group_streak(session, group_id)

    if streak.last_active_date == activity_date:
        return streak

    if streak.last_active_date == activity_date - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_active_date = activity_date

    session.add(streak)
    await session.commit()
    await session.refresh(streak)
    return streak
