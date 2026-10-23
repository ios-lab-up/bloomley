"""Business logic for the Users & Auth module.

`add_xp` is the single write path for `xp_total`/`level`: other modules
(missions, groups, ...) must call it instead of mutating those columns
directly, so the leveling rule lives in exactly one place.

`grant_xp` is the non-committing variant for callers that bundle the XP award
into their own transaction (e.g. a mission completion). It shares the same
atomic UPDATE as `add_xp`, so concurrent awards never lose updates.
"""

from datetime import datetime
from uuid import UUID

import httpx
from sqlalchemy import func, update
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.users.models import NotificationSettings, PushToken, User

XP_PER_LEVEL = 100


def calculate_level(xp_total: int) -> int:
    return max(1, xp_total // XP_PER_LEVEL + 1)


async def get_user_by_clerk_id(session: AsyncSession, clerk_user_id: str) -> User | None:
    result = await session.exec(select(User).where(User.clerk_user_id == clerk_user_id))
    return result.first()


async def grant_xp(session: AsyncSession, user_id: UUID, amount: int) -> None:
    """Awards XP/level inside a caller-owned transaction (does NOT commit).

    Same atomic UPDATE as :func:`add_xp`, minus the commit: callers that
    bundle the award into their own unit of work (e.g. a mission completion
    writing completion + feedback + streak + XP together) use this and commit
    once at the end.

    Atomicity note (see :func:`add_xp`): the arithmetic happens in the SET
    clause, so concurrent awards queue on the row lock and add up instead of
    overwriting each other.
    """
    new_xp = User.xp_total + amount
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(xp_total=new_xp, level=func.greatest(1, new_xp / XP_PER_LEVEL + 1))
        .returning(User.id)
    )
    result = await session.exec(stmt)
    if result.first() is None:
        raise ValueError(f"User {user_id} not found")


async def add_xp(session: AsyncSession, user_id: UUID, amount: int) -> User:
    """Atomically increments xp_total and recomputes level in one UPDATE.

    A prior read-modify-write version (SELECT, `xp_total += amount` in
    Python, then write back the final value) lost updates under
    concurrency: two overlapping calls could both read the same starting
    xp_total and the later commit would silently overwrite the earlier
    one. Doing the arithmetic in the SET clause instead means Postgres
    computes it against the current row under the row lock it already
    takes for the UPDATE, so concurrent calls queue up and each one adds
    on top of the last committed value -- no lost updates.

    The `level` expression below must stay in sync with calculate_level()
    -- it can't just call that function, since a single UPDATE has to
    derive both columns from the same in-flight `xp_total` expression to
    stay atomic. test_add_xp_concurrency.py asserts they agree.
    """
    await grant_xp(session, user_id, amount)
    await session.commit()

    user = await session.get(User, user_id)
    assert user is not None
    return user


async def update_display_name(session: AsyncSession, user: User, display_name: str) -> User:
    user.display_name = display_name
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_or_create_notification_settings(
    session: AsyncSession, user_id: UUID
) -> NotificationSettings:
    result = await session.exec(
        select(NotificationSettings).where(NotificationSettings.user_id == user_id)
    )
    settings = result.first()
    if settings is None:
        settings = NotificationSettings(user_id=user_id)
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
    return settings


async def update_notification_settings(
    session: AsyncSession,
    user_id: UUID,
    enabled: bool | None,
    frequency: str | None,
) -> NotificationSettings:
    settings = await get_or_create_notification_settings(session, user_id)
    if enabled is not None:
        settings.enabled = enabled
    if frequency is not None:
        settings.frequency = frequency
    session.add(settings)
    await session.commit()
    await session.refresh(settings)
    return settings


async def upsert_push_token(
    session: AsyncSession,
    user_id: UUID,
    expo_push_token: str,
    device_id: str,
    platform: str,
) -> PushToken:
    result = await session.exec(
        select(PushToken).where(PushToken.expo_push_token == expo_push_token)
    )
    token = result.first()
    if token is None:
        token = PushToken(
            user_id=user_id,
            expo_push_token=expo_push_token,
            device_id=device_id,
            platform=platform,
        )
    else:
        token.user_id = user_id
        token.device_id = device_id
        token.platform = platform
        token.is_active = True
    token.last_used_at = datetime.utcnow()
    session.add(token)
    await session.commit()
    await session.refresh(token)
    return token


def _primary_email(clerk_data: dict) -> str:
    addresses = clerk_data.get("email_addresses", [])
    primary_id = clerk_data.get("primary_email_address_id")
    for address in addresses:
        if address.get("id") == primary_id:
            return address.get("email_address", "")
    return addresses[0].get("email_address", "") if addresses else ""


def _display_name(clerk_data: dict) -> str:
    first = clerk_data.get("first_name") or ""
    last = clerk_data.get("last_name") or ""
    full = f"{first} {last}".strip()
    return full or clerk_data.get("username") or _primary_email(clerk_data)


def _username(clerk_data: dict) -> str | None:
    # Clerk compares usernames case-insensitively; storing them lowercase
    # keeps our unique index and lookups consistent with that.
    username = (clerk_data.get("username") or "").strip().lower()
    return username or None


