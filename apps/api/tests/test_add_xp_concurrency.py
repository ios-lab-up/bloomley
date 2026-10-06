"""Regression test for the add_xp lost-update race condition.

Reported by @duchagoya-lgtm on PR #12: add_xp used to read xp_total,
add the amount in Python, and write back the final value. Concurrent
calls could read the same starting value and overwrite each other's
update -- 20 concurrent +10 calls landed on 40 instead of 200 (and 30 in
a second, worse run against this exact fixture during the fix).
"""

import asyncio

from app.core.database import async_session_factory
from app.users.models import User
from app.users.service import add_xp, calculate_level

CONCURRENCY = 20
AMOUNT = 10


async def test_add_xp_survives_concurrent_calls(test_user):
    async def bump() -> None:
        async with async_session_factory() as session:
            await add_xp(session, test_user.id, AMOUNT)

    await asyncio.gather(*(bump() for _ in range(CONCURRENCY)))

    async with async_session_factory() as session:
        refreshed = await session.get(User, test_user.id)

    assert refreshed is not None
    assert refreshed.xp_total == AMOUNT * CONCURRENCY
    # Guards against the SQL level expression in add_xp drifting out of
    # sync with calculate_level() -- see the docstring in service.py.
    assert refreshed.level == calculate_level(refreshed.xp_total)
