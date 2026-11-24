"""merge users username and wellness heads

Revision ID: af3d640f430a
Revises: 7770a29fa295, d7e9f0a2b3c4
Create Date: 2026-10-22

#25 (`7770a29fa295`, users.username) and #11 (`7e2fa1b3c9d5` ->
`d7e9f0a2b3c4`, wellness & missions) both chained off `62a6fc221cdb`, which
left two heads and made `alembic upgrade head` refuse to run. This revision
only joins them; the two branches touch unrelated tables, so their order
doesn't matter.
"""
from typing import Sequence, Union


revision: str = "af3d640f430a"
down_revision: Union[str, Sequence[str], None] = ("7770a29fa295", "d7e9f0a2b3c4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
