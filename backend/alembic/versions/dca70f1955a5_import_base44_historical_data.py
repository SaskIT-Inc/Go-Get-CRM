"""import real historical data exported from Base44 (Leads, Clients, ServiceFilings, Tasks, Activities)

Reads the five CSVs checked into backend/data_imports/ (verbatim exports —
data cleaning happens here, not in the files) and inserts them using their
original Base44 `id` values as the new primary keys. This is deliberate and
load-bearing: cross-references between the exports (e.g. a Task's
`service_filing_id` pointing at a real ServiceFiling `id`, a Lead's
`converted_to_client_id` pointing at a real Client `id`) only keep working
if the IDs are preserved rather than regenerated. None of these tables have
enforced foreign keys in this schema, so reusing the original hex IDs as
plain String primary keys is safe.

Idempotent via INSERT ... ON CONFLICT (id) DO NOTHING — safe to re-run
(e.g. if this migration runs again on an environment that already has some
of this data from a prior partial run).

Revision ID: dca70f1955a5
Revises: 53c27160a071
Create Date: 2026-08-08 15:00:00.000000

"""
import csv
import json
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import insert as pg_insert

# revision identifiers, used by Alembic.
revision: str = 'dca70f1955a5'
down_revision: Union[str, None] = '53c27160a071'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_DIR = Path(__file__).resolve().parents[2] / "data_imports"

# CSV headers that never belong on the record itself (Base44 internal
# bookkeeping) — always dropped, never even kept in `extra`.
ALWAYS_SKIP = {"is_sample", "created_by_id"}
BASE_COLUMNS = {"id", "created_date", "updated_date", "created_by"}


def _fix_mojibake(text: str) -> str:
    """Best-effort cleanup of a lossy encoding round-trip somewhere in
    Base44's own CSV export pipeline: 'Ã©' should be 'é', a stray 'Â'
    before a space is a mis-decoded non-breaking space, and 'â' standing
    alone between two phrase fragments (e.g. "T2 ... â Basic") was an
    en/em dash."""
    text = text.replace("Ã©", "é").replace("Ã¨", "è").replace("Ã¯", "ï")
    text = text.replace("Â ", " ").replace("Â", "")
    text = re.sub(r"\s?â\s", " – ", text)
    return text.strip()


def _clean(value) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    return _fix_mojibake(value)


def _to_int(value):
    value = _clean(value)
    if value is None:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def _to_decimal(value):
    value = _clean(value)
    if value is None:
        return None
    try:
        return Decimal(value.replace(",", "").replace("$", ""))
    except (InvalidOperation, ValueError):
        return None


def _to_json_list(value):
    value = _clean(value)
    if value is None:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _to_timestamp(value: str) -> datetime:
    value = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _read_csv(name: str) -> list[dict]:
    with (DATA_DIR / name).open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _build_rows(csv_name: str, column_types: dict) -> list[dict]:
    """column_types maps a CSV header (== schema field name for every
    field in this dataset) to a converter function, or None for a plain
    cleaned string/text field. Any CSV header NOT in column_types (and not
    a base column or an always-skipped one) is preserved under `extra`
    instead of being silently dropped — e.g. ServiceFiling's `service_id`
    (a dangling reference to Base44's old, now-gone Service Catalog) still
    ends up recorded there for provenance, just not wired to the real
    (unrelated) new catalog."""
    rows = []
    for csv_row in _read_csv(csv_name):
        record = {
            "id": csv_row["id"].strip(),
            "created_date": _to_timestamp(csv_row["created_date"]),
            "updated_date": _to_timestamp(csv_row["updated_date"]),
            "created_by": _clean(csv_row.get("created_by")),
        }
        extra = {}
        for header, raw_value in csv_row.items():
            if header in BASE_COLUMNS or header in ALWAYS_SKIP:
                continue
            if header in column_types:
                converter = column_types[header]
                record[header] = converter(raw_value) if converter else _clean(raw_value)
            else:
                cleaned = _clean(raw_value)
                if cleaned is not None:
                    extra[header] = cleaned
        record["extra"] = extra
        rows.append(record)
    return rows


