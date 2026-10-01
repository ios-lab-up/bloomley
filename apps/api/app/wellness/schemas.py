"""Request/response schemas for the Wellness domain (Módulo 2)."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class WellnessAreaRead(BaseModel):
    id: UUID
    name: str
    description: str

    model_config = {"from_attributes": True}


class CheckinCreate(BaseModel):
    energy_level: Literal["low", "medium", "high"]
    intention: str | None = Field(default=None, max_length=500)


class CheckinRead(BaseModel):
    id: UUID
    energy_level: str
    intention: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StreakRead(BaseModel):
    current_streak: int
    longest_streak: int
    last_active_date: date | None

    model_config = {"from_attributes": True}