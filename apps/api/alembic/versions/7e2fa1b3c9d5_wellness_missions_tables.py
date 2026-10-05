"""wellness and missions tables

Revision ID: 7e2fa1b3c9d5
Revises: 62a6fc221cdb
Create Date: 2026-09-23

Creates the tables owned by Módulo 2 (Wellness & Missions):
`wellness_areas`, `user_wellness_areas`, `checkins`, `streaks`, `missions`,
`mission_completions`, `bloom_feedback`.

Chains off the Módulo 3 migration (`62a6fc221cdb`), the current main head, so
the Alembic history stays linear: users -> groups -> wellness/missions.
`mission_completions.group_id` is nullable (a mission can be completed outside
a group) with a FK to `groups.id` (SET NULL on group delete so completion
history survives a group being removed).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7e2fa1b3c9d5"
down_revision: str | None = "62a6fc221cdb"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def _created_at() -> sa.Column:
    return sa.Column(
        "created_at",
        sa.DateTime(),
        nullable=False,
        server_default=sa.func.now(),
    )


def upgrade() -> None:
    op.create_table(
        "wellness_areas",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        _created_at(),
    )
    op.create_index(
        "ix_wellness_areas_name", "wellness_areas", ["name"], unique=True
    )

    op.create_table(
        "user_wellness_areas",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "wellness_area_id",
            sa.Uuid(),
            sa.ForeignKey("wellness_areas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "wellness_area_id", name="uq_user_wellness_areas"),
        _created_at(),
    )
    op.create_index(
        "ix_user_wellness_areas_user_id", "user_wellness_areas", ["user_id"]
    )
    op.create_index(
        "ix_user_wellness_areas_wellness_area_id",
        "user_wellness_areas",
        ["wellness_area_id"],
    )

    op.create_table(
        "checkins",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("energy_level", sa.String(), nullable=False),
        sa.Column("intention", sa.String(), nullable=True),
        _created_at(),
    )
    op.create_index("ix_checkins_user_id", "checkins", ["user_id"])

    op.create_table(
        "streaks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "current_streak", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "longest_streak", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("last_active_date", sa.Date(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_streaks_user_id", "streaks", ["user_id"], unique=True)

    op.create_table(
        "missions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "wellness_area_id",
            sa.Uuid(),
            sa.ForeignKey("wellness_areas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        _created_at(),
    )
    op.create_index("ix_missions_wellness_area_id", "missions", ["wellness_area_id"])

    op.create_table(
        "mission_completions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "mission_id",
            sa.Uuid(),
            sa.ForeignKey("missions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Nullable: a mission can be completed outside a group. FK to the
        # Módulo 3 `groups` table; SET NULL so history survives a group delete.
        sa.Column(
            "group_id",
            sa.Uuid(),
            sa.ForeignKey("groups.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "engaged_minutes", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("xp_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "criteria_met", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_mission_completions_user_id", "mission_completions", ["user_id"]
    )
    op.create_index(
        "ix_mission_completions_mission_id", "mission_completions", ["mission_id"]
    )
    op.create_index(
        "ix_mission_completions_group_id", "mission_completions", ["group_id"]
    )

    op.create_table(
        "bloom_feedback",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "mission_completion_id",
            sa.Uuid(),
            sa.ForeignKey("mission_completions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("feedback_type", sa.String(), nullable=False),
        _created_at(),
    )
    op.create_index("ix_bloom_feedback_user_id", "bloom_feedback", ["user_id"])
    op.create_index(
        "ix_bloom_feedback_mission_completion_id",
        "bloom_feedback",
        ["mission_completion_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("bloom_feedback")
    op.drop_table("mission_completions")
    op.drop_table("missions")
    op.drop_table("streaks")
    op.drop_table("checkins")
    op.drop_table("user_wellness_areas")
    op.drop_table("wellness_areas")