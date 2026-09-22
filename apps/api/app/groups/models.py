"""SQLModel tables for the Groups domain (GROUPS, GROUP_MEMBERSHIPS, GROUP_STREAKS).

FKs to `users.id` are declared as string table references (not a `User` import)
so this module has no import-time dependency on `app.users` and can be
migrated/tested independently of it.
"""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Group(SQLModel, table=True):
    __tablename__ = "groups"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    invite_code: str = Field(unique=True, index=True)
    created_by: UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GroupMembership(SQLModel, table=True):
    __tablename__ = "group_memberships"
    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_memberships_group_user"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    group_id: UUID = Field(foreign_key="groups.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class GroupStreak(SQLModel, table=True):
    __tablename__ = "group_streaks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    group_id: UUID = Field(foreign_key="groups.id", unique=True, index=True)
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_active_date: date | None = Field(default=None)
