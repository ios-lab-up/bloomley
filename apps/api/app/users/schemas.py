"""Request/response schemas for the Users & Auth module."""

from datetime import datetime, time
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, computed_field, field_validator

from app.users.service import XP_PER_LEVEL


class UserRead(BaseModel):
    id: UUID
    username: str | None
    email: str
    display_name: str
    avatar_url: str | None
    timezone: str
    xp_total: int
    level: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @computed_field  # XP already earned inside the current level (progress bar).
    @property
    def xp_into_level(self) -> int:
        return self.xp_total % XP_PER_LEVEL

    @computed_field
    @property
    def xp_to_next_level(self) -> int:
        return XP_PER_LEVEL - self.xp_total % XP_PER_LEVEL


class UserUpdate(BaseModel):
    display_name: str | None = None
    timezone: str | None = None  # IANA name, e.g. "America/Mexico_City"

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Unknown IANA timezone") from exc
        return value


class NotificationSettingsRead(BaseModel):
    enabled: bool
    frequency: str
    reminder_time: time

    model_config = {"from_attributes": True}


class NotificationSettingsUpdate(BaseModel):
    enabled: bool | None = None
    frequency: Literal["daily", "weekdays", "weekly"] | None = None
    reminder_time: time | None = None


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
