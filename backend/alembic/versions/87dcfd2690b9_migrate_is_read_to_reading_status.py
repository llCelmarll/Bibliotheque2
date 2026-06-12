"""migrate_is_read_to_reading_status

Revision ID: 87dcfd2690b9
Revises: b3c4d5e6f7a8
Create Date: 2026-06-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '87dcfd2690b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('books', sa.Column('reading_status', sa.String(), nullable=True))
    op.execute("""
        UPDATE books
        SET reading_status = CASE
            WHEN is_read = true  THEN 'lu'
            WHEN is_read = false THEN 'non_lu'
            ELSE NULL
        END
    """)
    op.execute("DROP INDEX IF EXISTS ix_books_owner_is_read")
    op.execute("ALTER TABLE books DROP COLUMN IF EXISTS is_read")
    op.create_index('ix_books_owner_reading_status', 'books', ['owner_id', 'reading_status'])


def downgrade() -> None:
    op.drop_index('ix_books_owner_reading_status', table_name='books')
    op.add_column('books', sa.Column('is_read', sa.Boolean(), nullable=True))
    op.execute("""
        UPDATE books
        SET is_read = CASE
            WHEN reading_status = 'lu'     THEN true
            WHEN reading_status = 'non_lu' THEN false
            ELSE NULL
        END
    """)
    op.drop_column('books', 'reading_status')
    op.create_index('ix_books_owner_is_read', 'books', ['owner_id', 'is_read'])
