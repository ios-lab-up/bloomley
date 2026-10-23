"""Tables owned by the Users & Auth module.

Any other module that needs to reference a user does so via `User.id`
(the internal uuid), never via `clerk_user_id`.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    clerk_user_id: str = Field(unique=True, index=True)
    # Mirrors the Clerk username (synced, never edited through our API).
    # NULL for users who haven't set one in Clerk yet.
    username: str | None = Field(default=None, unique=True, index=True)
    # Clerk's `updated_at` (epoch ms) of the profile last synced into this
    # row; the sync uses it to ignore late, out-of-order webhook deliveries.
    clerk_updated_at: int | None = Field(default=None, sa_type=BigInteger)
    email: str
    display_name: str
    xp_total: int = Field(default=0)
    level: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationSettings(SQLModel, table=True):
    __tablename__ = "notification_settings"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", unique=True, index=True)
    enabled: bool = Field(default=True)
    frequency: str = Field(default="daily")


class PushToken(SQLModel, table=True):
    __tablename__ = "push_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    expo_push_token: str = Field(unique=True, index=True)
    device_id: str
    platform: str
    is_active: bool = Field(default=True)
    last_used_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