def _insert(bind, table, rows: list[dict]) -> None:
    if not rows:
        return
    stmt = pg_insert(table).values(rows).on_conflict_do_nothing(index_elements=["id"])
    bind.execute(stmt)


def _ensure_required(rows: list[dict], field: str, fallback) -> None:
    """A handful of individual clients in the export share one household
    contact and have no email of their own — Client.primary_email is
    NOT NULL, so give those a clearly-marked placeholder rather than
    failing the whole import. `fallback(row)` computes the value."""
    for row in rows:
        if row.get(field) is None:
            row[field] = fallback(row)


LEADS_TABLE = sa.table(
    "leads",
    sa.column("id", sa.String), sa.column("created_date", sa.DateTime(timezone=True)),
    sa.column("updated_date", sa.DateTime(timezone=True)), sa.column("created_by", sa.String),
    sa.column("contact_name", sa.String), sa.column("company_name", sa.String),
    sa.column("email", sa.String), sa.column("phone", sa.String),
    sa.column("lead_type", sa.String), sa.column("pipeline_type", sa.String),
    sa.column("lead_source", sa.String), sa.column("referral_source", sa.String),
    sa.column("services_interested", JSONB), sa.column("estimated_value", sa.Numeric),
    sa.column("urgency", sa.String), sa.column("notes", sa.Text),
    sa.column("next_follow_up", sa.String), sa.column("assigned_to", sa.String),
    sa.column("stage", sa.String), sa.column("probability", sa.Numeric),
    sa.column("extra", JSONB),
)
LEADS_COLUMN_TYPES = {
    "contact_name": None, "company_name": None, "email": None, "phone": None,
    "lead_type": None, "pipeline_type": None, "lead_source": None, "referral_source": None,
    "services_interested": _to_json_list, "estimated_value": _to_decimal,
    "urgency": None, "notes": None, "next_follow_up": None, "assigned_to": None,
    "stage": None, "probability": _to_decimal,
}

