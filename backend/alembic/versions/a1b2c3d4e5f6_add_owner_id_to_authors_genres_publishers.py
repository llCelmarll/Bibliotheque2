"""add_owner_id_to_authors_genres_publishers

Revision ID: a1b2c3d4e5f6
Revises: 54edcc49b969
Create Date: 2025-12-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '54edcc49b969'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # === AUTHORS ===
    # Supprimer l'ancien index unique sur authors
    op.drop_index('ix_authors_name', table_name='authors')

    # Ajouter la colonne owner_id à authors (temporairement nullable)
    op.add_column('authors', sa.Column('owner_id', sa.Integer(), nullable=True))

    # Attribuer les auteurs aux utilisateurs en fonction de leurs livres
    # Si un auteur est utilisé par plusieurs utilisateurs, on duplique l'auteur

    # Créer une table temporaire pour stocker les auteurs par utilisateur
    op.execute("""
        CREATE TEMPORARY TABLE temp_author_owners AS
        SELECT DISTINCT
            a.id as author_id,
            a.name as author_name,
            b.owner_id as user_id
        FROM authors a
        INNER JOIN book_author_link bal ON a.id = bal.author_id
        INNER JOIN books b ON bal.book_id = b.id
        WHERE b.owner_id IS NOT NULL
    """)

    # Attribuer l'auteur existant au premier utilisateur qui l'utilise
    op.execute("""
        UPDATE authors
        SET owner_id = (
            SELECT user_id
            FROM temp_author_owners
            WHERE author_id = authors.id
            LIMIT 1
        )
        WHERE id IN (SELECT DISTINCT author_id FROM temp_author_owners)
    """)

    # Pour les auteurs non utilisés, les attribuer à l'utilisateur ID 2 (défaut)
    op.execute("UPDATE authors SET owner_id = 2 WHERE owner_id IS NULL")

    # Dupliquer les auteurs utilisés par plusieurs utilisateurs
    # Insérer de nouveaux auteurs pour les autres utilisateurs
    op.execute("""
        INSERT INTO authors (name, owner_id)
        SELECT DISTINCT tao.author_name, tao.user_id
        FROM temp_author_owners tao
        WHERE NOT EXISTS (
            SELECT 1 FROM authors a2
            WHERE a2.name = tao.author_name
            AND a2.owner_id = tao.user_id
        )
    """)

    # Mettre à jour les liens book_author_link pour pointer vers les bons auteurs
    op.execute("""
        UPDATE book_author_link
        SET author_id = (
            SELECT a.id
            FROM authors a
            INNER JOIN books b ON b.id = book_author_link.book_id
            WHERE a.name = (SELECT name FROM authors WHERE id = book_author_link.author_id)
            AND a.owner_id = b.owner_id
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM books b WHERE b.id = book_author_link.book_id
        )
    """)

    # Rendre la colonne non-nullable
    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.alter_column('owner_id', nullable=False)

    # Ajouter la foreign key et les contraintes
    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_authors_owner_id', 'users', ['owner_id'], ['id'])
        batch_op.create_index('ix_authors_name', ['name'])
        batch_op.create_unique_constraint('uq_author_name_owner', ['name', 'owner_id'])

    # === GENRES ===
    # Supprimer l'ancien index unique sur genres
    op.drop_index('ix_genres_name', table_name='genres')

    # Ajouter la colonne owner_id à genres (temporairement nullable)
    op.add_column('genres', sa.Column('owner_id', sa.Integer(), nullable=True))

    # Attribuer les genres aux utilisateurs en fonction de leurs livres
    # Créer une table temporaire pour stocker les genres par utilisateur
    op.execute("""
        CREATE TEMPORARY TABLE temp_genre_owners AS
        SELECT DISTINCT
            g.id as genre_id,
            g.name as genre_name,
            b.owner_id as user_id
        FROM genres g
        INNER JOIN book_genre_link bgl ON g.id = bgl.genre_id
        INNER JOIN books b ON bgl.book_id = b.id
        WHERE b.owner_id IS NOT NULL
    """)

    # Attribuer le genre existant au premier utilisateur qui l'utilise
    op.execute("""
        UPDATE genres
        SET owner_id = (
            SELECT user_id
            FROM temp_genre_owners
            WHERE genre_id = genres.id
            LIMIT 1
        )
        WHERE id IN (SELECT DISTINCT genre_id FROM temp_genre_owners)
    """)

    # Pour les genres non utilisés, les attribuer à l'utilisateur ID 2 (défaut)
    op.execute("UPDATE genres SET owner_id = 2 WHERE owner_id IS NULL")

    # Dupliquer les genres utilisés par plusieurs utilisateurs
    # Insérer de nouveaux genres pour les autres utilisateurs
    op.execute("""
        INSERT INTO genres (name, owner_id)
        SELECT DISTINCT tgo.genre_name, tgo.user_id
        FROM temp_genre_owners tgo
        WHERE NOT EXISTS (
            SELECT 1 FROM genres g2
            WHERE g2.name = tgo.genre_name
            AND g2.owner_id = tgo.user_id
        )
    """)

    # Mettre à jour les liens book_genre_link pour pointer vers les bons genres
    op.execute("""
        UPDATE book_genre_link
        SET genre_id = (
            SELECT g.id
            FROM genres g
            INNER JOIN books b ON b.id = book_genre_link.book_id
            WHERE g.name = (SELECT name FROM genres WHERE id = book_genre_link.genre_id)
            AND g.owner_id = b.owner_id
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM books b WHERE b.id = book_genre_link.book_id
        )
    """)

    # Rendre la colonne non-nullable
    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.alter_column('owner_id', nullable=False)

    # Ajouter la foreign key et les contraintes
    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_genres_owner_id', 'users', ['owner_id'], ['id'])
        batch_op.create_index('ix_genres_name', ['name'])
        batch_op.create_unique_constraint('uq_genre_name_owner', ['name', 'owner_id'])

    # === PUBLISHERS ===
    # Supprimer l'ancien index unique sur publishers
    op.drop_index('ix_publishers_name', table_name='publishers')

    # Ajouter la colonne owner_id à publishers (temporairement nullable)
    op.add_column('publishers', sa.Column('owner_id', sa.Integer(), nullable=True))

    # Attribuer les éditeurs aux utilisateurs en fonction de leurs livres
    # Créer une table temporaire pour stocker les éditeurs par utilisateur
    op.execute("""
        CREATE TEMPORARY TABLE temp_publisher_owners AS
        SELECT DISTINCT
            p.id as publisher_id,
            p.name as publisher_name,
            b.owner_id as user_id
        FROM publishers p
        INNER JOIN books b ON p.id = b.publisher_id
        WHERE b.owner_id IS NOT NULL
    """)

    # Attribuer l'éditeur existant au premier utilisateur qui l'utilise
    op.execute("""
        UPDATE publishers
        SET owner_id = (
            SELECT user_id
            FROM temp_publisher_owners
            WHERE publisher_id = publishers.id
            LIMIT 1
        )
        WHERE id IN (SELECT DISTINCT publisher_id FROM temp_publisher_owners)
    """)

    # Pour les éditeurs non utilisés, les attribuer à l'utilisateur ID 2 (défaut)
    op.execute("UPDATE publishers SET owner_id = 2 WHERE owner_id IS NULL")

    # Dupliquer les éditeurs utilisés par plusieurs utilisateurs
    # Insérer de nouveaux éditeurs pour les autres utilisateurs
    op.execute("""
        INSERT INTO publishers (name, owner_id)
        SELECT DISTINCT tpo.publisher_name, tpo.user_id
        FROM temp_publisher_owners tpo
        WHERE NOT EXISTS (
            SELECT 1 FROM publishers p2
            WHERE p2.name = tpo.publisher_name
            AND p2.owner_id = tpo.user_id
        )
    """)

    # Mettre à jour la relation book.publisher_id pour pointer vers les bons éditeurs
    op.execute("""
        UPDATE books
        SET publisher_id = (
            SELECT p.id
            FROM publishers p
            WHERE p.name = (SELECT name FROM publishers WHERE id = books.publisher_id)
            AND p.owner_id = books.owner_id
            LIMIT 1
        )
        WHERE publisher_id IS NOT NULL
    """)

    # Rendre la colonne non-nullable
    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.alter_column('owner_id', nullable=False)

    # Ajouter la foreign key et les contraintes
    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_publishers_owner_id', 'users', ['owner_id'], ['id'])
        batch_op.create_index('ix_publishers_name', ['name'])
        batch_op.create_unique_constraint('uq_publisher_name_owner', ['name', 'owner_id'])


def downgrade() -> None:
    """Downgrade schema."""

    # === PUBLISHERS ===
    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.drop_constraint('uq_publisher_name_owner', type_='unique')
        batch_op.drop_constraint('fk_publishers_owner_id', type_='foreignkey')
        batch_op.drop_index('ix_publishers_name')

    op.drop_column('publishers', 'owner_id')

    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.create_index('ix_publishers_name', ['name'], unique=True)

    # === GENRES ===
    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.drop_constraint('uq_genre_name_owner', type_='unique')
        batch_op.drop_constraint('fk_genres_owner_id', type_='foreignkey')
        batch_op.drop_index('ix_genres_name')

    op.drop_column('genres', 'owner_id')

    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.create_index('ix_genres_name', ['name'], unique=True)

    # === AUTHORS ===
    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.drop_constraint('uq_author_name_owner', type_='unique')
        batch_op.drop_constraint('fk_authors_owner_id', type_='foreignkey')
        batch_op.drop_index('ix_authors_name')

    op.drop_column('authors', 'owner_id')

    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.create_index('ix_authors_name', ['name'], unique=True)
