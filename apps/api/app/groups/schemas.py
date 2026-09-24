"""Pydantic request/response schemas for the Groups domain."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class GroupJoinRequest(BaseModel):
    invite_code: str = Field(min_length=1, max_length=32)


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    invite_code: str
    created_by: UUID | None
    created_at: datetime


class GroupStreakRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    current_streak: int
    longest_streak: int
    last_active_date: date | None


class GroupDetailRead(GroupRead):
    member_count: int
    streak: GroupStreakRead


class GroupMemberRead(BaseModel):
    membership_id: UUID
    user_id: UUID
    display_name: str
    email: str
    joined_at: datetime
