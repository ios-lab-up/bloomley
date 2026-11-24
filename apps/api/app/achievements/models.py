"""Tables owned by the Achievements domain.

`achievements` is a catalogue seeded by migration (like missions); each row is
a rule: when the user's metric named by `rule_type` reaches `threshold`, the
achievement unlocks. `user_achievements` records who unlocked what, once.

rule_type: missions_completed | streak_days | level | areas_tried
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Achievement(SQLModel, table=True):
    __tablename__ = "achievements"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    key: str = Field(unique=True, index=True)
    title: str
    description: str
    rule_type: str
    threshold: int
    sort_order: int = Field(default=0)


class UserAchievement(SQLModel, table=True):
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievements_user_achievement"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    achievement_id: UUID = Field(foreign_key="achievements.id", ondelete="CASCADE", index=True)
    unlocked_at: datetime = Field(default_factory=datetime.utcnow)
