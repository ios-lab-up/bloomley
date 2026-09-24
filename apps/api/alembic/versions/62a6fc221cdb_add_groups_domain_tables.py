"""add groups domain tables

Revision ID: 62a6fc221cdb
Revises: 3695e1c6917d
Create Date: 2026-09-21

Chains off `3695e1c6917d` (users auth tables), which owns `users.id` —
the FK target for `groups.created_by` and `group_memberships.user_id`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "62a6fc221cdb"
down_revision: Union[str, Sequence[str], None] = "3695e1c6917d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("invite_code", sa.String(), nullable=False),
        sa.Column(
            "created_by",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_groups_invite_code", "groups", ["invite_code"], unique=True)
    op.create_index("ix_groups_created_by", "groups", ["created_by"])

    op.create_table(
        "group_memberships",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "group_id",
            sa.Uuid(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_memberships_group_user"),
    )
    op.create_index("ix_group_memberships_group_id", "group_memberships", ["group_id"])
    op.create_index("ix_group_memberships_user_id", "group_memberships", ["user_id"])

    op.create_table(
        "group_streaks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "group_id",
            sa.Uuid(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("current_streak", sa.Integer(), nullable=False),
        sa.Column("longest_streak", sa.Integer(), nullable=False),
        sa.Column("last_active_date", sa.Date(), nullable=True),
    )
    op.create_index("ix_group_streaks_group_id", "group_streaks", ["group_id"], unique=True)


def downgrade() -> None:
    op.drop_table("group_streaks")
    op.drop_table("group_memberships")
    op.drop_table("groups")
