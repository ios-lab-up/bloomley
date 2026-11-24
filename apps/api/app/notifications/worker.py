"""Background loop: enqueue due reminders, then send pending pushes."""

import asyncio
import logging

from app.core.config import Settings
from app.core.database import async_session_factory
from app.notifications import push, service

logger = logging.getLogger(__name__)


async def run_once(settings: Settings) -> None:
    async with async_session_factory() as session:
        await service.enqueue_daily_reminders(session)
    async with async_session_factory() as session:
        await push.dispatch_pending(session, settings)


async def run_forever(settings: Settings) -> None:
    while True:
        try:
            await run_once(settings)
        except asyncio.CancelledError:
            raise
        except Exception:  # the loop must outlive any single bad tick
            logger.exception("notifications worker tick failed")
        await asyncio.sleep(settings.notifications_worker_interval_seconds)
