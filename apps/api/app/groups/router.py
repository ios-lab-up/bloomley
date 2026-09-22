"""HTTP routes for the Groups domain, mounted at `/api/v1/groups` (prefix
applied by `app.main`, matching how `app.users.router` is registered)."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.groups import service
from app.groups.models import Group, GroupStreak
from app.groups.schemas import (
    GroupCreate,
    GroupDetailRead,
    GroupJoinRequest,
    GroupMemberRead,
    GroupRead,
    GroupStreakRead,
)
from app.users.deps import get_current_user
from app.users.models import User

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Group:
    return await service.create_group(session, owner_id=user.id, name=payload.name)


@router.get("/me", response_model=list[GroupRead])
async def list_my_groups(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Group]:
    return await service.list_user_groups(session, user.id)


@router.post("/join", response_model=GroupRead)
async def join_group(
    payload: GroupJoinRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Group:
    return await service.join_group(session, user_id=user.id, invite_code=payload.invite_code)


@router.get("/{group_id}", response_model=GroupDetailRead)
async def get_group(
    group_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupDetailRead:
    group = await service.get_group_or_404(session, group_id)
    member_count = await service.get_member_count(session, group_id)
    streak = await service.get_group_streak(session, group_id)
    return GroupDetailRead(
        **GroupRead.model_validate(group).model_dump(),
        member_count=member_count,
        streak=GroupStreakRead.model_validate(streak),
    )


@router.delete("/{group_id}/members/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(
    group_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.leave_group(session, user_id=user.id, group_id=group_id)


@router.get("/{group_id}/members", response_model=list[GroupMemberRead])
async def list_group_members(
    group_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[GroupMemberRead]:
    await service.get_group_or_404(session, group_id)
    rows = await service.list_group_members(session, group_id)
    return [
        GroupMemberRead(
            membership_id=membership.id,
            user_id=member.id,
            display_name=member.display_name,
            email=member.email,
            joined_at=membership.joined_at,
        )
        for membership, member in rows
    ]


@router.get("/{group_id}/streak", response_model=GroupStreakRead)
async def get_group_streak(
    group_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupStreak:
    await service.get_group_or_404(session, group_id)
    return await service.get_group_streak(session, group_id)
