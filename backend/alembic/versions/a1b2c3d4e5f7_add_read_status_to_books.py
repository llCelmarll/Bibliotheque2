"""add_read_status_to_books

Revision ID: a1b2c3d4e5f7
Revises: c1d2e3f4a5b6
Create Date: 2026-02-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajouter les champs de statut de lecture aux livres."""
    op.add_column('books', sa.Column('is_read', sa.Boolean(), nullable=True))
    op.add_column('books', sa.Column('read_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Retirer les champs de statut de lecture."""
    op.drop_column('books', 'read_date')
    op.drop_column('books', 'is_read')
