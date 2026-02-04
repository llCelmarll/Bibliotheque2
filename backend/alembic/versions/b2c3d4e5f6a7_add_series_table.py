"""add_series_table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f7
Create Date: 2026-02-04 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'series',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, index=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.UniqueConstraint('name', 'owner_id', name='uq_series_name_owner'),
    )

    op.create_table(
        'book_series_link',
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id'), primary_key=True),
        sa.Column('series_id', sa.Integer(), sa.ForeignKey('series.id'), primary_key=True),
        sa.Column('volume_number', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('book_series_link')
    op.drop_table('series')
