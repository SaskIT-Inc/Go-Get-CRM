"""make services.service_category nullable (replaced by Fees on the Add Service form)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('services', 'service_category', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column('services', 'service_category', existing_type=sa.String(), nullable=False)
