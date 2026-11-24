"""Schemas for the personal progress screen."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.wellness.schemas import Pillar


class ProgressTotals(BaseModel):
    missions_completed: int
    minutes_engaged: int
    active_days: int  # distinct local days with a fully completed mission
    achievements_unlocked: int
    achievements_total: int


class AreaProgress(BaseModel):
    area_id: UUID
    name: str
    pillar: Pillar
    missions_completed: int
    minutes_engaged: int


class WeekProgress(BaseModel):
    week_start: date  # Monday
    missions_completed: int
    xp_earned: int


class ProgressRead(BaseModel):
    level: int
    xp_total: int
    xp_into_level: int
    xp_to_next_level: int
    current_streak: int
    longest_streak: int
    totals: ProgressTotals
    by_area: list[AreaProgress]
    weeks: list[WeekProgress]  # oldest first, the last 8 weeks including this one
