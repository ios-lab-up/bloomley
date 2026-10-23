"""add users clerk_updated_at

Revision ID: b49cb37196af
Revises: af3d640f430a
Create Date: 2026-10-22

Adds `users.clerk_updated_at`: Clerk's `updated_at` (epoch milliseconds) of
the profile last synced into the row. The sync compares it against each
incoming event so that late webhook retries can't overwrite newer data or
take a username back from its current owner (see
`app.users.service._upsert_user_from_clerk_data`). Existing rows start NULL,
which counts as older than any event.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b49cb37196af"
down_revision: Union[str, Sequence[str], None] = "af3d640f430a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("clerk_updated_at", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "clerk_updated_at")
