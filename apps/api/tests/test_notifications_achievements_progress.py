"""Notifications (inbox, reminders, push), achievements and progress.

Real Postgres (see conftest.py). Expo is never called: the sender is a fake.
"""

from datetime import datetime, time, timedelta
from uuid import uuid4

import httpx
import pytest_asyncio
from sqlalchemy import delete
from sqlmodel import select

from app.core.config import Settings, get_settings
from app.core.database import async_session_factory
from app.main import app
from app.notifications import push, service as notif
from app.notifications.models import Notification
from app.users.models import NotificationSettings, PushToken, User

SETTINGS = Settings(environment="development", auth_dev_bypass=True)


@pytest_asyncio.fixture
async def api(test_user):
    app.dependency_overrides[get_settings] = lambda: SETTINGS
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"X-Debug-User-Id": str(test_user.id)},
    ) as c:
        yield c
    app.dependency_overrides.pop(get_settings, None)


async def _add_token(user_id, token=None) -> str:
    token = token or f"ExponentPushToken[{uuid4()}]"
    async with async_session_factory() as session:
        session.add(
            PushToken(user_id=user_id, expo_push_token=token, device_id="d", platform="ios")
        )
        await session.commit()
    return token


async def _onboard_and_complete(api):
    await api.post(
        "/api/v1/onboarding",
        json={"pillars": ["physical"], "intention": "move_more", "energy_level": "medium"},
    )
    mission = (await api.get("/api/v1/home/today")).json()["mission"]["mission"]
    return (
        await api.post(
            f"/api/v1/missions/{mission['id']}/complete",
            json={"engaged_minutes": mission["duration_minutes"]},
        )
    ).json()


# ---------------------------------------------------------------- achievements
async def test_first_mission_unlocks_achievements_and_notifies(api):
    done = await _onboard_and_complete(api)
    keys = {a["key"] for a in done["newly_unlocked"]}
    assert keys == {"first_step"}  # 1 mission, 1 area, streak 1, level 1

    mine = {a["key"]: a for a in (await api.get("/api/v1/achievements/me")).json()}
    assert mine["first_step"]["unlocked"] is True and mine["first_step"]["unlocked_at"]
    assert mine["ten_steps"]["unlocked"] is False
    assert mine["ten_steps"]["progress"] == 1 and mine["ten_steps"]["threshold"] == 10
    assert len(mine) == 10

    inbox = (await api.get("/api/v1/notifications")).json()
    assert [n["type"] for n in inbox] == ["achievement_unlocked"]
    assert inbox[0]["data"]["achievement_key"] == "first_step"
    assert (await api.get("/api/v1/notifications/unread-count")).json() == {"unread": 1}


async def test_repeat_tap_does_not_unlock_or_notify_twice(api):
    done = await _onboard_and_complete(api)
    again = (
        await api.post(
            f"/api/v1/missions/{done['mission_id']}/complete",
            json={"engaged_minutes": done["mission"]["duration_minutes"]},
        )
    ).json()
    assert again["newly_unlocked"] == []
    assert len((await api.get("/api/v1/notifications")).json()) == 1


async def test_level_achievement_unlocks_from_xp(api, test_user):
    from app.users import service as users_service

    async with async_session_factory() as session:
        await users_service.add_xp(session, test_user.id, 100)  # level 2
    done = await _onboard_and_complete(api)
    assert {a["key"] for a in done["newly_unlocked"]} == {"first_step", "level_2"}


