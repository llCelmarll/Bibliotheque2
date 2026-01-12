"""add_borrowed_books_table

Revision ID: 774653556c67
Revises: aef87d679b27
Create Date: 2026-01-07 15:29:42.991774

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '774653556c67'
down_revision: Union[str, Sequence[str], None] = 'aef87d679b27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create borrowed_books table
    op.create_table(
        'borrowed_books',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('borrowed_from', sa.String(), nullable=False),
        sa.Column('borrowed_date', sa.DateTime(), nullable=False),
        sa.Column('expected_return_date', sa.DateTime(), nullable=True),
        sa.Column('actual_return_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_borrowed_books_book_id', 'borrowed_books', ['book_id'], unique=False)
    op.create_index('ix_borrowed_books_user_id', 'borrowed_books', ['user_id'], unique=False)
    op.create_index('ix_borrowed_books_borrowed_from', 'borrowed_books', ['borrowed_from'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_borrowed_books_borrowed_from', table_name='borrowed_books')
    op.drop_index('ix_borrowed_books_user_id', table_name='borrowed_books')
    op.drop_index('ix_borrowed_books_book_id', table_name='borrowed_books')

    # Drop table
    op.drop_table('borrowed_books')
