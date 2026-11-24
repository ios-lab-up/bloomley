"""Home, onboarding, group "today", timezone-aware days and the mission seed.

Real Postgres (see conftest.py). Auth goes through AUTH_DEV_BYPASS.
"""

from datetime import date, datetime, timedelta
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import delete, update
from sqlmodel import select

from app.core.config import Settings, get_settings
from app.core.database import async_session_factory
from app.main import app
from app.missions.models import Mission
from app.users import service as users_service
from app.users.models import User
from app.wellness.models import Streak, WellnessArea
from app.groups.models import Group


@pytest_asyncio.fixture
async def api(test_user):
    app.dependency_overrides[get_settings] = lambda: Settings(
        environment="development", auth_dev_bypass=True
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"X-Debug-User-Id": str(test_user.id)},
    ) as c:
        yield c
    app.dependency_overrides.pop(get_settings, None)


async def _onboard(api, intention="move_more", energy="medium", pillars=("physical", "mental")):
    r = await api.post(
        "/api/v1/onboarding",
        json={"pillars": list(pillars), "intention": intention, "energy_level": energy},
    )
    assert r.status_code == 200, r.text
    return r.json()


async def test_seed_has_pillars_and_a_mission_per_intention_and_tier():
    async with async_session_factory() as session:
        areas = (await session.exec(select(WellnessArea))).all()
        assert {a.pillar for a in areas} == {"physical", "mental", "social"}
        missions = (
            await session.exec(select(Mission).where(Mission.intention.is_not(None)))
        ).all()
    by_intention: dict[str, list[Mission]] = {}
    for m in missions:
        by_intention.setdefault(m.intention, []).append(m)
    assert len(by_intention) == 13
    for key, items in by_intention.items():
        assert sorted(m.duration_minutes for m in items) == [5, 10, 20], key
        assert all(m.xp_reward == m.duration_minutes for m in items), key


async def test_onboarding_saves_choices_once_and_returns_first_mission(api):
    body = await _onboard(api)
    assert body["applied"] is True
    assert {a["pillar"] for a in body["areas"]} == {"physical", "mental"}
    assert body["checkin"]["energy_level"] == "medium"
    assert body["first_mission"]["title"] == "Camina 10 minutos"
    assert body["first_mission"]["xp_reward"] == 10

    # A retry (or a second device) never overwrites or duplicates anything.
    again = await _onboard(api, pillars=("social",), energy="high")
    assert again["applied"] is False
    assert {a["pillar"] for a in again["areas"]} == {"physical", "mental"}
    mine = (await api.get("/api/v1/wellness-areas/me")).json()
    assert len(mine) == len(body["areas"])


async def test_onboarding_requires_a_pillar(api):
    r = await api.post("/api/v1/onboarding", json={"pillars": [], "energy_level": "low"})
    assert r.status_code == 422


async def test_home_today_and_completing_the_mission(api):
    await _onboard(api)
    home = (await api.get("/api/v1/home/today")).json()
    assert home["energy_today"] == "medium"
    assert home["streak"]["current"] == 0
    assert len(home["streak"]["week"]) == 7
    assert sum(d["is_today"] for d in home["streak"]["week"]) == 1
    assert home["progress"]["xp_to_next_level"] == 100
    mission = home["mission"]["mission"]
    assert mission["title"] == "Camina 10 minutos"
    assert 1 <= len(home["upcoming"]) <= 3
    assert mission["id"] not in {m["id"] for m in home["upcoming"]}

    r = await api.post(f"/api/v1/missions/{mission['id']}/complete", json={"engaged_minutes": 10})
    assert r.status_code == 200 and r.json()["criteria_met"] is True

    after = (await api.get("/api/v1/home/today")).json()
    assert after["streak"]["current"] == 1
    assert after["streak"]["longest"] == 1
    assert [d["active"] for d in after["streak"]["week"] if d["is_today"]] == [True]
    assert after["progress"]["xp_total"] == 10
    assert after["progress"]["xp_to_next_level"] == 90
    assert after["mission"]["mission"]["id"] != mission["id"]  # done today: next one


