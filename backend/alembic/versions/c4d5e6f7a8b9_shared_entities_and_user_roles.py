"""shared_entities_and_user_roles

Revision ID: c4d5e6f7a8b9
Revises: a8f3c2b1d9e4
Create Date: 2026-03-12 10:00:00.000000

Rend les entités Authors, Genres, Publishers et Series partagées entre tous les utilisateurs :
- Supprime owner_id de ces tables
- Déduplique les entrées par nom (insensible à la casse)
- Ajoute une contrainte UNIQUE(name) sur chaque table
- Ajoute la colonne 'role' à la table users (valeurs: user, moderator, admin)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'a8f3c2b1d9e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === AJOUT DU RÔLE UTILISATEUR ===
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='user'))

    # === AUTHORS ===
    # Réassigner les liens book_author_link vers l'id canonique (MIN(id) par nom)
    op.execute("""
        UPDATE book_author_link
        SET author_id = (
            SELECT MIN(a2.id)
            FROM authors a2
            WHERE LOWER(a2.name) = LOWER((SELECT a.name FROM authors a WHERE a.id = book_author_link.author_id))
        )
        WHERE author_id IS NOT NULL
    """)

    # Supprimer les auteurs en double (garder MIN(id) par nom)
    op.execute("""
        DELETE FROM authors
        WHERE id NOT IN (
            SELECT MIN(id) FROM authors GROUP BY LOWER(name)
        )
    """)

    # Supprimer la contrainte unique (name, owner_id)
    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.drop_constraint('uq_author_name_owner', type_='unique')
        batch_op.drop_constraint('authors_owner_id_fkey', type_='foreignkey')
        batch_op.drop_index('ix_authors_name')

    op.drop_column('authors', 'owner_id')

    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.create_index('ix_authors_name', ['name'])
        batch_op.create_unique_constraint('uq_author_name', ['name'])

    # === GENRES ===
    op.execute("""
        UPDATE book_genre_link
        SET genre_id = (
            SELECT MIN(g2.id)
            FROM genres g2
            WHERE LOWER(g2.name) = LOWER((SELECT g.name FROM genres g WHERE g.id = book_genre_link.genre_id))
        )
        WHERE genre_id IS NOT NULL
    """)

    op.execute("""
        DELETE FROM genres
        WHERE id NOT IN (
            SELECT MIN(id) FROM genres GROUP BY LOWER(name)
        )
    """)

    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.drop_constraint('uq_genre_name_owner', type_='unique')
        batch_op.drop_constraint('genres_owner_id_fkey', type_='foreignkey')
        batch_op.drop_index('ix_genres_name')

    op.drop_column('genres', 'owner_id')

    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.create_index('ix_genres_name', ['name'])
        batch_op.create_unique_constraint('uq_genre_name', ['name'])

    # === PUBLISHERS ===
    # Pour les éditeurs, la FK est sur books.publisher_id
    op.execute("""
        UPDATE books
        SET publisher_id = (
            SELECT MIN(p2.id)
            FROM publishers p2
            WHERE LOWER(p2.name) = LOWER((SELECT p.name FROM publishers p WHERE p.id = books.publisher_id))
        )
        WHERE publisher_id IS NOT NULL
    """)

    op.execute("""
        DELETE FROM publishers
        WHERE id NOT IN (
            SELECT MIN(id) FROM publishers GROUP BY LOWER(name)
        )
    """)

    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.drop_constraint('uq_publisher_name_owner', type_='unique')
        batch_op.drop_constraint('publishers_owner_id_fkey', type_='foreignkey')
        batch_op.drop_index('ix_publishers_name')

    op.drop_column('publishers', 'owner_id')

    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.create_index('ix_publishers_name', ['name'])
        batch_op.create_unique_constraint('uq_publisher_name', ['name'])

    # === SERIES ===
    op.execute("""
        UPDATE book_series_link
        SET series_id = (
            SELECT MIN(s2.id)
            FROM series s2
            WHERE LOWER(s2.name) = LOWER((SELECT s.name FROM series s WHERE s.id = book_series_link.series_id))
        )
        WHERE series_id IS NOT NULL
    """)

    op.execute("""
        DELETE FROM series
        WHERE id NOT IN (
            SELECT MIN(id) FROM series GROUP BY LOWER(name)
        )
    """)

    with op.batch_alter_table('series', schema=None) as batch_op:
        batch_op.drop_constraint('uq_series_name_owner', type_='unique')
        batch_op.drop_constraint('series_owner_id_fkey', type_='foreignkey')

    op.drop_column('series', 'owner_id')

    with op.batch_alter_table('series', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_series_name', ['name'])


def downgrade() -> None:
    # Supprimer la colonne role
    op.drop_column('users', 'role')

    # === SERIES ===
    with op.batch_alter_table('series', schema=None) as batch_op:
        batch_op.drop_constraint('uq_series_name', type_='unique')

    op.add_column('series', sa.Column('owner_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('series', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_series_name_owner', ['name', 'owner_id'])

    # === PUBLISHERS ===
    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.drop_constraint('uq_publisher_name', type_='unique')
        batch_op.drop_index('ix_publishers_name')

    op.add_column('publishers', sa.Column('owner_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.create_index('ix_publishers_name', ['name'])
        batch_op.create_unique_constraint('uq_publisher_name_owner', ['name', 'owner_id'])

    # === GENRES ===
    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.drop_constraint('uq_genre_name', type_='unique')
        batch_op.drop_index('ix_genres_name')

    op.add_column('genres', sa.Column('owner_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.create_index('ix_genres_name', ['name'])
        batch_op.create_unique_constraint('uq_genre_name_owner', ['name', 'owner_id'])

    # === AUTHORS ===
    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.drop_constraint('uq_author_name', type_='unique')
        batch_op.drop_index('ix_authors_name')

    op.add_column('authors', sa.Column('owner_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.create_index('ix_authors_name', ['name'])
        batch_op.create_unique_constraint('uq_author_name_owner', ['name', 'owner_id'])
