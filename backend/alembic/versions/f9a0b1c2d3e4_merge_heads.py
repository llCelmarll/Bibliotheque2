"""merge heads

Revision ID: f9a0b1c2d3e4
Revises: e7f8a9b0c1d2, e8f9a0b1c2d3
Create Date: 2026-06-26 19:00:00.000000

"""
from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f9a0b1c2d3e4'
down_revision: Union[str, tuple] = ('e7f8a9b0c1d2', 'e8f9a0b1c2d3')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
