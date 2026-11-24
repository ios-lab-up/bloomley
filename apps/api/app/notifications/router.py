"""Inbox routes, mounted under /api/v1/notifications."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.notifications import service
from app.notifications.schemas import NotificationRead, UnreadCount
from app.users.deps import get_current_user
from app.users.models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
async def list_my_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await service.list_notifications(session, user.id, unread_only, limit, offset)


@router.get("/unread-count", response_model=UnreadCount)
async def get_unread_count(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UnreadCount:
    return UnreadCount(unread=await service.unread_count(session, user.id))


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.mark_all_read(session, user.id)


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def read_one(
    notification_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    notification = await service.mark_read(session, user.id, notification_id)
    if notification is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return notification
