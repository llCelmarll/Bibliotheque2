"""add_reports_table

Revision ID: b4c5d6e7f8a9
Revises: f1a2b3c4d5e6
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reporter_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('target_type', sa.String(), nullable=False, index=True),
        sa.Column('target_id', sa.Integer(), nullable=False, index=True),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending', index=True),
        sa.Column('moderator_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('moderator_note', sa.String(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('reports')
