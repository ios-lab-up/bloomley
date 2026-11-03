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
from sqlalchemy import Delete, Select, Update, delete, event, update
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapper
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
    await _lock_user_against_delete(session, owner_id)
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
        .order_by(GroupMembership.joined_at)
    )
    return list(result.all())


async def join_group(session: AsyncSession, *, user_id: UUID, invite_code: str) -> Group:
    await _lock_user_against_delete(session, user_id)
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
    try:
        await session.commit()
    except IntegrityError as exc:
        # Concurrent joins (e.g. a double tap) can both pass the check above;
        # the unique (group_id, user_id) constraint decides the loser.
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Already a member of this group") from exc
    return group


async def leave_group(session: AsyncSession, *, user_id: UUID, group_id: UUID) -> None:
    # Serialises leaves of the same group, so the last two members leaving at
    # once can't each still see the other and both skip the group delete.
    await session.exec(select(Group.id).where(Group.id == group_id).with_for_update())

    result = await session.exec(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == user_id,
        )
    )
    membership = result.first()
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a member of this group")

    deleted = await session.exec(_delete_groups_left_empty(user_id, group_id=group_id))
    if deleted.rowcount == 0:
        await session.delete(membership)
        await session.exec(_transfer_ownership(user_id, group_id=group_id))
    await session.commit()


async def _get_owned_group_for_update(
    session: AsyncSession, group_id: UUID, user_id: UUID
) -> Group:
    """404 for non-members (like `get_member_group_or_404`), 403 for members
    who aren't the owner. The group row stays locked until commit, so a
    concurrent leave can't hand ownership away between this check and the
    caller's change."""
    await session.exec(select(Group.id).where(Group.id == group_id).with_for_update())

    group = await get_member_group_or_404(session, group_id, user_id)
    if group.created_by != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the group owner can do this")
    return group


async def delete_group(session: AsyncSession, *, user_id: UUID, group_id: UUID) -> None:
    """Owner-only. Memberships and the streak go with the group through their
    `ondelete="CASCADE"` FKs."""
    group = await _get_owned_group_for_update(session, group_id, user_id)
    await session.delete(group)
    await session.commit()


async def rename_group(
    session: AsyncSession, *, user_id: UUID, group_id: UUID, name: str
) -> Group:
    group = await _get_owned_group_for_update(session, group_id, user_id)
    group.name = name
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return group


async def add_member(
    session: AsyncSession, *, owner_id: UUID, group_id: UUID, username: str
) -> tuple[GroupMembership, User]:
    """Owner-only: adds the user with this username straight away (no
    invitation to accept), as joining by invite code does."""
    result = await session.exec(select(User).where(User.username == username))
    target = result.first()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    # Same lock join_group takes, so the target's user.deleted can't miss
    # the membership added here.
    await _lock_user_shared(session, target.id)
    if (await session.exec(select(User.id).where(User.id == target.id))).first() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    await _get_owned_group_for_update(session, group_id, owner_id)
    existing = await session.exec(
        select(GroupMembership.id).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == target.id,
        )
    )
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member of this group")

    membership = GroupMembership(group_id=group_id, user_id=target.id)
    session.add(membership)
    try:
        await session.commit()
    except IntegrityError as exc:
        # The user joined by invite code at the same moment.
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "User is already a member of this group"
        ) from exc
    await session.refresh(membership)
    return membership, target


async def remove_member(
    session: AsyncSession, *, owner_id: UUID, group_id: UUID, member_id: UUID
) -> None:
    """Owner-only. The owner can't remove themselves: leaving goes through
    `leave_group`, which hands ownership on and deletes the group once empty.
    Since the owner stays, the group never ends up empty or ownerless here."""
    await _get_owned_group_for_update(session, group_id, owner_id)
    if member_id == owner_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "The owner can't remove themselves; leave the group instead",
        )

    deleted = await session.exec(
        delete(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == member_id,
        )
    )
    if deleted.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a member of this group")
    await session.commit()


