"""Add User model and owner_id to Book

Revision ID: 0bcc259b37dd
Revises: 782be81b9acd
Create Date: 2025-10-27 14:06:55.467188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0bcc259b37dd'
down_revision: Union[str, Sequence[str], None] = '782be81b9acd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # D'abord créer la table users
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_user_email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Créer un utilisateur admin par défaut
    op.execute("""
        INSERT INTO users (email, username, hashed_password, is_active, created_at)
        VALUES ('admin@bibliotheque.local', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdU5tTqLULjVJh2', 1, datetime('now'))
    """)
    
    # Ensuite ajouter owner_id à books
    op.add_column('books', sa.Column('owner_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_books_barcode'), 'books', ['barcode'], unique=False)
    op.create_foreign_key('fk_books_owner_id', 'books', 'users', ['owner_id'], ['id'])
    
    # Assigner tous les livres existants au premier utilisateur
    op.execute("UPDATE books SET owner_id = 1 WHERE owner_id IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # Supprimer la foreign key et la colonne owner_id
    op.drop_constraint('fk_books_owner_id', 'books', type_='foreignkey')
    op.drop_index(op.f('ix_books_barcode'), table_name='books')
    op.drop_column('books', 'owner_id')
    
    # Supprimer la table users
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
