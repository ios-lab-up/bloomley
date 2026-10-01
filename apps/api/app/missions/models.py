"""Tables owned by the Missions domain (Módulo 2).

MISSIONS (the catalogue, categorized by a wellness_area), MISSION_COMPLETIONS
(the instance a user completes — possibly within a group) and BLOOM_FEEDBACK
(the encouragement/congrats message generated at completion time).

`mission_completions.group_id` is a nullable FK to `groups.id` (SET NULL on
group delete) so a completion can exist both inside and outside a group, and
survives the group being removed.

`mission_completions.completed_on` + the unique constraint on
(user_id, mission_id, completed_on) make completing a mission idempotent per
UTC day: the same mission can only be rewarded once per user per day, so a
double-tap on "complete" cannot duplicate a completion or award XP twice.
"""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Mission(SQLModel, table=True):
    __tablename__ = "missions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    wellness_area_id: UUID = Field(
        foreign_key="wellness_areas.id", ondelete="CASCADE", index=True
    )
    title: str
    description: str
    duration_minutes: int
    xp_reward: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MissionCompletion(SQLModel, table=True):
    __tablename__ = "mission_completions"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "mission_id", "completed_on",
            name="uq_mission_completions_user_mission_day",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    mission_id: UUID = Field(foreign_key="missions.id", ondelete="CASCADE", index=True)
    group_id: UUID | None = Field(
        default=None, foreign_key="groups.id", ondelete="SET NULL", index=True
    )
    engaged_minutes: int = Field(default=0)
    xp_earned: int = Field(default=0)
    criteria_met: bool = Field(default=False)
    completed_on: date = Field(default_factory=lambda: datetime.utcnow().date())
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class BloomFeedback(SQLModel, table=True):
    __tablename__ = "bloom_feedback"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    mission_completion_id: UUID = Field(
        foreign_key="mission_completions.id", ondelete="CASCADE", unique=True, index=True
    )
    message: str
    feedback_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)