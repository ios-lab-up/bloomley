"""Tables owned by the Notifications domain.

`notifications` is the in-app inbox (the bell). Every notification lands there;
whether it also goes out as a push depends on the user's settings and active
tokens, tracked in `push_status`:

    pending -> sent | skipped (opted out / no device) | failed (gave up)

`dedupe_key` + the unique constraint make "create this notification once"
race-safe (one daily reminder per user per day, one unlock per achievement),
even with several API replicas running the worker.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_notifications_user_dedupe"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    type: str  # daily_reminder | achievement_unlocked | ...
    title: str
    body: str
    data: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    dedupe_key: str | None = None
    read_at: datetime | None = None
    push_status: str = Field(default="pending", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
