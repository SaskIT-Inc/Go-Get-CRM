"""add recurring_email_sequences table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'recurring_email_sequences',
        sa.Column('client_id', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('interval_days', sa.Numeric(), server_default='7', nullable=True),
        sa.Column('next_send_date', sa.String(), nullable=False),
        sa.Column('last_sent_date', sa.String(), nullable=True),
        sa.Column('send_count', sa.Numeric(), server_default='0', nullable=True),
        sa.Column('max_sends', sa.Numeric(), nullable=True),
        sa.Column('status', sa.String(), server_default='active', nullable=True),
        sa.Column('stopped_reason', sa.String(), nullable=True),
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_recurring_email_sequences_client_id'),
        'recurring_email_sequences', ['client_id'], unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_recurring_email_sequences_client_id'), table_name='recurring_email_sequences')
    op.drop_table('recurring_email_sequences')
