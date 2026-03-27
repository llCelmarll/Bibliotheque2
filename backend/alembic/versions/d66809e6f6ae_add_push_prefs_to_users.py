"""add_push_prefs_to_users

Revision ID: d66809e6f6ae
Revises: c4d5e6f7a8b9
Create Date: 2026-03-27 11:33:13.199464

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd66809e6f6ae'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('push_prefs', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'push_prefs')
