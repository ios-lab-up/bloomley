"""Business logic for the Users & Auth module.

`add_xp` is the single write path for `xp_total`/`level`: other modules
(missions, groups, ...) must call it instead of mutating those columns
directly, so the leveling rule lives in exactly one place.
"""

from datetime import datetime
from uuid import UUID

import httpx
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


async def add_xp(session: AsyncSession, user_id: UUID, amount: int) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise ValueError(f"User {user_id} not found")

    user.xp_total += amount
    user.level = calculate_level(user.xp_total)
    session.add(user)
    await session.commit()
    await session.refresh(user)
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


async def _upsert_user_from_clerk_data(
    session: AsyncSession, clerk_user_id: str, data: dict
) -> User:
    """Only place allowed to write `clerk_user_id`/`email`/initial
    `display_name`. Shared by both sync paths (see module docstring below)."""
    user = await get_user_by_clerk_id(session, clerk_user_id)
    email = _primary_email(data)
    display_name = _display_name(data)
    if user is None:
        user = User(clerk_user_id=clerk_user_id, email=email, display_name=display_name)
    else:
        user.email = email
        user.display_name = display_name
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
