"""
Go-Get's own firm-level settings — the single `Firm` row, never through
routers/generic.py's generic /api/{entity} CRUD (see models/tenant_models.py).

Company profile fields are typed columns on Firm; notification settings and
system preferences are small, rarely-queried flat blobs with no reporting/
filtering need, so they're kept in Firm.extra (JSONB) rather than earning
their own migration.
"""

import secrets

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import require_admin
from ..models.tenant_models import Firm

router = APIRouter(prefix="/api", tags=["company"])

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


async def get_firm(db: AsyncSession) -> Firm:
    firm = (await db.execute(select(Firm).limit(1))).scalar_one_or_none()
    if firm is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Firm settings row is missing — run app.seed")
    return firm


def _serialize(firm: Firm) -> dict:
    return {field: getattr(firm, field) for field in COMPANY_PROFILE_FIELDS}


@router.get("/company-profile")
async def get_company_profile(db: AsyncSession = Depends(get_db)):
    return _serialize(await get_firm(db))


@router.patch("/company-profile")
async def update_company_profile(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    firm = await get_firm(db)
    for field in COMPANY_PROFILE_FIELDS:
        if field in body:
            setattr(firm, field, body[field])
    await db.commit()
    await db.refresh(firm)
    return _serialize(firm)


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


def _read_blob(firm: Firm, key: str, defaults: dict) -> dict:
    return {**defaults, **(firm.extra or {}).get(key, {})}


async def _write_blob(firm: Firm, db: AsyncSession, key: str, defaults: dict, body: dict) -> dict:
    merged = {**_read_blob(firm, key, defaults), **body}
    extra = dict(firm.extra or {})
    extra[key] = merged
    firm.extra = extra
    await db.commit()
    await db.refresh(firm)
    return merged


@router.get("/notification-settings")
async def get_notification_settings(db: AsyncSession = Depends(get_db)):
    return _read_blob(await get_firm(db), "notification_settings", NOTIFICATION_SETTINGS_DEFAULTS)


@router.patch("/notification-settings")
async def update_notification_settings(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    return await _write_blob(await get_firm(db), db, "notification_settings", NOTIFICATION_SETTINGS_DEFAULTS, body)


@router.get("/system-preferences")
async def get_system_preferences(db: AsyncSession = Depends(get_db)):
    return _read_blob(await get_firm(db), "system_preferences", SYSTEM_PREFERENCES_DEFAULTS)


@router.patch("/system-preferences")
async def update_system_preferences(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    return await _write_blob(await get_firm(db), db, "system_preferences", SYSTEM_PREFERENCES_DEFAULTS, body)


@router.get("/website-integration")
async def get_website_integration(db: AsyncSession = Depends(get_db)):
    firm = await get_firm(db)
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
