"""Tables owned by the Wellness domain (Módulo 2).

Covers the user's personal wellness journey: the wellness areas catalogue
(``wellness_areas``), the user <-> area selections (``user_wellness_areas``),
daily check-ins (``checkins``) and the global streak (``streaks``).

The missions loop lives in ``app/missions/`` (MISSIONS, MISSION_COMPLETIONS,
BLOOM_FEEDBACK). ``streaks`` is intentionally 1:1 with users (one global
streak, not one per wellness_area) — resolved in docs/USERS_AUTH_CONTRACT.md §3.
"""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class WellnessArea(SQLModel, table=True):
    __tablename__ = "wellness_areas"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserWellnessArea(SQLModel, table=True):
    __tablename__ = "user_wellness_areas"
    __table_args__ = (UniqueConstraint("user_id", "wellness_area_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    wellness_area_id: UUID = Field(
        foreign_key="wellness_areas.id", ondelete="CASCADE", index=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Checkin(SQLModel, table=True):
    __tablename__ = "checkins"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    energy_level: str
    intention: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Streak(SQLModel, table=True):
    __tablename__ = "streaks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        foreign_key="users.id", ondelete="CASCADE", unique=True, index=True
    )
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_active_date: date | None = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)