"""Personal progress, computed from mission_completions (no tables of its own)."""

from datetime import timedelta

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.achievements.models import Achievement, UserAchievement
from app.missions.models import Mission, MissionCompletion
from app.progress.schemas import (
    AreaProgress,
    ProgressRead,
    ProgressTotals,
    WeekProgress,
)
from app.users.models import User
from app.users.service import XP_PER_LEVEL, local_today
from app.wellness import service as wellness_service
from app.wellness.models import WellnessArea

WEEKS = 8


async def get_progress(session: AsyncSession, user: User) -> ProgressRead:
    today = local_today(user)
    done = MissionCompletion.criteria_met.is_(True)

    count, minutes, days = (
        await session.exec(
            select(
                func.count(),
                func.coalesce(func.sum(MissionCompletion.engaged_minutes), 0),
                func.count(func.distinct(MissionCompletion.completed_on)),
            ).where(MissionCompletion.user_id == user.id, done)
        )
    ).one()

    by_area = [
        AreaProgress(
            area_id=area.id,
            name=area.name,
            pillar=area.pillar,
            missions_completed=n,
            minutes_engaged=int(mins),
        )
        for area, n, mins in (
            await session.exec(
                select(
                    WellnessArea,
                    func.count(),
                    func.coalesce(func.sum(MissionCompletion.engaged_minutes), 0),
                )
                .select_from(MissionCompletion)
                .join(Mission, Mission.id == MissionCompletion.mission_id)
                .join(WellnessArea, WellnessArea.id == Mission.wellness_area_id)
                .where(MissionCompletion.user_id == user.id, done)
                .group_by(WellnessArea.id)
                .order_by(func.count().desc(), WellnessArea.name)
            )
        ).all()
    ]

    this_monday = today - timedelta(days=today.weekday())
    first_monday = this_monday - timedelta(weeks=WEEKS - 1)
    buckets = {first_monday + timedelta(weeks=i): [0, 0] for i in range(WEEKS)}
    for day, xp in (
        await session.exec(
            select(MissionCompletion.completed_on, MissionCompletion.xp_earned).where(
                MissionCompletion.user_id == user.id, done, MissionCompletion.completed_on >= first_monday
            )
        )
    ).all():
        monday = day - timedelta(days=day.weekday())
        if monday in buckets:
            buckets[monday][0] += 1
            buckets[monday][1] += xp

    unlocked = (
        await session.exec(
            select(func.count())
            .select_from(UserAchievement)
            .where(UserAchievement.user_id == user.id)
        )
    ).one()
    total = (await session.exec(select(func.count()).select_from(Achievement))).one()
    streak = await wellness_service.get_or_create_streak(session, user.id)

    return ProgressRead(
        level=user.level,
        xp_total=user.xp_total,
        xp_into_level=user.xp_total % XP_PER_LEVEL,
        xp_to_next_level=XP_PER_LEVEL - user.xp_total % XP_PER_LEVEL,
        current_streak=wellness_service.effective_current_streak(streak, today),
        longest_streak=streak.longest_streak,
        totals=ProgressTotals(
            missions_completed=count,
            minutes_engaged=int(minutes),
            active_days=days,
            achievements_unlocked=unlocked,
            achievements_total=total,
        ),
        by_area=by_area,
        weeks=[
            WeekProgress(week_start=w, missions_completed=v[0], xp_earned=v[1])
            for w, v in sorted(buckets.items())
        ],
    )
