"""seed default Essential/Standard/Premium packages

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-02 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PACKAGES_TABLE = sa.table(
    'packages',
    sa.column('id', sa.String),
    sa.column('name', sa.String),
    sa.column('price', sa.String),
    sa.column('billing_frequency', sa.String),
    sa.column('description', sa.Text),
    sa.column('is_active', sa.Boolean),
    sa.column('extra', JSONB),
)

DEFAULT_PACKAGES = [
    {
        'name': 'Essential',
        'price': '$299/month',
        'description': (
            'Bookkeeping: up to 150 transactions/month, quarterly bookkeeping, QBO Basic subscription • '
            'Tax: T2 corporate tax & return filing, GST/PST remittance, 2 personal tax returns included, '
            'up to 10 T4/T4A/T5 slips • Payroll: up to 6 employees (no direct deposit) • '
            'Support: email / call / text, quarterly financial summary'
        ),
    },
    {
        'name': 'Standard',
        'price': '$599/month',
        'description': (
            'Bookkeeping: up to 350 transactions/month, monthly bookkeeping + reconciliation, QBO Standard '
            'subscription • Tax: T2 corporate tax & return filing, GST/PST remittance, 3 personal tax '
            'returns included, up to 20 T4/T4A/T5 slips • Payroll: up to 20 employees (no direct deposit) '
            '• Support: phone + 1hr consult/month, quarterly meetings, financial alerts, government '
            'benefit updates, basic industry insights'
        ),
    },
    {
        'name': 'Premium',
        'price': '$1,499/month',
        'description': (
            'Bookkeeping: up to 1,500 transactions/month, weekly bookkeeping + reconciliation, QBO '
            'subscription as required • Tax: T2 corporate tax & return filing, GST/PST remittance, '
            '5 personal tax returns included, up to 100 T4/T4A/T5 slips • Payroll: up to 100 employees '
            '(no direct deposit) • Support: priority, unlimited access, CFO-level strategic planning, '
            'real-time financial alerts, early access to government benefit updates, tailored industry '
            'insights + benchmarks'
        ),
    },
]


def upgrade() -> None:
    bind = op.get_bind()
    existing = bind.execute(sa.text("SELECT COUNT(*) FROM packages")).scalar()
    if existing:
        # Firm already has packages of its own (e.g. added via the old
        # Settings > Packages tab) — never overwrite real data.
        return
    op.bulk_insert(PACKAGES_TABLE, [
        {
            'id': str(uuid.uuid4()),
            'name': pkg['name'],
            'price': pkg['price'],
            'billing_frequency': 'Monthly',
            'description': pkg['description'],
            'is_active': True,
            'extra': {},
        }
        for pkg in DEFAULT_PACKAGES
    ])


def downgrade() -> None:
    op.execute(
        "DELETE FROM packages WHERE name IN ('Essential', 'Standard', 'Premium') "
        "AND price IN ('$299/month', '$599/month', '$1,499/month')"
    )