def _user_lock_key(user_id: UUID) -> int:
    """Postgres advisory lock key for a user: the first 8 bytes of their id."""
    return int.from_bytes(user_id.bytes[:8], "big", signed=True)


async def _lock_user_shared(session: AsyncSession, user_id: UUID) -> None:
    """Shared side of the per-user lock; see `_lock_user_against_delete`."""
    await session.exec(select(func.pg_advisory_xact_lock_shared(_user_lock_key(user_id))))


async def _lock_user_against_delete(session: AsyncSession, user_id: UUID) -> None:
    """Shared side of the per-user lock `_release_groups_on_user_delete` takes
    exclusively, held until commit. Creates, joins and owner adds
    (`add_member`) wait for an in-flight deletion of the same user, and the
    deletion waits for them, so it always sees the memberships they add.

    An advisory lock rather than the `users` row, so it doesn't conflict with
    other modules' row locks (e.g. `add_xp`) or the FK checks on `users.id`.
    """
    await _lock_user_shared(session, user_id)
    # The deletion we waited on may have just committed.
    result = await session.exec(select(User.id).where(User.id == user_id))
    if result.first() is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")


def _groups_of(user_id: UUID) -> Select:
    return select(GroupMembership.group_id).where(GroupMembership.user_id == user_id)


def _delete_groups_left_empty(user_id: UUID, *, group_id: UUID | None = None) -> Delete:
    """DELETE of the groups `user_id` is the only member of, run just before
    they leave or their user is deleted. Memberships and the streak go with the
    group through their `ondelete="CASCADE"` FKs. `group_id=None` covers every
    group the user is in.
    """
    others = (
        select(GroupMembership.id)
        .where(GroupMembership.group_id == Group.id, GroupMembership.user_id != user_id)
        .correlate(Group)
    )
    stmt = delete(Group).where(Group.id.in_(_groups_of(user_id)), ~others.exists())
    if group_id is not None:
        stmt = stmt.where(Group.id == group_id)
    return stmt


def _transfer_ownership(user_id: UUID, *, group_id: UUID | None = None) -> Update:
    """UPDATE handing groups owned (`created_by`) by `user_id` to their oldest
    other member (earliest `joined_at`), or NULL if nobody else is left.
    Matches nothing when the user doesn't own the group, so callers needn't
    check first. `group_id=None` covers every group the user owns.
    """
    next_owner = (
        select(GroupMembership.user_id)
        .where(GroupMembership.group_id == Group.id, GroupMembership.user_id != user_id)
        .order_by(GroupMembership.joined_at, GroupMembership.id)
        .limit(1)
        .correlate(Group)
        .scalar_subquery()
    )
    stmt = update(Group).where(Group.created_by == user_id).values(created_by=next_owner)
    if group_id is not None:
        stmt = stmt.where(Group.id == group_id)
    return stmt


@event.listens_for(User, "before_delete")
def _release_groups_on_user_delete(
    mapper: Mapper, connection: Connection, target: User
) -> None:
    """Deletes the groups the user was the only member of and hands the rest
    they own to the next member, in the same transaction as the `users` DELETE.

    Lock order, the same in every path that takes more than one of these:
    1. the per-user advisory lock, exclusive, so a concurrent `create_group`,
       `join_group` or `add_member` for this user either commits before the group query below
       or waits until the user is gone (see `_lock_user_against_delete`);
    2. the user's group rows, in id order, for the same reason as in
       `leave_group`;
    3. the `users` row, taken by the DELETE itself after this listener.

    Hooked on the ORM delete so `app.users` (the Clerk `user.deleted` webhook)
    doesn't need to know about groups.
    """
    connection.execute(select(func.pg_advisory_xact_lock(_user_lock_key(target.id))))
    connection.execute(
        select(Group.id)
        .where(Group.id.in_(_groups_of(target.id)))
        .order_by(Group.id)
        .with_for_update()
    )
    connection.execute(_delete_groups_left_empty(target.id))
    connection.execute(_transfer_ownership(target.id))


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
        .order_by(GroupMembership.joined_at)
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
