"""Schemas for the Notifications domain."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    data: dict
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCount(BaseModel):
    unread: int  # > 0 shows the dot on the bell