CLIENTS_TABLE = sa.table(
    "clients",
    sa.column("id", sa.String), sa.column("created_date", sa.DateTime(timezone=True)),
    sa.column("updated_date", sa.DateTime(timezone=True)), sa.column("created_by", sa.String),
    sa.column("client_type", sa.String), sa.column("individual_type", sa.String),
    sa.column("business_type", sa.String), sa.column("legal_name", sa.String),
    sa.column("operating_name", sa.String), sa.column("industry", sa.String),
    sa.column("preferred_office", sa.String), sa.column("preferred_contact_method", sa.String),
    sa.column("lead_source", sa.String), sa.column("referral_source", sa.String),
    sa.column("urgency_level", sa.String), sa.column("desired_start_date", sa.String),
    sa.column("primary_contact_name", sa.String), sa.column("contact_person_position", sa.String),
    sa.column("contact_person_email", sa.String), sa.column("contact_person_phone", sa.String),
    sa.column("contact_person_address", sa.String), sa.column("primary_email", sa.String),
    sa.column("primary_phone", sa.String), sa.column("website", sa.String),
    sa.column("address", sa.String), sa.column("city", sa.String),
    sa.column("province", sa.String), sa.column("postal_code", sa.String),
    sa.column("business_number", sa.String), sa.column("gst_hst_number", sa.String),
    sa.column("pst_number", sa.String), sa.column("payroll_number", sa.String),
    sa.column("corp_number_federal", sa.String), sa.column("corp_number_provincial", sa.String),
    sa.column("number_of_shareholders", sa.String), sa.column("incorporation_date", sa.String),
    sa.column("fiscal_year_end", sa.String), sa.column("number_of_employees", sa.Integer),
    sa.column("last_year_revenue", sa.String), sa.column("annual_revenue", sa.String),
    sa.column("services_needed", JSONB), sa.column("current_accounting_software", sa.String),
    sa.column("previous_accountant", sa.String), sa.column("outstanding_issues", sa.Text),
    sa.column("special_requirements", sa.Text), sa.column("status", sa.String),
    sa.column("assigned_to", sa.String), sa.column("client_value_tier", sa.String),
    sa.column("payment_terms", sa.String), sa.column("active_package", sa.String),
    sa.column("package_price", sa.String), sa.column("package_billing", sa.String),
    sa.column("safe_isc_user_id", sa.String), sa.column("safe_isc_password", sa.String),
    sa.column("safe_isc_web_code", sa.String), sa.column("safe_inc_canada_user_id", sa.String),
    sa.column("safe_inc_canada_password", sa.String), sa.column("safe_inc_canada_web_code", sa.String),
    sa.column("safe_pst_id", sa.String), sa.column("safe_pst_password", sa.String),
    sa.column("safe_cra_id", sa.String), sa.column("safe_cra_password", sa.String),
    sa.column("notes", sa.Text), sa.column("extra", JSONB),
)
CLIENTS_COLUMN_TYPES = {
    "client_type": None, "individual_type": None, "business_type": None, "legal_name": None,
    "operating_name": None, "industry": None, "preferred_office": None,
    "preferred_contact_method": None, "lead_source": None, "referral_source": None,
    "urgency_level": None, "desired_start_date": None, "primary_contact_name": None,
    "contact_person_position": None, "contact_person_email": None, "contact_person_phone": None,
    "contact_person_address": None, "primary_email": None, "primary_phone": None,
    "website": None, "address": None, "city": None, "province": None, "postal_code": None,
    "business_number": None, "gst_hst_number": None, "pst_number": None, "payroll_number": None,
    "corp_number_federal": None, "corp_number_provincial": None, "number_of_shareholders": None,
    "incorporation_date": None, "fiscal_year_end": None, "number_of_employees": _to_int,
    "last_year_revenue": None, "annual_revenue": None, "services_needed": _to_json_list,
    "current_accounting_software": None, "previous_accountant": None, "outstanding_issues": None,
    "special_requirements": None, "status": None, "assigned_to": None, "client_value_tier": None,
    "payment_terms": None, "active_package": None, "package_price": None, "package_billing": None,
    "safe_isc_user_id": None, "safe_isc_password": None, "safe_isc_web_code": None,
    "safe_inc_canada_user_id": None, "safe_inc_canada_password": None,
    "safe_inc_canada_web_code": None, "safe_pst_id": None, "safe_pst_password": None,
    "safe_cra_id": None, "safe_cra_password": None, "notes": None,
}

SERVICE_FILINGS_TABLE = sa.table(
    "service_filings",
    sa.column("id", sa.String), sa.column("created_date", sa.DateTime(timezone=True)),
    sa.column("updated_date", sa.DateTime(timezone=True)), sa.column("created_by", sa.String),
    sa.column("client_id", sa.String), sa.column("service_name", sa.String),
    sa.column("filing_year", sa.String), sa.column("fee", sa.Numeric),
    sa.column("filing_frequency", sa.String), sa.column("schedule_month", sa.String),
    sa.column("schedule_day", sa.Integer), sa.column("tax_cycle_start", sa.String),
    sa.column("tax_cycle_end", sa.String), sa.column("status", sa.String),
    sa.column("due_date", sa.String), sa.column("filed_date", sa.String),
    sa.column("assigned_to", sa.String), sa.column("required_documents", JSONB),
    sa.column("notes", sa.Text), sa.column("extra", JSONB),
)
SERVICE_FILINGS_COLUMN_TYPES = {
    "client_id": None, "service_name": None, "filing_year": None, "fee": _to_decimal,
    "filing_frequency": None, "schedule_month": None, "schedule_day": _to_int,
    "tax_cycle_start": None, "tax_cycle_end": None, "status": None, "due_date": None,
    "filed_date": None, "assigned_to": None, "required_documents": _to_json_list, "notes": None,
    # service_id deliberately absent -> falls into `extra` below instead of
    # the real column: it references Base44's old Service Catalog, which
    # doesn't exist in this system (reseeded fresh with new IDs).
}

