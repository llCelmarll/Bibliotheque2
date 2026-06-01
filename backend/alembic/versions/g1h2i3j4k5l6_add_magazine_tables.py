"""add_magazine_tables

Revision ID: g1h2i3j4k5l6
Revises: f1a2b3c4d5e6
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'magazine_series',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False, index=True),
        sa.Column('publisher', sa.String(), nullable=True),
        sa.Column('periodicity', sa.String(), nullable=True),
        sa.Column('cover_url', sa.String(), nullable=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'magazine_issues',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('series_id', sa.Integer(), sa.ForeignKey('magazine_series.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('issue_number', sa.Integer(), nullable=True, index=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('published_date', sa.String(), nullable=True),
        sa.Column('cover_url', sa.String(), nullable=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('read_date', sa.DateTime(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_lendable', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('series_id', 'issue_number', 'owner_id', name='uq_series_issue_owner'),
    )
    op.create_index('ix_magazine_issues_owner_created', 'magazine_issues', ['owner_id', 'created_at'])

    op.create_table(
        'magazine_loans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('issue_id', sa.Integer(), sa.ForeignKey('magazine_issues.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('contact_id', sa.Integer(), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('loan_date', sa.DateTime(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('return_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('calendar_event_id', sa.String(), nullable=True),
    )
    op.create_index('ix_magazine_loans_issue_status', 'magazine_loans', ['issue_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_magazine_loans_issue_status', table_name='magazine_loans')
    op.drop_table('magazine_loans')
    op.drop_index('ix_magazine_issues_owner_created', table_name='magazine_issues')
    op.drop_table('magazine_issues')
    op.drop_table('magazine_series')
