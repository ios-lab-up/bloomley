"""Schemas for the Home ("Hoy") screen and onboarding."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

from app.missions.schemas import MissionRead
from app.wellness.schemas import CheckinRead, EnergyLevel, Pillar, WellnessAreaRead


class WeekDay(BaseModel):
    date: date
    active: bool
    is_today: bool


class HomeStreak(BaseModel):
    current: int
    longest: int
    # "A 4 días de tu récord": longest - current, never negative.
    days_to_record: int
    week: list[WeekDay]  # Monday..Sunday of the user's current week


class HomeProgress(BaseModel):
    xp_total: int
    level: int
    xp_into_level: int
    xp_to_next_level: int


class TodayMission(BaseModel):
    mission: MissionRead


class HomeToday(BaseModel):
    display_name: str
    energy_today: EnergyLevel | None  # today's check-in; null = ask "¿Cómo está tu energía hoy?"
    mission: TodayMission | None  # null when every candidate is already done today
    upcoming: list[MissionRead]  # "Próximas actividades"
    streak: HomeStreak
    progress: HomeProgress


class OnboardingRequest(BaseModel):
    """What the user chose before creating an account (screens 03-05)."""

    pillars: list[Pillar] = Field(min_length=1)
    # Preset chip key ("move_more") or free text ("Caminar con mi perro cada tarde").
    intention: str | None = Field(default=None, max_length=500)
    energy_level: EnergyLevel = "medium"


class OnboardingRead(BaseModel):
    # False when the account already had areas: nothing was overwritten
    # (a returning user signing in on a new device).
    applied: bool
    areas: list[WellnessAreaRead]
    checkin: CheckinRead | None
    first_mission: MissionRead | None  # screen 06: "Camina 10 minutos · +10 XP"
    user_id: UUID
