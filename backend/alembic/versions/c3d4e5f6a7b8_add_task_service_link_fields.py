"""add task linked_service_id, linked_package_id, service_frequency

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('linked_service_id', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('linked_package_id', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('service_frequency', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'service_frequency')
    op.drop_column('tasks', 'linked_package_id')
    op.drop_column('tasks', 'linked_service_id')
