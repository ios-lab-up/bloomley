"""Schemas for the Achievements domain."""

from datetime import datetime

from pydantic import BaseModel


class AchievementBrief(BaseModel):
    """Shown in the celebration right after a mission unlocks it."""

    key: str
    title: str
    description: str

    model_config = {"from_attributes": True}


class AchievementRead(AchievementBrief):
    rule_type: str
    threshold: int
    progress: int  # the user's current value for the rule, capped at `threshold`
    unlocked: bool
    unlocked_at: datetime | None