TASKS_TABLE = sa.table(
    "tasks",
    sa.column("id", sa.String), sa.column("created_date", sa.DateTime(timezone=True)),
    sa.column("updated_date", sa.DateTime(timezone=True)), sa.column("created_by", sa.String),
    sa.column("title", sa.String), sa.column("description", sa.Text),
    sa.column("status", sa.String), sa.column("priority", sa.String),
    sa.column("assigned_to", sa.String), sa.column("client_id", sa.String),
    sa.column("service_filing_id", sa.String), sa.column("due_date", sa.String),
    sa.column("start_date", sa.String), sa.column("estimated_hours", sa.Numeric),
    sa.column("tags", JSONB), sa.column("extra", JSONB),
)
TASKS_COLUMN_TYPES = {
    "title": None, "description": None, "status": None, "priority": None,
    "assigned_to": None, "client_id": None, "service_filing_id": None, "due_date": None,
    "start_date": None, "estimated_hours": _to_decimal, "tags": _to_json_list,
}

ACTIVITIES_TABLE = sa.table(
    "activities",
    sa.column("id", sa.String), sa.column("created_date", sa.DateTime(timezone=True)),
    sa.column("updated_date", sa.DateTime(timezone=True)), sa.column("created_by", sa.String),
    sa.column("lead_id", sa.String), sa.column("client_id", sa.String),
    sa.column("activity_type", sa.String), sa.column("title", sa.String),
    sa.column("from_stage", sa.String), sa.column("to_stage", sa.String),
    sa.column("performed_by", sa.String), sa.column("activity_date", sa.String),
    sa.column("details", sa.Text), sa.column("extra", JSONB),
)
ACTIVITIES_COLUMN_TYPES = {
    "lead_id": None, "activity_type": None, "title": None, "from_stage": None,
    "to_stage": None, "performed_by": None, "activity_date": None, "details": None,
}

# (csv filename, sa.table, column-types map) in dependency order — Leads
# and Clients first since Tasks/ServiceFilings/Activities reference them
# (informally; no enforced FKs, but this keeps the intent readable).
IMPORTS = [
    ("leads.csv", LEADS_TABLE, LEADS_COLUMN_TYPES),
    ("clients.csv", CLIENTS_TABLE, CLIENTS_COLUMN_TYPES),
    ("service_filings.csv", SERVICE_FILINGS_TABLE, SERVICE_FILINGS_COLUMN_TYPES),
    ("tasks.csv", TASKS_TABLE, TASKS_COLUMN_TYPES),
    ("activities.csv", ACTIVITIES_TABLE, ACTIVITIES_COLUMN_TYPES),
]


def upgrade() -> None:
    bind = op.get_bind()
    for csv_name, table, column_types in IMPORTS:
        rows = _build_rows(csv_name, column_types)
        if table is CLIENTS_TABLE:
            _ensure_required(rows, "primary_email", lambda r: f"no-email+{r['id']}@import.local")
        _insert(bind, table, rows)


def downgrade() -> None:
    bind = op.get_bind()
    # Reverse order, and precise by-ID deletes rather than a table wipe —
    # safe even if other, unrelated rows share these tables.
    for csv_name, table, _ in reversed(IMPORTS):
        ids = [row["id"].strip() for row in _read_csv(csv_name)]
        if ids:
            bind.execute(sa.text(f"DELETE FROM {table.name} WHERE id = ANY(:ids)"), {"ids": ids})
