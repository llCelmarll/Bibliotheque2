"""merge_heads

Revision ID: e7f8a9b0c1d2
Revises: b3c4d5e6f7a8, d6e7f8a9b0c1
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

revision: str = 'e7f8a9b0c1d2'
down_revision: Union[str, tuple] = ('b3c4d5e6f7a8', 'd6e7f8a9b0c1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
