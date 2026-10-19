"""Request/response schemas for the Missions domain (Módulo 2)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class MissionRead(BaseModel):
    id: UUID
    wellness_area_id: UUID
    title: str
    description: str
    duration_minutes: int
    xp_reward: int

    model_config = {"from_attributes": True}


class MissionCompleteRequest(BaseModel):
    engaged_minutes: int = Field(ge=0, le=2880)
    group_id: UUID | None = None


class MissionCompletionRead(BaseModel):
    id: UUID
    mission_id: UUID
    group_id: UUID | None
    engaged_minutes: int
    xp_earned: int
    criteria_met: bool
    completed_at: datetime
    mission: MissionRead


class BloomFeedbackRead(BaseModel):
    id: UUID
    mission_completion_id: UUID
    message: str
    feedback_type: Literal["congrats", "encouragement"]
    created_at: datetime

    model_config = {"from_attributes": True}