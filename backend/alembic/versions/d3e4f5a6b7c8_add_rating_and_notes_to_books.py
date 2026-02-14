"""add_rating_and_notes_to_books

Revision ID: d3e4f5a6b7c8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajouter les champs rating et notes aux livres."""
    op.add_column('books', sa.Column('rating', sa.Integer(), nullable=True))
    op.add_column('books', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    """Retirer les champs rating et notes."""
    op.drop_column('books', 'notes')
    op.drop_column('books', 'rating')