# --------------------------------------------------------------------- inbox
async def test_inbox_read_flow_and_ownership(api, test_user):
    async with async_session_factory() as session:
        for i in range(3):
            await notif.create_notification(session, test_user.id, "t", f"n{i}", "b")
        other = User(clerk_user_id=f"clerk_{uuid4()}", email="o@x.com", display_name="O")
        session.add(other)
        await session.commit()
        await notif.create_notification(session, other.id, "t", "theirs", "b")
        await session.commit()
        theirs = (
            await session.exec(select(Notification).where(Notification.user_id == other.id))
        ).one()
    try:
        assert (await api.get("/api/v1/notifications/unread-count")).json() == {"unread": 3}
        first = (await api.get("/api/v1/notifications?limit=1")).json()[0]
        r = await api.post(f"/api/v1/notifications/{first['id']}/read")
        assert r.status_code == 200 and r.json()["read_at"]
        assert (await api.get("/api/v1/notifications/unread-count")).json() == {"unread": 2}
        assert len((await api.get("/api/v1/notifications?unread_only=true")).json()) == 2

        # someone else's notification looks like it doesn't exist
        assert (await api.post(f"/api/v1/notifications/{theirs.id}/read")).status_code == 404

        assert (await api.post("/api/v1/notifications/read-all")).status_code == 204
        assert (await api.get("/api/v1/notifications/unread-count")).json() == {"unread": 0}
    finally:
        async with async_session_factory() as session:
            await session.exec(delete(User).where(User.id == other.id))
            await session.commit()


async def test_dedupe_key_creates_once(test_user):
    async with async_session_factory() as session:
        first = await notif.create_notification(
            session, test_user.id, "t", "a", "b", dedupe_key="k"
        )
        second = await notif.create_notification(
            session, test_user.id, "t", "a", "b", dedupe_key="k"
        )
        await session.commit()
    assert (first, second) == (True, False)


# --------------------------------------------------------------------- push
async def test_push_sends_pending_and_deactivates_dead_tokens(test_user):
    good = await _add_token(test_user.id)
    dead = await _add_token(test_user.id)
    async with async_session_factory() as session:
        await notif.create_notification(session, test_user.id, "t", "Hola", "cuerpo", {"a": 1})
        await session.commit()

    seen = []

    async def fake_sender(messages, settings):
        seen.extend(messages)
        return [
            {"status": "ok"}
            if m["to"] == good
            else {"status": "error", "details": {"error": "DeviceNotRegistered"}}
            for m in messages
        ]

    async with async_session_factory() as session:
        sent = await push.dispatch_pending(session, SETTINGS, fake_sender)
    assert sent == 1
    assert {m["to"] for m in seen} == {good, dead}
    assert seen[0]["title"] == "Hola" and seen[0]["data"]["a"] == 1

    async with async_session_factory() as session:
        n = (await session.exec(select(Notification).where(Notification.user_id == test_user.id))).one()
        tokens = {
            t.expo_push_token: t.is_active
            for t in (
                await session.exec(select(PushToken).where(PushToken.user_id == test_user.id))
            ).all()
        }
    assert n.push_status == "sent"
    assert tokens == {good: True, dead: False}


async def test_push_skipped_when_opted_out_or_no_device(test_user):
    async with async_session_factory() as session:
        await notif.create_notification(session, test_user.id, "t", "no device", "b")
        await session.commit()

    async def boom(messages, settings):
        raise AssertionError("must not call Expo")

    async with async_session_factory() as session:
        await push.dispatch_pending(session, SETTINGS, boom)
        n = (await session.exec(select(Notification).where(Notification.user_id == test_user.id))).one()
    assert n.push_status == "skipped"

    await _add_token(test_user.id)
    async with async_session_factory() as session:
        session.add(NotificationSettings(user_id=test_user.id, enabled=False))
        await notif.create_notification(session, test_user.id, "t", "opted out", "b")
        await session.commit()
        await push.dispatch_pending(session, SETTINGS, boom)
        rows = (await session.exec(select(Notification).where(Notification.user_id == test_user.id))).all()
    assert {r.push_status for r in rows} == {"skipped"}


async def test_transient_push_failure_stays_pending(test_user):
    await _add_token(test_user.id)
    async with async_session_factory() as session:
        await notif.create_notification(session, test_user.id, "t", "retry me", "b")
        await session.commit()

    async def down(messages, settings):
        raise httpx.ConnectError("expo is down")

    async with async_session_factory() as session:
        await push.dispatch_pending(session, SETTINGS, down)
        n = (await session.exec(select(Notification).where(Notification.user_id == test_user.id))).one()
    assert n.push_status == "pending"


