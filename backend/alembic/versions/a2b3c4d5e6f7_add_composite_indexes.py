"""add_composite_indexes

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_books_owner_is_read', 'books', ['owner_id', 'is_read'])
    op.create_index('ix_books_owner_created_at', 'books', ['owner_id', 'created_at'])
    op.create_index('ix_borrowed_books_book_status', 'borrowed_books', ['book_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_borrowed_books_book_status', table_name='borrowed_books')
    op.drop_index('ix_books_owner_created_at', table_name='books')
    op.drop_index('ix_books_owner_is_read', table_name='books')