async def test_partial_attempt_can_be_finished_later_the_same_day(api, test_user):
    await _onboard(api)
    mission = (await api.get("/api/v1/home/today")).json()["mission"]["mission"]
    url = f"/api/v1/missions/{mission['id']}/complete"

    first = (await api.post(url, json={"engaged_minutes": 3})).json()
    assert first["criteria_met"] is False and first["xp_earned"] == 0

    done = (await api.post(url, json={"engaged_minutes": 10})).json()
    assert done["id"] == first["id"]
    assert done["criteria_met"] is True and done["xp_earned"] == 10

    # And a third tap pays nothing more.
    await api.post(url, json={"engaged_minutes": 10})
    assert (await api.get("/api/v1/users/me")).json()["xp_total"] == 10
    feedback = (await api.get("/api/v1/missions/me/feedback")).json()
    assert len(feedback) == 1 and feedback[0]["feedback_type"] == "congrats"


async def test_broken_streak_reads_zero(api, test_user):
    async with async_session_factory() as session:
        session.add(
            Streak(
                user_id=test_user.id,
                current_streak=7,
                longest_streak=9,
                last_active_date=users_service.local_today(test_user) - timedelta(days=5),
            )
        )
        await session.commit()
    streak = (await api.get("/api/v1/streaks/me")).json()
    assert streak["current_streak"] == 0 and streak["longest_streak"] == 9
    home = (await api.get("/api/v1/home/today")).json()
    assert home["streak"]["current"] == 0 and home["streak"]["days_to_record"] == 9


async def test_group_today_and_group_streak_follow_mission_completions(api, test_user):
    await _onboard(api)
    group = (await api.post("/api/v1/groups", json={"name": "Los de siempre"})).json()
    gid = group["id"]
    try:
        today = (await api.get(f"/api/v1/groups/{gid}/today")).json()
        assert today["member_count"] == 1 and today["completed_count"] == 0
        assert today["streak_current"] == 0 and len(today["week"]) == 7

        mission = (await api.get("/api/v1/home/today")).json()["mission"]["mission"]
        # No group_id sent: the step still counts for every group the user is in.
        await api.post(f"/api/v1/missions/{mission['id']}/complete", json={"engaged_minutes": 10})

        today = (await api.get(f"/api/v1/groups/{gid}/today")).json()
        assert today["completed_count"] == 1
        assert today["streak_current"] == 1
        me = today["members"][0]
        assert me["completed_today"] is True and me["activity_title"] == mission["title"]
        assert [d["active"] for d in today["week"]].count(True) == 1

        detail = (await api.get(f"/api/v1/groups/{gid}")).json()
        assert detail["streak"]["current_streak"] == 1
    finally:
        async with async_session_factory() as session:
            await session.exec(delete(Group).where(Group.id == gid))
            await session.commit()


async def test_checkin_today(api):
    assert (await api.get("/api/v1/checkins/me/today")).json() is None
    await api.post("/api/v1/checkins", json={"energy_level": "high"})
    today = (await api.get("/api/v1/checkins/me/today")).json()
    assert today["energy_level"] == "high"


async def test_timezone_validation_and_local_day(api, test_user):
    assert (await api.patch("/api/v1/users/me", json={"timezone": "Mars/Base"})).status_code == 422
    r = await api.patch("/api/v1/users/me", json={"timezone": "America/Mexico_City"})
    assert r.status_code == 200 and r.json()["timezone"] == "America/Mexico_City"

    # 01:00 UTC on the 18th is still the 17th evening in Mexico City (UTC-6):
    # the user's day starts at 06:00 UTC and ends at 06:00 UTC the next day.
    user = User(clerk_user_id="x", email="x", display_name="x", timezone="America/Mexico_City")
    start, end = users_service.local_day_bounds_utc(user, date(2026, 11, 17))
    assert start == datetime(2026, 11, 17, 6, 0)
    assert end == datetime(2026, 11, 18, 6, 0)
    assert start <= datetime(2026, 11, 18, 1, 0) < end


