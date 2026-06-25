"""add_waitlist_entries_table

Revision ID: e8f9a0b1c2d3
Revises: d6e7f8a9b0c1
Create Date: 2026-06-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'd6e7f8a9b0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'waitlist_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('referred_by', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_waitlist_entries_email', 'waitlist_entries', ['email'], unique=True)
    op.create_index('ix_waitlist_entries_status', 'waitlist_entries', ['status'])


def downgrade() -> None:
    op.drop_index('ix_waitlist_entries_status', table_name='waitlist_entries')
    op.drop_index('ix_waitlist_entries_email', table_name='waitlist_entries')
    op.drop_table('waitlist_entries')
