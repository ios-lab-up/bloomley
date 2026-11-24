"""Inbox + daily reminders.

Producers call :func:`create_notification` inside their own transaction (it
does not commit). Delivery is separate: :mod:`app.notifications.push` sends
whatever is still ``pending``, so a failing push provider can never fail the
action that produced the notification (e.g. a mission completion).
"""

from datetime import date, datetime, time, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import exists, func, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.missions.models import MissionCompletion
from app.notifications.models import Notification
from app.users.models import NotificationSettings, PushToken, User
from app.users.service import user_zone
from app.wellness.models import Streak
from app.wellness.service import effective_current_streak

DEFAULT_REMINDER_TIME = time(9, 0)
# A reminder is only sent within this window after its time, so a worker that
# was down all day doesn't fire a "good morning" at 11 pm.
REMINDER_WINDOW = timedelta(hours=4)


async def create_notification(
    session: AsyncSession,
    user_id: UUID,
    type: str,
    title: str,
    body: str,
    data: dict | None = None,
    dedupe_key: str | None = None,
) -> bool:
    """Adds one inbox row; does NOT commit. With a `dedupe_key`, a second call
    for the same (user, key) is a no-op, whichever replica gets there first.
    Returns whether a row was created."""
    stmt = (
        pg_insert(Notification)
        .values(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            data=data or {},
            dedupe_key=dedupe_key,
            push_status="pending",
            created_at=datetime.utcnow(),
            id=uuid4(),
        )
        .on_conflict_do_nothing(constraint="uq_notifications_user_dedupe")
        .returning(Notification.id)
    )
    result = await session.exec(stmt)
    return result.first() is not None


async def list_notifications(
    session: AsyncSession, user_id: UUID, unread_only: bool, limit: int, offset: int
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    result = await session.exec(
        query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    )
    return list(result.all())


async def unread_count(session: AsyncSession, user_id: UUID) -> int:
    result = await session.exec(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
    )
    return int(result.one())


async def mark_read(
    session: AsyncSession, user_id: UUID, notification_id: UUID
) -> Notification | None:
    """Idempotent. Scoped to the owner: someone else's id looks like a 404."""
    notification = await session.get(Notification, notification_id)
    if notification is None or notification.user_id != user_id:
        return None
    if notification.read_at is None:
        notification.read_at = datetime.utcnow()
        session.add(notification)
        await session.commit()
        await session.refresh(notification)
    return notification


async def mark_all_read(session: AsyncSession, user_id: UUID) -> None:
    await session.exec(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.utcnow())
    )
    await session.commit()


def _reminder_due(
    settings: NotificationSettings | None, local_now: datetime
) -> bool:
    frequency = settings.frequency if settings else "daily"
    weekday = local_now.weekday()
    if frequency == "weekdays" and weekday >= 5:
        return False
    if frequency == "weekly" and weekday != 0:
        return False
    at = settings.reminder_time if settings else DEFAULT_REMINDER_TIME
    start = datetime.combine(local_now.date(), at)
    return start <= local_now.replace(tzinfo=None) < start + REMINDER_WINDOW


async def enqueue_daily_reminders(
    session: AsyncSession, now_utc: datetime | None = None
) -> int:
    """Creates today's reminder for every user who is due one.

    Due = notifications on (a missing settings row counts as the defaults),
    at least one active push token, the frequency matches today, the local
    time is inside the reminder window, and they haven't completed a mission
    today. One reminder per user per local day (unique dedupe key), so running
    this every minute, on any number of replicas, is safe. Returns how many
    were created."""
    now_utc = now_utc or datetime.utcnow()
    has_token = exists().where(PushToken.user_id == User.id, PushToken.is_active.is_(True))
    rows = (
        await session.exec(
            select(User, NotificationSettings)
            .outerjoin(NotificationSettings, NotificationSettings.user_id == User.id)
            .where(has_token)
            .where(
                (NotificationSettings.id.is_(None)) | (NotificationSettings.enabled.is_(True))
            )
        )
    ).all()

    candidates: list[tuple[User, NotificationSettings | None, date]] = []
    for user, settings in rows:
        local_now = now_utc.replace(tzinfo=ZoneInfo("UTC")).astimezone(user_zone(user))
        if _reminder_due(settings, local_now):
            candidates.append((user, settings, local_now.date()))
    if not candidates:
        return 0

    ids = [u.id for u, _, _ in candidates]
    done = {
        (uid, day)
        for uid, day in (
            await session.exec(
                select(MissionCompletion.user_id, MissionCompletion.completed_on).where(
                    MissionCompletion.user_id.in_(ids),
                    MissionCompletion.criteria_met.is_(True),
                    MissionCompletion.completed_on >= now_utc.date() - timedelta(days=2),
                )
            )
        ).all()
    }
    streaks = {
        s.user_id: s
        for s in (await session.exec(select(Streak).where(Streak.user_id.in_(ids)))).all()
    }

    created = 0
    for user, _settings, today in candidates:
        if (user.id, today) in done:
            continue
        streak = streaks.get(user.id)
        current = effective_current_streak(streak, today) if streak else 0
        body = (
            f"Tu racha de {current} días te espera. Un pequeño paso hoy."
            if current > 0
            else "Un pequeño paso hoy es suficiente."
        )
        if await create_notification(
            session,
            user.id,
            "daily_reminder",
            "Es hora de tu pequeño paso",
            body,
            {"screen": "home"},
            dedupe_key=f"daily_reminder:{today.isoformat()}",
        ):
            created += 1
    await session.commit()
    return created