async def test_clerk_image_url_is_mirrored_to_avatar_url():
    clerk_id = f"clerk_test_{uuid4()}"
    event = {
        "type": "user.created",
        "data": {
            "id": clerk_id,
            "email_addresses": [{"id": "e1", "email_address": "av@example.com"}],
            "primary_email_address_id": "e1",
            "first_name": "Av",
            "last_name": "Atar",
            "image_url": "https://img.clerk.com/a.png",
        },
    }
    try:
        async with async_session_factory() as session:
            await users_service.sync_user_from_clerk_event(session, event)
        async with async_session_factory() as session:
            user = await users_service.get_user_by_clerk_id(session, clerk_id)
        assert user.avatar_url == "https://img.clerk.com/a.png"
    finally:
        async with async_session_factory() as session:
            await session.exec(delete(User).where(User.clerk_user_id == clerk_id))
            await session.commit()


async def test_user_read_exposes_level_progress(api, test_user):
    async with async_session_factory() as session:
        await users_service.add_xp(session, test_user.id, 130)
    me = (await api.get("/api/v1/users/me")).json()
    assert me["level"] == 2
    assert me["xp_into_level"] == 30 and me["xp_to_next_level"] == 70


async def test_daily_xp_cap_trims_reward_but_keeps_completion_and_streak(api):
    async with async_session_factory() as session:
        rows = (
            await session.exec(
                select(Mission).where(
                    Mission.title.in_(
                        ["Entrenamiento de fuerza", "Caminata activa", "Desconexión digital"]
                    )
                )
            )
        ).all()
    by_title = {m.title: m for m in rows}
    earned = []
    for title in ["Entrenamiento de fuerza", "Caminata activa", "Desconexión digital"]:
        m = by_title[title]
        r = (
            await api.post(
                f"/api/v1/missions/{m.id}/complete", json={"engaged_minutes": m.duration_minutes}
            )
        ).json()
        assert r["criteria_met"] is True
        earned.append(r["xp_earned"])
    assert earned == [80, 50, 20]  # 80 + 50 + (60 trimmed to the 20 left) = 150

    extra = by_title["Entrenamiento de fuerza"]  # already done today -> idempotent
    assert (
        await api.post(f"/api/v1/missions/{extra.id}/complete", json={"engaged_minutes": 30})
    ).json()["xp_earned"] == 80

    assert (await api.get("/api/v1/users/me")).json()["xp_total"] == 150
    assert (await api.get("/api/v1/streaks/me")).json()["current_streak"] == 1

    # Past the cap a mission still completes (and keeps the streak), paying 0.
    await _onboard(api)
    mission = (await api.get("/api/v1/home/today")).json()["mission"]["mission"]
    r = (
        await api.post(
            f"/api/v1/missions/{mission['id']}/complete",
            json={"engaged_minutes": mission["duration_minutes"]},
        )
    ).json()
    assert r["criteria_met"] is True and r["xp_earned"] == 0
    assert (await api.get("/api/v1/users/me")).json()["xp_total"] == 150
    fb = (await api.get("/api/v1/missions/me/feedback")).json()[0]
    assert "tope de XP" in fb["message"]


async def test_engaged_minutes_are_clamped_not_rejected(api):
    await _onboard(api)
    mission = (await api.get("/api/v1/home/today")).json()["mission"]["mission"]
    r = await api.post(
        f"/api/v1/missions/{mission['id']}/complete", json={"engaged_minutes": 2000}
    )
    assert r.status_code == 200
    assert r.json()["engaged_minutes"] == mission["duration_minutes"] * 3
    assert r.json()["criteria_met"] is True
