"""Auth dependency, /users/me routes, push-token logout and Clerk webhook.

Real Postgres (see conftest.py). Clerk is never called: the JWKS client is
replaced with a local RSA key and `fetch_clerk_user` is monkeypatched.
"""

import base64
import secrets
import time
from types import SimpleNamespace
from uuid import uuid4

import httpx
import jwt
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import delete
from sqlmodel import select

from app.core.config import Settings, get_settings
from app.core.database import async_session_factory
from app.main import app
from app.users import deps, service
from app.users.models import PushToken, User


def _settings(**overrides) -> Settings:
    base = dict(
        environment="development",
        auth_dev_bypass=False,
        clerk_secret_key="sk_test",
        clerk_jwks_url="https://example.invalid/jwks",
        clerk_webhook_secret="",
    )
    base.update(overrides)
    return Settings(**base)


@pytest.fixture
def use_settings():
    def _use(**overrides):
        app.dependency_overrides[get_settings] = lambda: _settings(**overrides)

    yield _use
    app.dependency_overrides.pop(get_settings, None)


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture(scope="module")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def fake_jwks(monkeypatch, rsa_key):
    """Makes deps verify tokens against our local public key."""
    fake = SimpleNamespace(
        get_signing_key_from_jwt=lambda token: SimpleNamespace(key=rsa_key.public_key())
    )
    monkeypatch.setattr(deps, "_get_jwk_client", lambda settings: fake)


def _token(rsa_key, sub: str, exp_in: int = 60) -> str:
    now = int(time.time())
    return jwt.encode({"sub": sub, "iat": now, "exp": now + exp_in}, rsa_key, algorithm="RS256")


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# --- get_current_user -------------------------------------------------------


async def test_missing_token_is_401(client, use_settings):
    use_settings()
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 401


async def test_garbage_token_is_401(client, use_settings, fake_jwks):
    use_settings()
    r = await client.get("/api/v1/users/me", headers=_bearer("not-a-jwt"))
    assert r.status_code == 401


async def test_expired_token_is_401(client, use_settings, fake_jwks, rsa_key, test_user):
    use_settings()
    token = _token(rsa_key, test_user.clerk_user_id, exp_in=-10)
    r = await client.get("/api/v1/users/me", headers=_bearer(token))
    assert r.status_code == 401


async def test_token_signed_with_other_key_is_401(client, use_settings, fake_jwks, test_user):
    use_settings()
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    r = await client.get(
        "/api/v1/users/me", headers=_bearer(_token(other, test_user.clerk_user_id))
    )
    assert r.status_code == 401


async def test_valid_token_returns_me(client, use_settings, fake_jwks, rsa_key, test_user):
    use_settings()
    r = await client.get(
        "/api/v1/users/me", headers=_bearer(_token(rsa_key, test_user.clerk_user_id))
    )
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(test_user.id)
    assert body["email"] == test_user.email
    assert "created_at" in body


async def test_first_request_provisions_user(
    client, use_settings, fake_jwks, rsa_key, monkeypatch
):
    use_settings()
    clerk_id = f"clerk_test_{uuid4()}"

    async def fake_fetch(clerk_user_id, settings):
        return {
            "id": clerk_user_id,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "primary_email_address_id": "e1",
            "email_addresses": [{"id": "e1", "email_address": "ada@example.com"}],
        }

    monkeypatch.setattr(service, "fetch_clerk_user", fake_fetch)
    try:
        r = await client.get("/api/v1/users/me", headers=_bearer(_token(rsa_key, clerk_id)))
        assert r.status_code == 200
        assert r.json()["display_name"] == "Ada Lovelace"
    finally:
        async with async_session_factory() as session:
            await session.exec(delete(User).where(User.clerk_user_id == clerk_id))
            await session.commit()


async def test_unknown_clerk_user_is_401(client, use_settings, fake_jwks, rsa_key, monkeypatch):
    use_settings()

    async def fake_fetch(clerk_user_id, settings):
        return None

    monkeypatch.setattr(service, "fetch_clerk_user", fake_fetch)
    r = await client.get(
        "/api/v1/users/me", headers=_bearer(_token(rsa_key, f"clerk_test_{uuid4()}"))
    )
    assert r.status_code == 401


async def test_clerk_outage_is_503(client, use_settings, fake_jwks, rsa_key, monkeypatch):
    use_settings()

    async def boom(clerk_user_id, settings):
        raise httpx.ConnectError("clerk down")

    monkeypatch.setattr(service, "fetch_clerk_user", boom)
    r = await client.get(
        "/api/v1/users/me", headers=_bearer(_token(rsa_key, f"clerk_test_{uuid4()}"))
    )
    assert r.status_code == 503


async def test_azp_allowlist(client, use_settings, fake_jwks, rsa_key, test_user):
    use_settings(clerk_authorized_parties=["https://good.example"])

    def tok(azp):
        now = int(time.time())
        claims = {"sub": test_user.clerk_user_id, "iat": now, "exp": now + 60}
        if azp:
            claims["azp"] = azp
        return jwt.encode(claims, rsa_key, algorithm="RS256")

    ok = await client.get("/api/v1/users/me", headers=_bearer(tok("https://good.example")))
    assert ok.status_code == 200
    absent = await client.get("/api/v1/users/me", headers=_bearer(tok(None)))
    assert absent.status_code == 200  # no azp claim -> not rejected
    bad = await client.get("/api/v1/users/me", headers=_bearer(tok("https://evil.example")))
    assert bad.status_code == 401


