"""Business logic for the Wellness domain (Módulo 2).

Wellness owns *how* streaks and areas work. Other sub-domains (missions,
groups) decide *when* a user performs a streak-worthy action and call
``bump_streak_for_activity`` instead of touching the ``streaks`` table.
"""

from datetime import date, datetime, timedelta
from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.users.models import User
from app.users.service import local_day_bounds_utc, local_today
from app.wellness.models import Checkin, Streak, UserWellnessArea, WellnessArea


async def list_wellness_areas(session: AsyncSession) -> list[WellnessArea]:
    result = await session.exec(select(WellnessArea).order_by(WellnessArea.name))
    return list(result.all())


async def get_wellness_area(session: AsyncSession, area_id: UUID) -> WellnessArea | None:
    return await session.get(WellnessArea, area_id)


async def add_area_to_user(
    session: AsyncSession, user_id: UUID, area_id: UUID
) -> UserWellnessArea:
    result = await session.exec(
        select(UserWellnessArea).where(
            UserWellnessArea.user_id == user_id,
            UserWellnessArea.wellness_area_id == area_id,
        )
    )
    existing = result.first()
    if existing is not None:
        return existing

    selection = UserWellnessArea(user_id=user_id, wellness_area_id=area_id)
    session.add(selection)
    await session.commit()
    await session.refresh(selection)
    return selection


async def remove_area_from_user(
    session: AsyncSession, user_id: UUID, area_id: UUID
) -> None:
    """Idempotent: a missing selection is not an error (204 either way)."""
    result = await session.exec(
        select(UserWellnessArea).where(
            UserWellnessArea.user_id == user_id,
            UserWellnessArea.wellness_area_id == area_id,
        )
    )
    selection = result.first()
    if selection is not None:
        await session.delete(selection)
        await session.commit()


async def list_user_wellness_areas(
    session: AsyncSession, user_id: UUID
) -> list[WellnessArea]:
    result = await session.exec(
        select(WellnessArea)
        .join(UserWellnessArea, UserWellnessArea.wellness_area_id == WellnessArea.id)
        .where(UserWellnessArea.user_id == user_id)
        .order_by(WellnessArea.name)
    )
    return list(result.all())


async def create_checkin(
    session: AsyncSession, user_id: UUID, energy_level: str, intention: str | None
) -> Checkin:
    checkin = Checkin(user_id=user_id, energy_level=energy_level, intention=intention)
    session.add(checkin)
    await session.commit()
    await session.refresh(checkin)
    return checkin


async def list_user_checkins(
    session: AsyncSession, user_id: UUID, limit: int, offset: int
) -> list[Checkin]:
    result = await session.exec(
        select(Checkin)
        .where(Checkin.user_id == user_id)
        .order_by(Checkin.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def get_or_create_streak(session: AsyncSession, user_id: UUID) -> Streak:
    result = await session.exec(select(Streak).where(Streak.user_id == user_id))
    streak = result.first()
    if streak is None:
        streak = Streak(user_id=user_id)
        session.add(streak)
        await session.commit()
        await session.refresh(streak)
    return streak


def effective_current_streak(streak: Streak, today: date) -> int:
    """The stored counter only moves when an activity is recorded, so a streak
    that was never continued would keep showing its old value. Past yesterday
    it is broken: report 0 until the next activity restarts it at 1."""
    if streak.last_active_date in (today, today - timedelta(days=1)):
        return streak.current_streak
    return 0


async def get_today_checkin(session: AsyncSession, user: User) -> Checkin | None:
    """Latest check-in of the user's local day (home screen's energy chips)."""
    start, end = local_day_bounds_utc(user, local_today(user))
    result = await session.exec(
        select(Checkin)
        .where(
            Checkin.user_id == user.id,
            Checkin.created_at >= start,
            Checkin.created_at < end,
        )
        .order_by(Checkin.created_at.desc())
        .limit(1)
    )
    return result.first()


async def latest_intention(session: AsyncSession, user_id: UUID) -> str | None:
    """The weekly intention is stored on check-ins; later energy-only check-ins
    don't carry one, so look for the latest that does."""
    result = await session.exec(
        select(Checkin.intention)
        .where(Checkin.user_id == user_id, Checkin.intention.is_not(None))
        .order_by(Checkin.created_at.desc())
        .limit(1)
    )
    return result.first()


async def bump_streak_for_activity(
    session: AsyncSession, user_id: UUID, today: date | None = None
) -> Streak:
    """Records a streak-worthy action (mission completed with criteria met).

    `today` is the user's local calendar day (UTC if omitted): the streak advances once per day, resets when the
    user misses a day, and ``longest_streak`` is kept in lockstep.

    Does NOT commit: the caller owns the surrounding transaction (a mission
    completion) and commits it, so the streak, the completion and the XP
    award always land atomically.
    """
    result = await session.exec(select(Streak).where(Streak.user_id == user_id))
    streak = result.first()
    if streak is None:
        streak = Streak(user_id=user_id)
        session.add(streak)

    today = today or datetime.utcnow().date()
    if streak.last_active_date == today:
        return streak

    if streak.last_active_date == today - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1
    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_active_date = today
    streak.updated_at = datetime.utcnow()
    session.add(streak)
    return streak