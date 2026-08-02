"""seed additional services (Bookkeeping, GST/PST filing, Payroll, T2/T1, etc.)

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-02 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SERVICES_TABLE = sa.table(
    'services',
    sa.column('id', sa.String),
    sa.column('service_category', sa.String),
    sa.column('service_name', sa.String),
    sa.column('billing_frequency', sa.String),
    sa.column('is_active', sa.Boolean),
    sa.column('requires_cpa', sa.Boolean),
    sa.column('extra', JSONB),
)

# Prices deliberately left blank — not mandatory per the firm, editable later
# from the Service Catalog UI. billing_frequency is a reasonable starting
# guess, also editable.
NEW_SERVICES = [
    {'name': 'Bookkeeping', 'category': 'Bookkeeping', 'billing_frequency': 'Monthly'},
    {'name': 'GST Filing', 'category': 'CRA & Compliance', 'billing_frequency': 'Quarterly'},
    {'name': 'PST Filing', 'category': 'CRA & Compliance', 'billing_frequency': 'Monthly'},
    {'name': 'Payroll', 'category': 'Payroll', 'billing_frequency': 'Monthly'},
    {'name': 'Corporation Tax Return (T2)', 'category': 'Corporate Tax', 'billing_frequency': 'Annual'},
    {'name': 'Personal Tax Return (T1)', 'category': 'Personal Tax', 'billing_frequency': 'Annual'},
    {'name': 'Annual Return - Federal (ISED)', 'category': 'Corporate Compliance', 'billing_frequency': 'Annual'},
    {'name': 'Annual Return - Provincial (ISC)', 'category': 'Corporate Compliance', 'billing_frequency': 'Annual'},
    {'name': 'T4 Slips', 'category': 'Payroll', 'billing_frequency': 'Annual'},
    {'name': 'WCB', 'category': 'Payroll', 'billing_frequency': 'Annual'},
    {'name': 'Record of Employment (ROE)', 'category': 'Payroll', 'billing_frequency': 'Per Event'},
    {'name': 'Business Consultation', 'category': 'Advisory', 'billing_frequency': 'One-time'},
]


def upgrade() -> None:
    bind = op.get_bind()
    rows = []
    for svc in NEW_SERVICES:
        exists = bind.execute(
            sa.text("SELECT 1 FROM services WHERE lower(service_name) = lower(:name)"),
            {'name': svc['name']},
        ).scalar()
        if exists:
            continue
        rows.append({
            'id': str(uuid.uuid4()),
            'service_category': svc['category'],
            'service_name': svc['name'],
            'billing_frequency': svc['billing_frequency'],
            'is_active': True,
            'requires_cpa': False,
            'extra': {},
        })
    if rows:
        op.bulk_insert(SERVICES_TABLE, rows)


def downgrade() -> None:
    names = [svc['name'] for svc in NEW_SERVICES]
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM services WHERE service_name = ANY(:names)"),
        {'names': names},
    )
