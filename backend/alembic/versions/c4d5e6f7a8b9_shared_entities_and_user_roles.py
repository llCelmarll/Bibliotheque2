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
import logging
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

log = logging.getLogger("alembic.runtime.migration")

revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'a8f3c2b1d9e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _count(bind, query: str) -> int:
    return bind.execute(sa.text(query)).scalar()


def upgrade() -> None:
    bind = op.get_bind()

    # === AJOUT DU RÔLE UTILISATEUR ===
    log.info("[migration] Ajout de la colonne 'role' sur la table users")
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='user'))
    nb_users = _count(bind, "SELECT COUNT(*) FROM users")
    log.info("[migration] %d utilisateur(s) — tous auront le rôle 'user' par défaut", nb_users)

    # === AUTHORS ===
    nb_authors_before = _count(bind, "SELECT COUNT(*) FROM authors")
    nb_duplicates = _count(bind, "SELECT COUNT(*) FROM authors WHERE id NOT IN (SELECT MIN(id) FROM authors GROUP BY LOWER(name))")
    log.info("[migration] AUTHORS : %d entrée(s) dont %d doublon(s) à supprimer", nb_authors_before, nb_duplicates)

    op.execute("""
        UPDATE book_author_link
        SET author_id = (
            SELECT MIN(a2.id)
            FROM authors a2
            WHERE LOWER(a2.name) = LOWER((SELECT a.name FROM authors a WHERE a.id = book_author_link.author_id))
        )
        WHERE author_id IS NOT NULL
    """)
    log.info("[migration] AUTHORS : liens book_author_link réassignés vers l'id canonique")

    op.execute("""
        DELETE FROM authors
        WHERE id NOT IN (
            SELECT MIN(id) FROM authors GROUP BY LOWER(name)
        )
    """)
    nb_authors_after = _count(bind, "SELECT COUNT(*) FROM authors")
    log.info("[migration] AUTHORS : %d supprimé(s), %d restant(s)", nb_duplicates, nb_authors_after)

    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.drop_constraint('uq_author_name_owner', type_='unique')
        batch_op.drop_constraint('authors_owner_id_fkey', type_='foreignkey')
        batch_op.drop_index('ix_authors_name')

    op.drop_column('authors', 'owner_id')

    with op.batch_alter_table('authors', schema=None) as batch_op:
        batch_op.create_index('ix_authors_name', ['name'])
        batch_op.create_unique_constraint('uq_author_name', ['name'])
    log.info("[migration] AUTHORS : contrainte UNIQUE(name) créée")

    # === GENRES ===
    nb_genres_before = _count(bind, "SELECT COUNT(*) FROM genres")
    nb_duplicates = _count(bind, "SELECT COUNT(*) FROM genres WHERE id NOT IN (SELECT MIN(id) FROM genres GROUP BY LOWER(name))")
    log.info("[migration] GENRES : %d entrée(s) dont %d doublon(s) à supprimer", nb_genres_before, nb_duplicates)

    op.execute("""
        UPDATE book_genre_link
        SET genre_id = (
            SELECT MIN(g2.id)
            FROM genres g2
            WHERE LOWER(g2.name) = LOWER((SELECT g.name FROM genres g WHERE g.id = book_genre_link.genre_id))
        )
        WHERE genre_id IS NOT NULL
    """)
    log.info("[migration] GENRES : liens book_genre_link réassignés vers l'id canonique")

    op.execute("""
        DELETE FROM genres
        WHERE id NOT IN (
            SELECT MIN(id) FROM genres GROUP BY LOWER(name)
        )
    """)
    nb_genres_after = _count(bind, "SELECT COUNT(*) FROM genres")
    log.info("[migration] GENRES : %d supprimé(s), %d restant(s)", nb_duplicates, nb_genres_after)

    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.drop_constraint('uq_genre_name_owner', type_='unique')
        batch_op.drop_constraint('genres_owner_id_fkey', type_='foreignkey')
        batch_op.drop_index('ix_genres_name')

    op.drop_column('genres', 'owner_id')

    with op.batch_alter_table('genres', schema=None) as batch_op:
        batch_op.create_index('ix_genres_name', ['name'])
        batch_op.create_unique_constraint('uq_genre_name', ['name'])
    log.info("[migration] GENRES : contrainte UNIQUE(name) créée")

    # === PUBLISHERS ===
    nb_publishers_before = _count(bind, "SELECT COUNT(*) FROM publishers")
    nb_duplicates = _count(bind, "SELECT COUNT(*) FROM publishers WHERE id NOT IN (SELECT MIN(id) FROM publishers GROUP BY LOWER(name))")
    log.info("[migration] PUBLISHERS : %d entrée(s) dont %d doublon(s) à supprimer", nb_publishers_before, nb_duplicates)

    op.execute("""
        UPDATE books
        SET publisher_id = (
            SELECT MIN(p2.id)
            FROM publishers p2
            WHERE LOWER(p2.name) = LOWER((SELECT p.name FROM publishers p WHERE p.id = books.publisher_id))
        )
        WHERE publisher_id IS NOT NULL
    """)
    log.info("[migration] PUBLISHERS : FK books.publisher_id réassignées vers l'id canonique")

    op.execute("""
        DELETE FROM publishers
        WHERE id NOT IN (
            SELECT MIN(id) FROM publishers GROUP BY LOWER(name)
        )
    """)
    nb_publishers_after = _count(bind, "SELECT COUNT(*) FROM publishers")
    log.info("[migration] PUBLISHERS : %d supprimé(s), %d restant(s)", nb_duplicates, nb_publishers_after)

    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.drop_constraint('uq_publisher_name_owner', type_='unique')
        batch_op.drop_constraint('publishers_owner_id_fkey', type_='foreignkey')
        batch_op.drop_index('ix_publishers_name')

    op.drop_column('publishers', 'owner_id')

    with op.batch_alter_table('publishers', schema=None) as batch_op:
        batch_op.create_index('ix_publishers_name', ['name'])
        batch_op.create_unique_constraint('uq_publisher_name', ['name'])
    log.info("[migration] PUBLISHERS : contrainte UNIQUE(name) créée")

    # === SERIES ===
    nb_series_before = _count(bind, "SELECT COUNT(*) FROM series")
    nb_duplicates = _count(bind, "SELECT COUNT(*) FROM series WHERE id NOT IN (SELECT MIN(id) FROM series GROUP BY LOWER(name))")
    log.info("[migration] SERIES : %d entrée(s) dont %d doublon(s) à supprimer", nb_series_before, nb_duplicates)

    op.execute("""
        UPDATE book_series_link
        SET series_id = (
            SELECT MIN(s2.id)
            FROM series s2
            WHERE LOWER(s2.name) = LOWER((SELECT s.name FROM series s WHERE s.id = book_series_link.series_id))
        )
        WHERE series_id IS NOT NULL
    """)
    log.info("[migration] SERIES : liens book_series_link réassignés vers l'id canonique")

    op.execute("""
        DELETE FROM series
        WHERE id NOT IN (
            SELECT MIN(id) FROM series GROUP BY LOWER(name)
        )
    """)
    nb_series_after = _count(bind, "SELECT COUNT(*) FROM series")
    log.info("[migration] SERIES : %d supprimé(s), %d restant(s)", nb_duplicates, nb_series_after)

    with op.batch_alter_table('series', schema=None) as batch_op:
        batch_op.drop_constraint('uq_series_name_owner', type_='unique')
        batch_op.drop_constraint('series_owner_id_fkey', type_='foreignkey')

    op.drop_column('series', 'owner_id')

    with op.batch_alter_table('series', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_series_name', ['name'])
    log.info("[migration] SERIES : contrainte UNIQUE(name) créée")

    log.info("[migration] Migration c4d5e6f7a8b9 terminée avec succès")


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
