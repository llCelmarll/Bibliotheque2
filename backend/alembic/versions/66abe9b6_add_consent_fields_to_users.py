"""add consent fields to users

Revision ID: 66abe9b6
Revises: e8f9a0b1c2d3
Create Date: 2026-07-03

"""
from alembic import op
import sqlalchemy as sa

revision = '66abe9b6'
down_revision = 'e8f9a0b1c2d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('consent_version', sa.String(), nullable=True))
    op.add_column('users', sa.Column('consent_accepted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'consent_accepted_at')
    op.drop_column('users', 'consent_version')
