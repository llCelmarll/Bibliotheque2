"""add_rate_limit_attempts_table

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rate_limit_attempts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ip', sa.String(), nullable=False, index=True),
        sa.Column('endpoint', sa.String(), nullable=False, index=True),
        sa.Column('attempted_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('rate_limit_attempts')