def _clerk_updated_at(clerk_data: dict) -> int | None:
    value = clerk_data.get("updated_at")
    return value if isinstance(value, int) else None


def _is_older(incoming: int | None, stored: int | None) -> bool:
    """Whether a profile snapshot taken at `incoming` predates the one at
    `stored`. Unknown timestamps (rows synced before `clerk_updated_at`
    existed, or a payload without `updated_at`) never count as newer."""
    return incoming is not None and stored is not None and incoming < stored


# Namespaces for the two-key form of pg_advisory_xact_lock. Postgres keeps
# that key space apart from the single-bigint one app.groups uses.
_CLERK_USER_LOCK = 1
_USERNAME_LOCK = 2


async def _advisory_lock(session: AsyncSession, namespace: int, value: str) -> None:
    """Held until the transaction ends. A hashtext collision between two
    values only makes them wait for each other, never lets both through."""
    await session.exec(select(func.pg_advisory_xact_lock(namespace, func.hashtext(value))))


async def _upsert_user_from_clerk_data(
    session: AsyncSession, clerk_user_id: str, data: dict
) -> User:
    """Only place allowed to write `clerk_user_id`/`email`/`username`/initial
    `display_name`. Shared by both sync paths (see module docstring below).

    Webhooks can arrive late (Clerk retries failed deliveries with the
    original payload) and concurrently, so arrival order says nothing about
    which data is current. Clerk's `updated_at` does:
    - an event older than what the row already has is ignored;
    - Clerk never lets two users hold a username at the same time, so when
      another row holds the incoming username, whichever side has the newer
      snapshot owns it, and the other side's claim is out of date.

    Locks: this user's, then the username's (always in that order, and only
    one username, so two syncs can't deadlock). The first makes concurrent
    syncs of one user -- including two first requests JIT-provisioning the
    same new user -- run one after the other; the second does the same for
    syncs claiming one username. A sync that waited on a lock then reads the
    rows the other one committed.
    """
    updated_at = _clerk_updated_at(data)
    username = _username(data)
    await _advisory_lock(session, _CLERK_USER_LOCK, clerk_user_id)
    if username is not None:
        await _advisory_lock(session, _USERNAME_LOCK, username)

    # Read only once both locks are held: a sync that held the username lock
    # may have just released this row's claim on it.
    user = await get_user_by_clerk_id(session, clerk_user_id)
    if user is not None and _is_older(updated_at, user.clerk_updated_at):
        await session.commit()  # releases the locks
        return user

    if username is not None:
        result = await session.exec(
            select(User.id, User.clerk_updated_at).where(
                User.username == username, User.clerk_user_id != clerk_user_id
            )
        )
        holder = result.first()
        if holder is not None:
            holder_id, holder_updated_at = holder
            if _is_older(updated_at, holder_updated_at):
                # The holder had it more recently, so this event's claim is
                # stale; this user's current username comes with a later event.
                username = None
            else:
                # The holder's claim is the stale one (a missed user.deleted,
                # or a rename whose webhook hasn't arrived). The username
                # condition keeps this from clobbering a rename of the holder
                # that committed since the SELECT.
                await session.exec(
                    update(User)
                    .where(User.id == holder_id, User.username == username)
                    .values(username=None)
                )

    email = _primary_email(data)
    display_name = _display_name(data)
    if user is None:
        user = User(
            clerk_user_id=clerk_user_id,
            username=username,
            email=email,
            display_name=display_name,
            clerk_updated_at=updated_at,
        )
    else:
        user.username = username
        user.email = email
        user.display_name = display_name
        if updated_at is not None:
            user.clerk_updated_at = updated_at
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def sync_user_from_clerk_event(session: AsyncSession, event: dict) -> None:
    """Handles Clerk webhook events: user.created / user.updated / user.deleted."""
    event_type = event.get("type")
    data = event.get("data", {})
    clerk_user_id = data.get("id")
    if not clerk_user_id:
        return

    if event_type in ("user.created", "user.updated"):
        await _upsert_user_from_clerk_data(session, clerk_user_id, data)
    elif event_type == "user.deleted":
        user = await get_user_by_clerk_id(session, clerk_user_id)
        if user is not None:
            await session.delete(user)
            await session.commit()


async def fetch_clerk_user(clerk_user_id: str, settings: Settings) -> dict | None:
    """Calls the Clerk Backend API for one user's profile."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.clerk_backend_api_url}/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


async def get_or_provision_user(
    session: AsyncSession, clerk_user_id: str, settings: Settings
) -> User | None:
    """Just-in-time provisioning: the *first* authenticated request from a
    Clerk user we haven't seen yet fetches their profile from the Clerk
    Backend API and creates the local `users` row right then -- this is the
    primary sync path (no webhook endpoint/tunnel required to test auth).
    `sync_user_from_clerk_event` (the webhook) stays wired up for the same
    upsert logic and remains the only path that reacts to `user.deleted`
    or profile edits made after the first login.
    """
    user = await get_user_by_clerk_id(session, clerk_user_id)
    if user is not None:
        return user

    data = await fetch_clerk_user(clerk_user_id, settings)
    if data is None:
        return None
    return await _upsert_user_from_clerk_data(session, clerk_user_id, data)