# ------------------------------------------------------------------ reminders
async def test_daily_reminder_window_dedupe_and_completion(api, test_user):
    await _add_token(test_user.id)
    # Mexico City is UTC-6: 15:30 UTC = 09:30 local, inside the 09:00 window.
    await api.patch("/api/v1/users/me", json={"timezone": "America/Mexico_City"})
    now = datetime.utcnow().replace(hour=15, minute=30, second=0, microsecond=0)

    async with async_session_factory() as session:
        assert await notif.enqueue_daily_reminders(session, now) == 1
        assert await notif.enqueue_daily_reminders(session, now) == 0  # same local day
    inbox = (await api.get("/api/v1/notifications")).json()
    assert inbox[0]["type"] == "daily_reminder" and "pequeño paso" in inbox[0]["body"]


async def test_no_reminder_outside_window_or_after_completing(api, test_user):
    await _add_token(test_user.id)
    await api.patch("/api/v1/users/me", json={"timezone": "UTC"})
    base = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

    async with async_session_factory() as session:
        too_early = base.replace(hour=8)
        too_late = base.replace(hour=14)  # 5h after 09:00, past the 4h window
        assert await notif.enqueue_daily_reminders(session, too_early) == 0
        assert await notif.enqueue_daily_reminders(session, too_late) == 0

    await _onboard_and_complete(api)  # already did today's step
    async with async_session_factory() as session:
        assert await notif.enqueue_daily_reminders(session, base.replace(hour=9, minute=5)) == 0


async def test_reminder_respects_opt_out_frequency_and_time(api, test_user):
    await _add_token(test_user.id)
    await api.patch("/api/v1/users/me", json={"timezone": "UTC"})
    today = datetime.utcnow()
    at_nine = today.replace(hour=9, minute=5, second=0, microsecond=0)

    r = await api.patch("/api/v1/users/me/notification-settings", json={"enabled": False})
    assert r.status_code == 200
    async with async_session_factory() as session:
        assert await notif.enqueue_daily_reminders(session, at_nine) == 0

    await api.patch(
        "/api/v1/users/me/notification-settings",
        json={"enabled": True, "reminder_time": "20:00:00"},
    )
    async with async_session_factory() as session:
        assert await notif.enqueue_daily_reminders(session, at_nine) == 0  # not 20:00 yet
        assert await notif.enqueue_daily_reminders(session, at_nine.replace(hour=20, minute=10)) == 1

    # weekdays-only skips a Saturday
    saturday = at_nine + timedelta(days=(5 - at_nine.weekday()) % 7 + 7)
    await api.patch(
        "/api/v1/users/me/notification-settings",
        json={"frequency": "weekdays", "reminder_time": "09:00:00"},
    )
    async with async_session_factory() as session:
        assert await notif.enqueue_daily_reminders(session, saturday) == 0


async def test_settings_reject_unknown_frequency(api):
    r = await api.patch("/api/v1/users/me/notification-settings", json={"frequency": "hourly"})
    assert r.status_code == 422


# ------------------------------------------------------------------- progress
async def test_progress_totals_areas_and_weeks(api):
    await _onboard_and_complete(api)
    p = (await api.get("/api/v1/progress/me")).json()
    assert p["totals"]["missions_completed"] == 1
    assert p["totals"]["minutes_engaged"] == 10
    assert p["totals"]["active_days"] == 1
    assert p["totals"]["achievements_unlocked"] == 1 and p["totals"]["achievements_total"] == 10
    assert p["current_streak"] == 1 and p["longest_streak"] == 1
    assert p["xp_total"] == 10 and p["xp_to_next_level"] == 90
    assert len(p["by_area"]) == 1 and p["by_area"][0]["missions_completed"] == 1
    assert len(p["weeks"]) == 8
    assert p["weeks"][-1]["missions_completed"] == 1 and p["weeks"][-1]["xp_earned"] == 10
    assert all(w["missions_completed"] == 0 for w in p["weeks"][:-1])


async def test_progress_for_a_brand_new_user_is_all_zeros(api):
    p = (await api.get("/api/v1/progress/me")).json()
    assert p["totals"]["missions_completed"] == 0 and p["by_area"] == []
    assert p["current_streak"] == 0 and len(p["weeks"]) == 8
