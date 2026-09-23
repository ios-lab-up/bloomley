"""Routes owned by the Users & Auth module.

Mounted in app.main under /api/v1 (see app/main.py):
    /api/v1/users/...
    /api/v1/webhooks/clerk
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel.ext.asyncio.session import AsyncSession
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.users import service
from app.users.deps import get_current_user
from app.users.models import User
from app.users.schemas import (
    NotificationSettingsRead,
    NotificationSettingsUpdate,
    PushTokenCreate,
    PushTokenRead,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])
webhook_router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("/me", response_model=UserRead)
async def read_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    if payload.display_name is not None:
        user = await service.update_display_name(session, user, payload.display_name)
    return user


@router.patch("/me/notification-settings", response_model=NotificationSettingsRead)
async def update_notification_settings(
    payload: NotificationSettingsUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await service.update_notification_settings(
        session, user.id, payload.enabled, payload.frequency
    )


@router.post(
    "/me/push-tokens",
    response_model=PushTokenRead,
    status_code=status.HTTP_201_CREATED,
)
async def register_push_token(
    payload: PushTokenCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await service.upsert_push_token(
        session,
        user_id=user.id,
        expo_push_token=payload.expo_push_token,
        device_id=payload.device_id,
        platform=payload.platform,
    )


@webhook_router.post("/clerk", status_code=status.HTTP_204_NO_CONTENT)
async def clerk_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> None:
    body = await request.body()

    if settings.clerk_webhook_secret:
        try:
            wh = Webhook(settings.clerk_webhook_secret)
            event = wh.verify(body, dict(request.headers))
        except WebhookVerificationError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature") from exc
    else:
        # No secret configured yet (local dev before Clerk is set up) --
        # accept unverified so the sync logic can still be exercised.
        event = await request.json()

    await service.sync_user_from_clerk_event(session, event)
