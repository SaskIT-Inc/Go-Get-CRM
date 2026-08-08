"""seed/correct one-time services from the price sheet

Adds the one-time/setup services from the 02 July 2026 price sheet that
aren't already among the 12 services seeded by d4e5f6a7b8c9 (that migration
already covers Personal Tax Return (T1) and Corporation Tax Return (T2), so
they're intentionally excluded here).

This is an UPSERT, not a plain insert-if-missing: app/seed.py used to seed
these same 9 services independently (before being corrected to stop doing
that — see its module docstring), with lossy `base_price` values that
flattened "$999 + govt fees" to a bare 999, "$350/hr" to a bare 350, and
"Starting at $75"/"$40" to bare 75/40 — losing the caveat entirely. Where a
row already exists under one of these names, this corrects its
category/billing_frequency/base_price/notes to the accurate representation
below rather than skipping it as "already seeded."

Revision ID: 53c27160a071
Revises: 6be836aa2c8a
Create Date: 2026-08-08 13:25:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '53c27160a071'
down_revision: Union[str, None] = '6be836aa2c8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SERVICES_TABLE = sa.table(
    'services',
    sa.column('id', sa.String),
    sa.column('service_category', sa.String),
    sa.column('service_name', sa.String),
    sa.column('billing_frequency', sa.String),
    sa.column('base_price', sa.Numeric),
    sa.column('notes', sa.Text),
    sa.column('is_active', sa.Boolean),
    sa.column('requires_cpa', sa.Boolean),
    sa.column('extra', JSONB),
)

# base_price set only for genuine flat fees — "Starting at", "/hr", and
# "Custom Quote" amounts aren't a single number, so they're described in
# notes instead (base_price is a numeric column).
NEW_SERVICES = [
    {
        'name': 'Business Incorporation (Federal & Provincial)', 'category': 'Incorporation',
        'billing_frequency': 'One-time', 'base_price': None,
        'notes': 'Fee: $999 + govt fees. Articles of Incorporation, BN registration.',
    },
    {
        'name': 'Business Incorporation (Extra Provincial)', 'category': 'Incorporation',
        'billing_frequency': 'One-time', 'base_price': None,
        'notes': 'Fee: $499 + govt fees. Provincial name reservation & registration.',
    },
    {
        'name': 'CRA Account Setup', 'category': 'CRA & Compliance',
        'billing_frequency': 'One-time', 'base_price': 99,
        'notes': 'GST/HST & Payroll accounts under BN.',
    },
    {
        'name': 'Bookkeeping Software Setup', 'category': 'Bookkeeping',
        'billing_frequency': 'One-time', 'base_price': 449,
        'notes': 'QBO/Xero setup, chart of accounts, tax codes.',
    },
    {
        'name': 'Startup Bookkeeping Training', 'category': 'Advisory',
        'billing_frequency': 'One-time', 'base_price': 149,
        'notes': '1-2 hrs of training in-person or Zoom.',
    },
    {
        'name': 'CPA Tax Consultation', 'category': 'Advisory',
        'billing_frequency': 'Hourly', 'base_price': None,
        'notes': 'Fee: $350/hr. Tax planning, structure, or compliance advice.',
    },
    {
        'name': 'CRA Audit Support', 'category': 'CRA & Compliance',
        'billing_frequency': 'One-time', 'base_price': None,
        'notes': 'Fee: Custom Quote. Payroll/GST audits; CRA correspondence.',
    },
    {
        'name': 'Notary', 'category': 'Advisory',
        'billing_frequency': 'One-time', 'base_price': None,
        'notes': 'Fee: Starting at $40 (conditions apply).',
    },
    {
        'name': 'Govt. Benefits & Application', 'category': 'Advisory',
        'billing_frequency': 'One-time', 'base_price': None,
        'notes': (
            'Fee: Starting at $75. EI/WCB, GST/Federal Benefits, Passport applications, '
            'CCR, DTC, and more.'
        ),
    },
]


def upgrade() -> None:
    bind = op.get_bind()
    rows = []
    for svc in NEW_SERVICES:
        existing_id = bind.execute(
            sa.text("SELECT id FROM services WHERE lower(service_name) = lower(:name)"),
            {'name': svc['name']},
        ).scalar()
        if existing_id:
            bind.execute(
                sa.text(
                    "UPDATE services SET service_category = :category, billing_frequency = :billing_frequency, "
                    "base_price = :base_price, notes = :notes WHERE id = :id"
                ),
                {
                    'category': svc['category'],
                    'billing_frequency': svc['billing_frequency'],
                    'base_price': svc['base_price'],
                    'notes': svc['notes'],
                    'id': existing_id,
                },
            )
            continue
        rows.append({
            'id': str(uuid.uuid4()),
            'service_category': svc['category'],
            'service_name': svc['name'],
            'billing_frequency': svc['billing_frequency'],
            'base_price': svc['base_price'],
            'notes': svc['notes'],
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
