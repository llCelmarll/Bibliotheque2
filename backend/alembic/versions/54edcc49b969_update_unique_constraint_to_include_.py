"""update_unique_constraint_to_include_owner_id

Revision ID: 54edcc49b969
Revises: 74b591580c4e
Create Date: 2025-10-28 11:24:03.002901

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '54edcc49b969'
down_revision: Union[str, Sequence[str], None] = '74b591580c4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Utiliser le mode batch pour SQLite
    with op.batch_alter_table('books', schema=None) as batch_op:
        # Supprimer l'ancienne contrainte d'unicité
        batch_op.drop_constraint('uq_title_isbn', type_='unique')
        
        # Créer la nouvelle contrainte d'unicité incluant owner_id
        batch_op.create_unique_constraint('uq_title_isbn_owner', ['title', 'isbn', 'owner_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Utiliser le mode batch pour SQLite
    with op.batch_alter_table('books', schema=None) as batch_op:
        # Supprimer la nouvelle contrainte
        batch_op.drop_constraint('uq_title_isbn_owner', type_='unique')
        
        # Restaurer l'ancienne contrainte
        batch_op.create_unique_constraint('uq_title_isbn', ['title', 'isbn'])
