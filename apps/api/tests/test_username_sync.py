"""`users.username` mirrors the Clerk username through the webhook sync."""

from uuid import uuid4

import pytest_asyncio
from sqlalchemy import delete

from app.core.database import async_session_factory
from app.users.models import User
from app.users.service import get_user_by_clerk_id, sync_user_from_clerk_event


@pytest_asyncio.fixture
async def clerk_ids():
    """Fresh clerk_user_ids for the test; their rows are deleted afterwards."""
    ids = [f"clerk_test_{uuid4()}" for _ in range(2)]
    yield ids

    async with async_session_factory() as session:
        await session.exec(delete(User).where(User.clerk_user_id.in_(ids)))
        await session.commit()


def _unique_username() -> str:
    return f"pytest_{uuid4().hex[:12]}"


async def _send(event_type: str, clerk_user_id: str, username: str | None) -> None:
    data = {
        "id": clerk_user_id,
        "username": username,
        "first_name": "Pytest",
        "last_name": "User",
        "email_addresses": [{"id": "email_1", "email_address": "pytest@example.com"}],
        "primary_email_address_id": "email_1",
    }
    async with async_session_factory() as session:
        await sync_user_from_clerk_event(session, {"type": event_type, "data": data})


async def _username_of(clerk_user_id: str) -> str | None:
    async with async_session_factory() as session:
        user = await get_user_by_clerk_id(session, clerk_user_id)
    assert user is not None
    return user.username


async def test_username_is_synced_lowercase_and_follows_updates(clerk_ids):
    clerk_id = clerk_ids[0]
    username = _unique_username()

    await _send("user.created", clerk_id, f"  {username.upper()} ")
    assert await _username_of(clerk_id) == username

    renamed = _unique_username()
    await _send("user.updated", clerk_id, renamed)
    assert await _username_of(clerk_id) == renamed

    await _send("user.updated", clerk_id, None)
    assert await _username_of(clerk_id) is None


async def test_username_is_taken_from_a_stale_holder(clerk_ids):
    stale_id, new_id = clerk_ids
    username = _unique_username()

    await _send("user.created", stale_id, username)
    # Clerk handed the username to someone else (e.g. the stale user's
    # user.deleted never arrived): the new owner must win, not hit a 500.
    await _send("user.created", new_id, username)

    assert await _username_of(new_id) == username
    assert await _username_of(stale_id) is None
