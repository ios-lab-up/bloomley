"""Owner-only group management: rename, add a member by username, remove one.

Requests go through the real app (ASGITransport) with `get_current_user`
overridden to read an `X-Test-User` header, so no Clerk keys are needed.
"""

from uuid import UUID, uuid4

import httpx
import pytest_asyncio
from fastapi import Depends, Header
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import async_session_factory, get_session
from app.main import app
from app.users.deps import get_current_user
from app.users.models import User


async def _user_from_header(
    x_test_user: UUID = Header(), session: AsyncSession = Depends(get_session)
) -> User:
    user = await session.get(User, x_test_user)
    assert user is not None
    return user


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides[get_current_user] = _user_from_header
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1"
    ) as client:
        yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture
async def users():
    """owner, member, outsider and a fourth user to add; deleted afterwards
    (their groups go with them through the user-deletion listener)."""
    created = []
    async with async_session_factory() as session:
        for role in ("owner", "member", "outsider", "target"):
            suffix = uuid4().hex[:10]
            user = User(
                clerk_user_id=f"clerk_test_{suffix}",
                username=f"{role}_{suffix}",
                email=f"{role}@example.com",
                display_name=role.title(),
            )
            session.add(user)
            created.append(user)
        await session.commit()
        for user in created:
            await session.refresh(user)

    yield dict(zip(("owner", "member", "outsider", "target"), created))

    async with async_session_factory() as session:
        for user in created:
            # ORM delete, so the groups listener runs as it does for user.deleted.
            row = await session.get(User, user.id)
            if row is not None:
                await session.delete(row)
        await session.commit()


def _as(user: User) -> dict[str, str]:
    return {"X-Test-User": str(user.id)}


@pytest_asyncio.fixture
async def group(client, users):
    """A group owned by `owner` with `member` joined by invite code."""
    response = await client.post("/groups", json={"name": "Original"}, headers=_as(users["owner"]))
    assert response.status_code == 201
    group = response.json()
    response = await client.post(
        "/groups/join", json={"invite_code": group["invite_code"]}, headers=_as(users["member"])
    )
    assert response.status_code == 200
    return group


async def _member_usernames(client, group_id: str, viewer: User) -> list[str | None]:
    response = await client.get(f"/groups/{group_id}/members", headers=_as(viewer))
    assert response.status_code == 200
    return [member["username"] for member in response.json()]


# --- rename -----------------------------------------------------------------


async def test_owner_can_rename(client, users, group):
    response = await client.patch(
        f"/groups/{group['id']}", json={"name": "  Renamed  "}, headers=_as(users["owner"])
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"


async def test_rename_is_owner_only_and_hidden_from_outsiders(client, users, group):
    url = f"/groups/{group['id']}"

    async def rename_as(role: str, name: str) -> int:
        return (await client.patch(url, json={"name": name}, headers=_as(users[role]))).status_code

    assert await rename_as("member", "x") == 403
    assert await rename_as("outsider", "x") == 404
    assert await rename_as("owner", "   ") == 422


# --- add by username --------------------------------------------------------


async def test_owner_adds_member_by_username(client, users, group):
    target = users["target"]
    response = await client.post(
        f"/groups/{group['id']}/members",
        json={"username": f"  {target.username.upper()} "},
        headers=_as(users["owner"]),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == str(target.id)
    assert body["username"] == target.username
    assert target.username in await _member_usernames(client, group["id"], users["owner"])


async def test_add_member_errors(client, users, group):
    url = f"/groups/{group['id']}/members"
    owner, member = _as(users["owner"]), _as(users["member"])

    response = await client.post(url, json={"username": "nobody_has_this_name"}, headers=owner)
    assert response.status_code == 404
    response = await client.post(url, json={"username": users["member"].username}, headers=owner)
    assert response.status_code == 409
    response = await client.post(url, json={"username": users["target"].username}, headers=member)
    assert response.status_code == 403
    response = await client.post(
        url, json={"username": users["target"].username}, headers=_as(users["outsider"])
    )
    assert response.status_code == 404


# --- remove -----------------------------------------------------------------


async def test_owner_removes_member(client, users, group):
    member = users["member"]
    response = await client.delete(
        f"/groups/{group['id']}/members/{member.id}", headers=_as(users["owner"])
    )
    assert response.status_code == 204
    assert member.username not in await _member_usernames(client, group["id"], users["owner"])
    # The removed user can't see the group any more.
    assert (await client.get(f"/groups/{group['id']}", headers=_as(member))).status_code == 404


async def test_remove_member_errors(client, users, group):
    base = f"/groups/{group['id']}/members"
    owner = users["owner"]

    assert (await client.delete(f"{base}/{owner.id}", headers=_as(owner))).status_code == 400
    assert (
        await client.delete(f"{base}/{users['outsider'].id}", headers=_as(owner))
    ).status_code == 404
    assert (
        await client.delete(f"{base}/{owner.id}", headers=_as(users["member"]))
    ).status_code == 403
    # `/members/me` still means "leave", not "remove the member with id 'me'".
    assert (await client.delete(f"{base}/me", headers=_as(users["member"]))).status_code == 204


# --- delete (refactored onto the shared owner check) ------------------------


async def test_delete_group_is_still_owner_only(client, users, group):
    url = f"/groups/{group['id']}"
    assert (await client.delete(url, headers=_as(users["member"]))).status_code == 403
    assert (await client.delete(url, headers=_as(users["owner"]))).status_code == 204
