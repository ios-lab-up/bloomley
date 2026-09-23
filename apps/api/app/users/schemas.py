"""Request/response schemas for the Users & Auth module."""

from uuid import UUID

from pydantic import BaseModel


class UserRead(BaseModel):
    id: UUID
    email: str
    display_name: str
    xp_total: int
    level: int

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = None


class NotificationSettingsRead(BaseModel):
    enabled: bool
    frequency: str

    model_config = {"from_attributes": True}


class NotificationSettingsUpdate(BaseModel):
    enabled: bool | None = None
    frequency: str | None = None


class PushTokenCreate(BaseModel):
    expo_push_token: str
    device_id: str
    platform: str  # "ios" | "android"


class PushTokenRead(BaseModel):
    id: UUID
    expo_push_token: str
    platform: str
    is_active: bool

    model_config = {"from_attributes": True}
