"""add service_filings.compliance_due_date, backfill from existing filings

Revision ID: b7c8d9e0f1a2
Revises: dca70f1955a5
Create Date: 2026-08-09 00:00:00.000000

"""
import calendar
from datetime import date, timedelta
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'dca70f1955a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Self-contained copies of backend/app/date_utils.py and the classifier/rule
# functions in backend/app/routers/generic.py — migrations in this codebase
# don't import application modules (keeps them runnable independent of the
# app's current code), so this mirrors that logic rather than importing it.

def _add_months(iso_date: str, n: int) -> str:
    d = date.fromisoformat(iso_date[:10])
    month_index = d.month - 1 + n
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day).isoformat()


def _add_days(iso_date: str, n: int) -> str:
    d = date.fromisoformat(iso_date[:10])
    return (d + timedelta(days=n)).isoformat()


def _classify_filing(service_name):
    name = (service_name or "").lower()
    if "t2" in name or "corporate tax" in name or "corporation tax" in name:
        return "t2"
    if "t1" in name or "personal tax" in name:
        return "t1"
    if "t4" in name:
        return "t4"
    if "wcb" in name:
        return "wcb"
    if "remittance" in name:
        return "remittance"
    if "bookkeeping" in name:
        return "bookkeeping"
    if "gst" in name:
        return "gst"
    if "pst" in name:
        return "pst"
    return None


def _default_compliance_due_date(category, filing_frequency, base_iso):
    if not base_iso:
        return None
    if category == "gst":
        if filing_frequency == "Annual":
            return _add_months(base_iso, 3)
        if filing_frequency == "Quarterly":
            return _add_months(base_iso, 1)
        return None
    if category == "pst":
        return _add_months(base_iso, 1)
    if category == "t2":
        return _add_months(base_iso, 6)
    if category in ("t4", "wcb"):
        return _add_months(base_iso, 2)
    if category == "t1":
        return _add_months(base_iso, 4)
    if category == "remittance":
        return _add_days(base_iso, 15)
    return None


def upgrade() -> None:
    op.add_column('service_filings', sa.Column('compliance_due_date', sa.String(), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(
        sa.text('SELECT id, service_name, filing_frequency, tax_cycle_end FROM service_filings WHERE tax_cycle_end IS NOT NULL')
    ).fetchall()

    for row in rows:
        try:
            compliance_due_date = _default_compliance_due_date(
                _classify_filing(row.service_name), row.filing_frequency, row.tax_cycle_end
            )
        except (ValueError, TypeError):
            continue
        if compliance_due_date:
            bind.execute(
                sa.text('UPDATE service_filings SET compliance_due_date = :val WHERE id = :id'),
                {"val": compliance_due_date, "id": row.id},
            )


def downgrade() -> None:
    op.drop_column('service_filings', 'compliance_due_date')
