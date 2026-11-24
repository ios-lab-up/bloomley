"""`users.username` mirrors the Clerk username through the webhook sync."""

import asyncio
from uuid import uuid4

import pytest_asyncio
from sqlalchemy import delete
from sqlmodel import select

from app.core.database import async_session_factory
from app.users.models import User
from app.users.service import get_user_by_clerk_id, sync_user_from_clerk_event


CONCURRENCY = 10


@pytest_asyncio.fixture
async def clerk_ids():
    """Fresh clerk_user_ids for the test; their rows are deleted afterwards."""
    ids = [f"clerk_test_{uuid4()}" for _ in range(CONCURRENCY)]
    yield ids

    async with async_session_factory() as session:
        await session.exec(delete(User).where(User.clerk_user_id.in_(ids)))
        await session.commit()


def _unique_username() -> str:
    return f"pytest_{uuid4().hex[:12]}"


async def _send(
    event_type: str,
    clerk_user_id: str,
    username: str | None,
    updated_at: int | None = None,
    first_name: str = "Pytest",
) -> None:
    data = {
        "id": clerk_user_id,
        "username": username,
        "updated_at": updated_at,
        "first_name": first_name,
        "last_name": "User",
        "email_addresses": [{"id": "email_1", "email_address": "pytest@example.com"}],
        "primary_email_address_id": "email_1",
    }
    async with async_session_factory() as session:
        await sync_user_from_clerk_event(session, {"type": event_type, "data": data})


async def _user(clerk_user_id: str) -> User:
    async with async_session_factory() as session:
        user = await get_user_by_clerk_id(session, clerk_user_id)
    assert user is not None
    return user


async def _username_of(clerk_user_id: str) -> str | None:
    return (await _user(clerk_user_id)).username


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
    stale_id, new_id = clerk_ids[:2]
    username = _unique_username()

    await _send("user.created", stale_id, username)
    # Clerk handed the username to someone else (e.g. the stale user's
    # user.deleted never arrived): the new owner must win, not hit a 500.
    await _send("user.created", new_id, username)

    assert await _username_of(new_id) == username
    assert await _username_of(stale_id) is None


async def test_late_retry_does_not_take_a_username_back(clerk_ids):
    # Review on #25: A renames alpha -> beta, B takes alpha, then a delayed
    # retry of A's old alpha event arrives. Arrival order must not win.
    a_id, b_id = clerk_ids[:2]
    alpha, beta = _unique_username(), _unique_username()

    await _send("user.created", a_id, alpha, updated_at=1_000)
    await _send("user.updated", a_id, beta, updated_at=3_000)
    await _send("user.created", b_id, alpha, updated_at=4_000)
    await _send("user.updated", a_id, alpha, updated_at=2_000)  # the late retry

    assert await _username_of(a_id) == beta
    assert await _username_of(b_id) == alpha


async def test_holder_with_newer_claim_keeps_the_username(clerk_ids):
    # B's event says "alpha" as of t=4000, but A's row says A held it at
    # t=5000. Clerk never gives it to both at once, so B's claim is outdated.
    a_id, b_id = clerk_ids[:2]
    alpha = _unique_username()

    await _send("user.created", a_id, alpha, updated_at=5_000)
    await _send("user.created", b_id, alpha, updated_at=4_000)

    assert await _username_of(a_id) == alpha
    assert await _username_of(b_id) is None


async def test_older_event_is_ignored_entirely(clerk_ids):
    clerk_id = clerk_ids[0]
    current = _unique_username()

    await _send("user.created", clerk_id, current, updated_at=2_000, first_name="New")
    await _send("user.updated", clerk_id, _unique_username(), updated_at=1_000, first_name="Old")

    user = await _user(clerk_id)
    assert user.username == current
    assert user.display_name == "New User"
    assert user.clerk_updated_at == 2_000


async def test_concurrent_claims_on_one_username_keep_the_newest(clerk_ids):
    # Without serialising on the username, two of these could both see no
    # holder and one would fail on ix_users_username.
    username = _unique_username()

    await asyncio.gather(
        *(
            _send("user.created", clerk_id, username, updated_at=1_000 + i)
            for i, clerk_id in enumerate(clerk_ids)
        )
    )

    holders = [clerk_id for clerk_id in clerk_ids if await _username_of(clerk_id) == username]
    assert holders == [clerk_ids[-1]]


async def test_concurrent_syncs_of_one_new_user_create_one_row(clerk_ids):
    # Two first requests from a new Clerk user both JIT-provision it; the
    # second used to fail on ix_users_clerk_user_id.
    clerk_id = clerk_ids[0]
    username = _unique_username()

    await asyncio.gather(
        *(_send("user.created", clerk_id, username, updated_at=1_000) for _ in range(CONCURRENCY))
    )

    async with async_session_factory() as session:
        rows = (await session.exec(select(User).where(User.clerk_user_id == clerk_id))).all()
    assert len(rows) == 1
    assert rows[0].username == username
