"""add mission completion daily uniqueness

Revision ID: d7e9f0a2b3c4
Revises: c4d6e8f0a1b2
Create Date: 2026-09-25

Adds `completed_on` (the UTC calendar day) to `mission_completions` and a
unique constraint on (user_id, mission_id, completed_on): a mission can be
completed/rewarded at most once per user per UTC day. This makes a double-tap
on "complete" idempotent — no duplicate completion rows and no duplicated XP
(review 2026-09-25: @duchagoya-lgtm / @luisced).

Existing rows are backfilled from `completed_at`; where duplicates already
exist for the same (user, mission, day), only the latest completion survives
(its bloom_feedback rows cascade-delete with it).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d7e9f0a2b3c4"
down_revision: str | None = "c4d6e8f0a1b2"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mission_completions",
        sa.Column("completed_on", sa.Date(), nullable=True),
    )
    op.execute(
        "UPDATE mission_completions SET completed_on = completed_at::date "
        "WHERE completed_on IS NULL"
    )
    # Dedupe before adding the unique constraint: keep only the latest
    # completion per (user, mission, day).
    op.execute(
        """
        DELETE FROM mission_completions mc
        USING mission_completions dup
        WHERE dup.user_id = mc.user_id
          AND dup.mission_id = mc.mission_id
          AND dup.completed_on = mc.completed_on
          AND (dup.completed_at, dup.id) > (mc.completed_at, mc.id)
        """
    )
    op.alter_column("mission_completions", "completed_on", nullable=False)
    op.create_unique_constraint(
        "uq_mission_completions_user_mission_day",
        "mission_completions",
        ["user_id", "mission_id", "completed_on"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_mission_completions_user_mission_day",
        "mission_completions",
        type_="unique",
    )
    op.drop_column("mission_completions", "completed_on")