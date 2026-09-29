"""Shared fixtures for apps/api tests.

Tests run against the real local Postgres (the same DATABASE_URL used for
dev -- see apps/api/.env / README.md "Run the database and Adminer") rather
than a mocked session, matching how the Users module has been verified so
far. Run `docker compose up -d db` and `uv run alembic upgrade head` before
running the suite.
"""

from uuid import uuid4

import pytest_asyncio
from sqlalchemy import delete

from app.core.database import async_session_factory
from app.users.models import User


@pytest_asyncio.fixture
async def test_user():
    async with async_session_factory() as session:
        user = User(
            clerk_user_id=f"clerk_test_{uuid4()}",
            email="pytest-fixture@example.com",
            display_name="Pytest Fixture User",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    yield user

    async with async_session_factory() as session:
        await session.exec(delete(User).where(User.id == user.id))
        await session.commit()
