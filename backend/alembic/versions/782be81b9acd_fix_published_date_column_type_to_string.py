"""Fix published_date column type to string

Revision ID: 782be81b9acd
Revises: ccf928bfad52
Create Date: 2025-10-27 12:23:41.415246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '782be81b9acd'
down_revision: Union[str, Sequence[str], None] = 'ccf928bfad52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # D'abord, convertir toutes les valeurs integer en string
    op.execute("UPDATE books SET published_date = CAST(published_date AS TEXT) WHERE typeof(published_date) = 'integer'")
    
    # Ensuite, modifier le type de colonne (SQLite nécessite une approche spéciale)
    # Dans SQLite, on doit créer une nouvelle table, copier les données, puis renommer
    op.execute("""
        CREATE TABLE books_new (
            id INTEGER NOT NULL,
            title VARCHAR NOT NULL,
            isbn VARCHAR,
            published_date VARCHAR,
            page_count INTEGER,
            barcode VARCHAR,
            publisher_id INTEGER,
            genre_id INTEGER,
            cover_url VARCHAR,
            created_at DATETIME NOT NULL,
            updated_at DATETIME,
            PRIMARY KEY (id),
            CONSTRAINT uq_title_isbn UNIQUE (title, isbn),
            FOREIGN KEY(publisher_id) REFERENCES publishers (id),
            FOREIGN KEY(genre_id) REFERENCES genres (id)
        )
    """)
    
    # Copier les données
    op.execute("""
        INSERT INTO books_new (id, title, isbn, published_date, page_count, barcode, 
                              publisher_id, genre_id, cover_url, created_at, updated_at)
        SELECT id, title, isbn, CAST(published_date AS TEXT), page_count, barcode, 
               publisher_id, genre_id, cover_url, created_at, updated_at
        FROM books
    """)
    
    # Supprimer l'ancienne table et renommer la nouvelle
    op.execute("DROP TABLE books")
    op.execute("ALTER TABLE books_new RENAME TO books")
    
    # Recréer les index
    op.execute("CREATE INDEX ix_books_title ON books (title)")
    op.execute("CREATE INDEX ix_books_isbn ON books (isbn)")


def downgrade() -> None:
    """Downgrade schema."""
    # Pour le downgrade, reconvertir en INTEGER (si possible)
    op.execute("""
        CREATE TABLE books_old (
            id INTEGER NOT NULL,
            title VARCHAR NOT NULL,
            isbn VARCHAR,
            published_date INTEGER,
            page_count INTEGER,
            barcode VARCHAR,
            publisher_id INTEGER,
            genre_id INTEGER,
            cover_url VARCHAR,
            created_at DATETIME NOT NULL,
            updated_at DATETIME,
            PRIMARY KEY (id),
            CONSTRAINT uq_title_isbn UNIQUE (title, isbn),
            FOREIGN KEY(publisher_id) REFERENCES publishers (id),
            FOREIGN KEY(genre_id) REFERENCES genres (id)
        )
    """)
    
    op.execute("""
        INSERT INTO books_old (id, title, isbn, published_date, page_count, barcode, 
                              publisher_id, genre_id, cover_url, created_at, updated_at)
        SELECT id, title, isbn, 
               CASE WHEN published_date GLOB '[0-9]*' THEN CAST(published_date AS INTEGER) 
                    ELSE NULL END,
               page_count, barcode, publisher_id, genre_id, cover_url, created_at, updated_at
        FROM books
    """)
    
    op.execute("DROP TABLE books")
    op.execute("ALTER TABLE books_old RENAME TO books")
    op.execute("CREATE INDEX ix_books_title ON books (title)")
    op.execute("CREATE INDEX ix_books_isbn ON books (isbn)")
