"""notifications inbox, achievements, reminder time

Revision ID: f2b6d8a4c1e7
Revises: e5a1c7d9b3f2
Create Date: 2026-11-23

- `notifications`: in-app inbox + push state (see app/notifications/models.py).
- `achievements` (seeded catalogue) and `user_achievements`.
- `notification_settings.reminder_time`: local time of the daily reminder.

Every FK to `users` is ON DELETE CASCADE (the Clerk `user.deleted` webhook
hard-deletes the row), and `user_achievements.achievement_id` cascades too so
retiring an achievement doesn't need a manual cleanup.
"""

from collections.abc import Sequence
from uuid import UUID, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "f2b6d8a4c1e7"
down_revision: str | None = "e5a1c7d9b3f2"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_NS = UUID("8538a4a2-2f8b-4b8e-9d3a-7f6e5d4c3b2a")

# key, title, description, rule_type, threshold
_ACHIEVEMENTS: list[tuple[str, str, str, str, int]] = [
    ("first_step", "Primer paso", "Completaste tu primera misión.", "missions_completed", 1),
    ("ten_steps", "Pasito a pasito", "Completaste 10 misiones.", "missions_completed", 10),
    ("fifty_steps", "Constante de verdad", "Completaste 50 misiones.", "missions_completed", 50),
    ("streak_3", "Tres días seguidos", "Racha de 3 días.", "streak_days", 3),
    ("streak_7", "Una semana entera", "Racha de 7 días.", "streak_days", 7),
    ("streak_30", "Un mes floreciendo", "Racha de 30 días.", "streak_days", 30),
    ("level_2", "Nivel 2", "Subiste al nivel 2.", "level", 2),
    ("level_5", "Nivel 5", "Subiste al nivel 5.", "level", 5),
    ("explorer", "Explorador", "Completaste misiones de 3 áreas distintas.", "areas_tried", 3),
    ("full_garden", "Jardín completo", "Completaste misiones de las 5 áreas.", "areas_tried", 5),
]


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("dedupe_key", sa.String(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("push_status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "dedupe_key", name="uq_notifications_user_dedupe"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_push_status", "notifications", ["push_status"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])

    op.create_table(
        "achievements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("rule_type", sa.String(), nullable=False),
        sa.Column("threshold", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_achievements_key", "achievements", ["key"], unique=True)

    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "achievement_id",
            sa.Uuid(),
            sa.ForeignKey("achievements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("unlocked_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievements_user_achievement"),
    )
    op.create_index("ix_user_achievements_user_id", "user_achievements", ["user_id"])
    op.create_index("ix_user_achievements_achievement_id", "user_achievements", ["achievement_id"])

    op.add_column(
        "notification_settings",
        sa.Column("reminder_time", sa.Time(), nullable=False, server_default="09:00:00"),
    )

    table = sa.table(
        "achievements",
        sa.column("id", sa.Uuid()),
        sa.column("key", sa.String()),
        sa.column("title", sa.String()),
        sa.column("description", sa.String()),
        sa.column("rule_type", sa.String()),
        sa.column("threshold", sa.Integer()),
        sa.column("sort_order", sa.Integer()),
    )
    op.bulk_insert(
        table,
        [
            {
                "id": uuid5(_NS, f"achievement:{key}"),
                "key": key,
                "title": title,
                "description": description,
                "rule_type": rule,
                "threshold": threshold,
                "sort_order": index,
            }
            for index, (key, title, description, rule, threshold) in enumerate(_ACHIEVEMENTS)
        ],
    )


def downgrade() -> None:
    op.drop_column("notification_settings", "reminder_time")
    op.drop_table("user_achievements")
    op.drop_table("achievements")
    op.drop_table("notifications")
