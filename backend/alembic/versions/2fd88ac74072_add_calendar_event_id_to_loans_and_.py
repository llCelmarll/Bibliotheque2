"""add_calendar_event_id_to_loans_and_borrowed_books

Revision ID: 2fd88ac74072
Revises: 774653556c67
Create Date: 2026-01-15 14:07:14.079639

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fd88ac74072'
down_revision: Union[str, Sequence[str], None] = '774653556c67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add calendar_event_id column to loans table
    op.add_column('loans', sa.Column('calendar_event_id', sa.String(), nullable=True))

    # Add calendar_event_id column to borrowed_books table
    op.add_column('borrowed_books', sa.Column('calendar_event_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove calendar_event_id column from borrowed_books table
    op.drop_column('borrowed_books', 'calendar_event_id')

    # Remove calendar_event_id column from loans table
    op.drop_column('loans', 'calendar_event_id')
