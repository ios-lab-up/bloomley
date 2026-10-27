"""add users username

Revision ID: 7770a29fa295
Revises: 62a6fc221cdb
Create Date: 2026-10-15

Adds `users.username`, a unique handle mirrored from the Clerk username
(Clerk is the source of truth; see `app.users.service._username`). It is
nullable: rows that exist before this migration, and users who haven't
set a username in Clerk, stay NULL until their next `user.updated`
webhook. Postgres' unique index allows any number of NULLs.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7770a29fa295"
down_revision: Union[str, Sequence[str], None] = "62a6fc221cdb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(), nullable=True))
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")
