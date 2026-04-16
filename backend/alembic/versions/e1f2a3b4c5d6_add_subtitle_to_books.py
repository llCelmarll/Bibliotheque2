"""add_subtitle_to_books

Revision ID: e1f2a3b4c5d6
Revises: d66809e6f6ae
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd66809e6f6ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('books', sa.Column('subtitle', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('books', 'subtitle')
