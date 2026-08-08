"""rename Essential->Basic, add Promotional + Dedicated Payroll packages

Per the 02 July 2026 price sheet: Standard and Premium are unchanged (every
figure in the new comparison table matches what was already seeded
verbatim), Essential becomes Basic (identical figures, name only), and two
new packages are added — Promotional ($149/mo) and a standalone Dedicated
Payroll Services rate card.

The rename only touches the `name` column, not `price`/`description` — two
independent seed mechanisms (this migration family and app/seed.py, before
the latter was corrected to stop seeding Package/Service) have historically
worded the Essential/Standard/Premium descriptions slightly differently, so
matching on exact description text is fragile. Renaming by name alone is
safe regardless of wording: `Client.active_package` stores the package name
as a plain snapshotted string, not a foreign key, so this can't corrupt any
already-assigned client either way.

Revision ID: 6be836aa2c8a
Revises: 962a5a123a3e
Create Date: 2026-08-08 13:20:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '6be836aa2c8a'
down_revision: Union[str, None] = '962a5a123a3e'
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

NEW_PACKAGES = [
    {
        'name': 'Promotional',
        'price': '$149/month',
        'description': (
            'Bookkeeping: up to 99 transactions/month, yearly bookkeeping • '
            'Tax: T2 corporate tax included (return filing not included), GST/PST remittance, '
            'up to 5 T4/T4A/T5 slips • Payroll: up to 3 employees (no direct deposit) • '
            'Support: email / call only, annual financial review'
        ),
    },
    {
        'name': 'Dedicated Payroll Services',
        'price': 'From $50/month',
        'description': (
            'Base fee $50/month (no direct deposit, 4 employees included) + $5/employee/month, or '
            '$60/month (direct deposit, no employees included) + $6/employee/month • '
            'Includes source deduction calculations & CRA remittances, ROE issuance, '
            'year-end T4 & T4 Summary preparation'
        ),
    },
]


def upgrade() -> None:
    bind = op.get_bind()

    has_essential = bind.execute(sa.text("SELECT 1 FROM packages WHERE name = 'Essential'")).scalar()
    has_basic = bind.execute(sa.text("SELECT 1 FROM packages WHERE name = 'Basic'")).scalar()
    if has_essential and not has_basic:
        op.execute("UPDATE packages SET name = 'Basic' WHERE name = 'Essential'")

    existing_names = {
        row[0]
        for row in bind.execute(sa.text("SELECT name FROM packages WHERE name IN ('Promotional', 'Dedicated Payroll Services')"))
    }
    to_insert = [pkg for pkg in NEW_PACKAGES if pkg['name'] not in existing_names]
    if to_insert:
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
            for pkg in to_insert
        ])


def downgrade() -> None:
    op.execute("DELETE FROM packages WHERE name IN ('Promotional', 'Dedicated Payroll Services')")
    op.execute("UPDATE packages SET name = 'Essential' WHERE name = 'Basic'")
