"""Aggregates for the Home screen and the onboarding hand-off."""

from datetime import timedelta

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.home.schemas import (
    HomeProgress,
    HomeStreak,
    HomeToday,
    OnboardingRead,
    OnboardingRequest,
    TodayMission,
    WeekDay,
)
from app.missions import service as missions_service
from app.missions.schemas import MissionRead
from app.users.models import User
from app.users.service import XP_PER_LEVEL, local_today
from app.wellness import service as wellness_service
from app.wellness.models import Checkin, UserWellnessArea, WellnessArea
from app.wellness.schemas import WellnessAreaRead


async def home_today(session: AsyncSession, user: User) -> HomeToday:
    today = local_today(user)
    checkin = await wellness_service.get_today_checkin(session, user)
    energy = checkin.energy_level if checkin else None
    intention = await wellness_service.latest_intention(session, user.id)

    picks = await missions_service.pick_missions(
        session, user, energy=energy or "medium", intention=intention, today=today, limit=4
    )
    streak = await wellness_service.get_or_create_streak(session, user.id)
    current = wellness_service.effective_current_streak(streak, today)

    monday = today - timedelta(days=today.weekday())
    days = [monday + timedelta(days=i) for i in range(7)]
    done_days = await missions_service.active_days(session, user.id, monday, days[-1])

    return HomeToday(
        display_name=user.display_name,
        energy_today=energy,
        mission=TodayMission(mission=MissionRead.model_validate(picks[0])) if picks else None,
        upcoming=[MissionRead.model_validate(m) for m in picks[1:]],
        streak=HomeStreak(
            current=current,
            longest=streak.longest_streak,
            days_to_record=max(0, streak.longest_streak - current),
            week=[WeekDay(date=d, active=d in done_days, is_today=d == today) for d in days],
        ),
        progress=HomeProgress(
            xp_total=user.xp_total,
            level=user.level,
            xp_into_level=user.xp_total % XP_PER_LEVEL,
            xp_to_next_level=XP_PER_LEVEL - user.xp_total % XP_PER_LEVEL,
        ),
    )


async def apply_onboarding(
    session: AsyncSession, user: User, payload: OnboardingRequest
) -> OnboardingRead:
    """Saves the three onboarding answers in one transaction.

    Never overwrites: an account that already has areas (returning user,
    second device, or a retry of this very call) is left alone, which also
    makes the call idempotent.
    """
    existing = await wellness_service.list_user_wellness_areas(session, user.id)
    if existing:
        return await _onboarding_read(session, user, applied=False, areas=existing, checkin=None)

    areas = list(
        (
            await session.exec(
                select(WellnessArea)
                .where(WellnessArea.pillar.in_(set(payload.pillars)))
                .order_by(WellnessArea.name)
            )
        ).all()
    )
    for area in areas:
        session.add(UserWellnessArea(user_id=user.id, wellness_area_id=area.id))
    intention = (payload.intention or "").strip() or None
    checkin = Checkin(user_id=user.id, energy_level=payload.energy_level, intention=intention)
    session.add(checkin)
    await session.commit()
    await session.refresh(checkin)
    return await _onboarding_read(session, user, applied=True, areas=areas, checkin=checkin)


async def _onboarding_read(
    session: AsyncSession,
    user: User,
    *,
    applied: bool,
    areas: list[WellnessArea],
    checkin: Checkin | None,
) -> OnboardingRead:
    energy = checkin.energy_level if checkin else "medium"
    intention = (
        checkin.intention
        if checkin
        else await wellness_service.latest_intention(session, user.id)
    )
    picks = await missions_service.pick_missions(
        session, user, energy=energy, intention=intention, today=local_today(user), limit=1
    )
    return OnboardingRead(
        applied=applied,
        areas=[WellnessAreaRead.model_validate(a) for a in areas],
        checkin=checkin,
        first_mission=MissionRead.model_validate(picks[0]) if picks else None,
        user_id=user.id,
    )
