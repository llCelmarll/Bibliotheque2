"""merge_multiple_heads

Revision ID: 74b591580c4e
Revises: 0bcc259b37dd, 5b1a31b4c2b8, be98d4aa5e2a
Create Date: 2025-10-28 11:23:57.306241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74b591580c4e'
down_revision: Union[str, Sequence[str], None] = ('0bcc259b37dd', '5b1a31b4c2b8', 'be98d4aa5e2a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
