"""add_whitelist_entries_table

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import os
from datetime import datetime

revision: str = 'd6e7f8a9b0c1'
down_revision: Union[str, None] = 'c5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    whitelist_table = op.create_table(
        'whitelist_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('added_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('added_at', sa.DateTime(), nullable=False),
    )
    op.create_unique_constraint('uq_whitelist_email', 'whitelist_entries', ['email'])

    # Seed depuis ALLOWED_EMAILS si défini
    env_emails = os.getenv("ALLOWED_EMAILS", "")
    if env_emails.strip():
        emails = [e.strip().lower() for e in env_emails.split(",") if e.strip()]
        now = datetime.utcnow()
        op.bulk_insert(whitelist_table, [{"email": email, "added_by_id": None, "added_at": now} for email in emails])
        print(f"  Whitelist seed : {len(emails)} email(s) importés depuis ALLOWED_EMAILS")


def downgrade() -> None:
    op.drop_constraint('uq_whitelist_email', 'whitelist_entries', type_='unique')
    op.drop_table('whitelist_entries')
