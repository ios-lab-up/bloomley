"""Auth dependency shared by every module.

    from app.users.deps import get_current_user
    from app.users.models import User

    @router.post("/missions/{id}/complete")
    async def complete_mission(id: UUID, user: User = Depends(get_current_user)):
        ...  # user.id is the FK you store

Do not re-implement Clerk verification in other routers — import this.
"""

from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.users import service
from app.users.models import User

_jwk_client: PyJWKClient | None = None


def _get_jwk_client(settings: Settings) -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwk_client


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_debug_user_id: str | None = Header(default=None, alias="X-Debug-User-Id"),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    if settings.auth_dev_bypass:
        return await _dev_bypass_user(session, x_debug_user_id)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    try:
        signing_key = _get_jwk_client(settings).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject")

    # Just-in-time provisioning: creates the local `users` row on first
    # sight of this clerk_user_id (via the Backend API) instead of relying
    # on the `user.created` webhook having fired first.
    user = await service.get_or_provision_user(session, clerk_user_id, settings)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown Clerk user")
    return user


async def _dev_bypass_user(session: AsyncSession, x_debug_user_id: str | None) -> User:
    if not x_debug_user_id:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "AUTH_DEV_BYPASS is on: send an X-Debug-User-Id header with a valid users.id",
        )
    try:
        user_id = UUID(x_debug_user_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-Debug-User-Id must be a uuid") from exc

    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown debug user id")
    return user
