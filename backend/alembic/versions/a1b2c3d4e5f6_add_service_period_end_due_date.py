"""add service period_end_date and due_date

Revision ID: a1b2c3d4e5f6
Revises: ce266a5145f0
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ce266a5145f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('services', sa.Column('period_end_date', sa.String(), nullable=True))
    op.add_column('services', sa.Column('due_date', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('services', 'due_date')
    op.drop_column('services', 'period_end_date')
