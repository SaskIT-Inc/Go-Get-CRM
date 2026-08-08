"""
Go-Get's own firm-level settings — the single `Firm` row, never through the
generic entity CRUD engine (see models/tenant_models.py). Moved verbatim
from the old routers/company.py.

Company profile fields are typed columns on Firm; notification settings and
system preferences are small, rarely-queried flat blobs with no reporting/
filtering need, so they're kept in Firm.extra (JSONB) rather than earning
their own migration.
"""

import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.tenant_models import Firm

COMPANY_PROFILE_FIELDS = (
    "name",
    "legal_name",
    "business_number",
    "gst_number",
    "email",
    "phone",
    "address",
    "city",
    "province",
    "postal_code",
    "website",
    "logo_url",
)

NOTIFICATION_SETTINGS_DEFAULTS = {
    "email_notifications": True,
    "new_lead_alerts": True,
    "client_document_upload": True,
    "filing_deadline_reminder": True,
    "invoice_payment_received": True,
    "team_task_assignment": True,
    "days_before_deadline": 7,
}

SYSTEM_PREFERENCES_DEFAULTS = {
    "default_currency": "CAD",
    "date_format": "MM/DD/YYYY",
    "time_zone": "America/Toronto",
    "fiscal_year_end": "12-31",
    "default_tax_rate": 5,
    "invoice_terms": "Net 30",
    "auto_invoice_generation": True,
    "require_document_approval": False,
}


async def get_firm(db: AsyncSession) -> Firm:
    firm = (await db.execute(select(Firm).limit(1))).scalar_one_or_none()
    if firm is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Firm settings row is missing — run app.seed")
    return firm


def serialize_profile(firm: Firm) -> dict:
    return {field: getattr(firm, field) for field in COMPANY_PROFILE_FIELDS}


async def update_profile(firm: Firm, db: AsyncSession, body: dict) -> dict:
    for field in COMPANY_PROFILE_FIELDS:
        if field in body:
            setattr(firm, field, body[field])
    await db.commit()
    await db.refresh(firm)
    return serialize_profile(firm)


def read_blob(firm: Firm, key: str, defaults: dict) -> dict:
    return {**defaults, **(firm.extra or {}).get(key, {})}


async def write_blob(firm: Firm, db: AsyncSession, key: str, defaults: dict, body: dict) -> dict:
    merged = {**read_blob(firm, key, defaults), **body}
    extra = dict(firm.extra or {})
    extra[key] = merged
    firm.extra = extra
    await db.commit()
    await db.refresh(firm)
    return merged


async def get_website_integration(firm: Firm, db: AsyncSession) -> dict:
    if not firm.webhook_key:
        firm.webhook_key = secrets.token_urlsafe(24)
        await db.commit()
        await db.refresh(firm)
    return {
        "webhook_key": firm.webhook_key,
        "connected": firm.last_webhook_lead_at is not None,
        "last_lead_received_at": (
            firm.last_webhook_lead_at.isoformat() if firm.last_webhook_lead_at else None
        ),
    }
