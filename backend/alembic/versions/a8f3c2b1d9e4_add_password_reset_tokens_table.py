"""add_password_reset_tokens_table

Revision ID: a8f3c2b1d9e4
Revises: 2454c6ac5560
Create Date: 2026-02-23 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a8f3c2b1d9e4'
down_revision = '2454c6ac5560'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_password_reset_tokens_token'),
        'password_reset_tokens',
        ['token'],
        unique=True,
    )
    op.create_index(
        op.f('ix_password_reset_tokens_user_id'),
        'password_reset_tokens',
        ['user_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_password_reset_tokens_user_id'),
        table_name='password_reset_tokens',
    )
    op.drop_index(
        op.f('ix_password_reset_tokens_token'),
        table_name='password_reset_tokens',
    )
    op.drop_table('password_reset_tokens')
