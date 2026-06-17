"""normalize reading_status values to English

Revision ID: b9c8d7e6f5a4
Revises: 87dcfd2690b9
Create Date: 2026-06-16 00:00:00.000000

"""
from typing import Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b9c8d7e6f5a4'
down_revision: Union[str, None] = '87dcfd2690b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE books SET reading_status = 'read'   WHERE reading_status = 'lu'")
    op.execute("UPDATE books SET reading_status = 'unread' WHERE reading_status = 'non_lu'")


def downgrade() -> None:
    op.execute("UPDATE books SET reading_status = 'lu'     WHERE reading_status = 'read'")
    op.execute("UPDATE books SET reading_status = 'non_lu' WHERE reading_status = 'unread'")
