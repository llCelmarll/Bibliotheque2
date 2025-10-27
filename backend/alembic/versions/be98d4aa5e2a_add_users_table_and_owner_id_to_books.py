"""Add users table and owner_id to books

Revision ID: be98d4aa5e2a
Revises: 782be81b9acd
Create Date: 2025-10-27 14:04:08.128165

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be98d4aa5e2a'
down_revision: Union[str, Sequence[str], None] = '782be81b9acd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Créer la table users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_user_email')
    )
    
    # Créer l'index sur email
    op.create_index('ix_users_email', 'users', ['email'])
    
    # Créer un utilisateur par défaut pour les livres existants
    op.execute("""
        INSERT INTO users (email, username, hashed_password, is_active, created_at)
        VALUES ('admin@bibliotheque.local', 'admin', '$2b$12$example.hash.for.migration', TRUE, DATETIME('now'))
    """)
    
    # Ajouter la colonne owner_id à books (temporairement nullable)
    op.add_column('books', sa.Column('owner_id', sa.Integer(), nullable=True))
    
    # Assigner tous les livres existants au premier utilisateur (admin)
    op.execute("UPDATE books SET owner_id = 1 WHERE owner_id IS NULL")
    
    # Maintenant rendre la colonne non-nullable
    op.alter_column('books', 'owner_id', nullable=False)
    
    # Ajouter la foreign key
    op.create_foreign_key('fk_books_owner_id', 'books', 'users', ['owner_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Supprimer la foreign key
    op.drop_constraint('fk_books_owner_id', 'books', type_='foreignkey')
    
    # Supprimer la colonne owner_id
    op.drop_column('books', 'owner_id')
    
    # Supprimer l'index et la table users
    op.drop_index('ix_users_email', 'users')
    op.drop_table('users')