async def test_dev_bypass_header(client, use_settings, test_user):
    use_settings(auth_dev_bypass=True)
    ok = await client.get("/api/v1/users/me", headers={"X-Debug-User-Id": str(test_user.id)})
    assert ok.status_code == 200
    missing = await client.get("/api/v1/users/me")
    assert missing.status_code == 401


# --- /users/me --------------------------------------------------------------


async def test_patch_me_display_name(client, use_settings, test_user):
    use_settings(auth_dev_bypass=True)
    r = await client.patch(
        "/api/v1/users/me",
        json={"display_name": "Nuevo Nombre"},
        headers={"X-Debug-User-Id": str(test_user.id)},
    )
    assert r.status_code == 200
    assert r.json()["display_name"] == "Nuevo Nombre"


async def test_notification_settings_get_and_patch(client, use_settings, test_user):
    use_settings(auth_dev_bypass=True)
    h = {"X-Debug-User-Id": str(test_user.id)}
    got = await client.get("/api/v1/users/me/notification-settings", headers=h)
    assert got.status_code == 200
    assert got.json() == {"enabled": True, "frequency": "daily"}
    patched = await client.patch(
        "/api/v1/users/me/notification-settings", json={"enabled": False}, headers=h
    )
    assert patched.json()["enabled"] is False


# --- push tokens (logout) ---------------------------------------------------


async def test_push_token_register_then_deactivate_on_logout(client, use_settings, test_user):
    use_settings(auth_dev_bypass=True)
    h = {"X-Debug-User-Id": str(test_user.id)}
    token = f"ExponentPushToken[{uuid4()}]"
    created = await client.post(
        "/api/v1/users/me/push-tokens",
        json={"expo_push_token": token, "device_id": "dev1", "platform": "ios"},
        headers=h,
    )
    assert created.status_code == 201
    assert created.json()["is_active"] is True

    gone = await client.delete(f"/api/v1/users/me/push-tokens/{token}", headers=h)
    assert gone.status_code == 204

    async with async_session_factory() as session:
        row = (
            await session.exec(select(PushToken).where(PushToken.expo_push_token == token))
        ).first()
    assert row is not None and row.is_active is False

    # idempotent
    again = await client.delete(f"/api/v1/users/me/push-tokens/{token}", headers=h)
    assert again.status_code == 204


async def test_cannot_deactivate_another_users_token(client, use_settings, test_user):
    use_settings(auth_dev_bypass=True)
    token = f"ExponentPushToken[{uuid4()}]"
    async with async_session_factory() as session:
        other = User(clerk_user_id=f"clerk_test_{uuid4()}", email="o@example.com", display_name="o")
        session.add(other)
        await session.commit()
        await service.upsert_push_token(session, other.id, token, "devX", "android")
        other_id = other.id
    try:
        r = await client.delete(
            f"/api/v1/users/me/push-tokens/{token}",
            headers={"X-Debug-User-Id": str(test_user.id)},
        )
        assert r.status_code == 204
        async with async_session_factory() as session:
            row = (
                await session.exec(select(PushToken).where(PushToken.expo_push_token == token))
            ).first()
        assert row is not None and row.is_active is True
    finally:
        async with async_session_factory() as session:
            await session.exec(delete(User).where(User.id == other_id))
            await session.commit()


# --- Clerk webhook ----------------------------------------------------------


def _event(kind: str, clerk_id: str, first: str = "Wh") -> dict:
    return {
        "type": kind,
        "data": {
            "id": clerk_id,
            "first_name": first,
            "last_name": "Hook",
            "primary_email_address_id": "e1",
            "email_addresses": [{"id": "e1", "email_address": f"{first.lower()}@example.com"}],
        },
    }


async def test_webhook_created_updated_deleted(client, use_settings):
    use_settings()
    clerk_id = f"clerk_test_{uuid4()}"

    r = await client.post("/api/v1/webhooks/clerk", json=_event("user.created", clerk_id))
    assert r.status_code == 204
    async with async_session_factory() as session:
        user = await service.get_user_by_clerk_id(session, clerk_id)
    assert user is not None and user.display_name == "Wh Hook"

    # user.updated updates email but keeps the locally edited display_name
    async with async_session_factory() as session:
        u = await service.get_user_by_clerk_id(session, clerk_id)
        await service.update_display_name(session, u, "Editado")
    await client.post("/api/v1/webhooks/clerk", json=_event("user.updated", clerk_id, "Changed"))
    async with async_session_factory() as session:
        user = await service.get_user_by_clerk_id(session, clerk_id)
    assert user.display_name == "Editado"
    assert user.email == "changed@example.com"

    await client.post("/api/v1/webhooks/clerk", json=_event("user.deleted", clerk_id))
    async with async_session_factory() as session:
        assert await service.get_user_by_clerk_id(session, clerk_id) is None


async def test_webhook_without_secret_outside_dev_is_503(client, use_settings):
    use_settings(environment="production")
    r = await client.post("/api/v1/webhooks/clerk", json=_event("user.created", "x"))
    assert r.status_code == 503


async def test_webhook_bad_signature_is_400(client, use_settings):
    # Random on every run, so no secret-looking literal lives in the repo.
    fake_secret = "whsec_" + base64.b64encode(secrets.token_bytes(24)).decode()
    use_settings(clerk_webhook_secret=fake_secret)
    r = await client.post("/api/v1/webhooks/clerk", json=_event("user.created", "x"))
    assert r.status_code == 400
