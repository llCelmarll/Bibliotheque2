"""merge_heads

Revision ID: 6235b449934a
Revises: b9c8d7e6f5a4, e7f8a9b0c1d2
Create Date: 2026-06-20 14:49:59.189713

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6235b449934a'
down_revision: Union[str, Sequence[str], None] = ('b9c8d7e6f5a4', 'e7f8a9b0c1d2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
