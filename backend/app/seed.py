"""Bootstraps Go-Get's single-firm data: the Firm settings row, a director
admin account, and starter reference data (vendors, document types, industry
types, offices, and team booking profiles). Every step is idempotent
(skipped if rows already exist), so this is safe to run on every boot
alongside app.migrate.

The service price list and monthly retainer packages are deliberately NOT
seeded here even though they used to be — they're versioned data that
changes over time (new tiers, renamed packages, corrected fees), which is
exactly what Alembic migrations are for (see
alembic/versions/d4e5f6a7b8c9_seed_additional_services.py and later). Having
both this script and migrations independently seed the same two tables
caused a real bug: whichever ran first silently "won," so a later migration
correcting a price could be silently no-op'd by this script's older,
inaccurate defaults still being idempotency-guarded as "already present."

Run manually with: python -m app.seed
"""

import asyncio

from sqlalchemy import func, select

from .config import settings
from .database import SessionLocal
from .models import MODELS
from .models.tenant_models import Firm
from .security import hash_password

User = MODELS["User"]
Vendor = MODELS["Vendor"]
DocumentType = MODELS["DocumentType"]
IndustryType = MODELS["IndustryType"]
Office = MODELS["Office"]
TeamMemberBookingProfile = MODELS["TeamMemberBookingProfile"]

DEFAULT_VENDORS = [
    {
        "name": "QuickBooks Accounting",
        "category": "Software",
        "contact_email": "support@quickbooks.com",
        "phone": "1-800-QUICKBOOKS",
        "services": ["Accounting Software", "Payroll Integration"],
        "status": "Active",
    },
    {
        "name": "Legal Services Inc",
        "category": "Legal",
        "contact_email": "info@legalservices.ca",
        "phone": "1-306-555-0100",
        "services": ["Corporate Law", "Incorporation"],
        "status": "Active",
    },
    {
        "name": "Tax Software Solutions",
        "category": "Software",
        "contact_email": "support@taxsoftware.com",
        "phone": "1-800-TAX-SOFT",
        "services": ["Tax Filing Software", "CRA Integration"],
        "status": "Active",
    },
]

DEFAULT_DOCUMENT_TYPES = [
    {"name": "Tax Slip - T4", "category": "Tax Documents", "description": "Employment income statement"},
    {"name": "Tax Slip - T5", "category": "Tax Documents", "description": "Investment income statement"},
    {"name": "Tax Slip - T3", "category": "Tax Documents", "description": "Trust income statement"},
    {"name": "Tax Slip - T4A", "category": "Tax Documents", "description": "Pension and other income"},
    {"name": "Tax Slip - T2125", "category": "Tax Documents", "description": "Business activities statement"},
    {"name": "Receipt - Medical", "category": "Receipts", "description": "Medical expense receipts"},
    {"name": "Receipt - Donation", "category": "Receipts", "description": "Charitable donation receipts"},
    {"name": "Receipt - Business Expense", "category": "Receipts", "description": "Business-related expenses"},
    {"name": "Bank Statement", "category": "Financial", "description": "Monthly bank statements"},
    {"name": "Invoice", "category": "Financial", "description": "Client invoices and billing"},
    {"name": "Financial Statement", "category": "Financial", "description": "Balance sheet, P&L"},
    {"name": "Corporate Document", "category": "Legal", "description": "Articles of incorporation, bylaws"},
    {"name": "ID Document", "category": "Identification", "description": "Passport, driver's license, etc."},
]

# NAICS-inspired general taxonomy, broad enough for any client's business mix.
DEFAULT_INDUSTRY_TYPES = [
    {"name": "Accounting / Bookkeeping"},
    {"name": "Agriculture & Farming"},
    {"name": "Arts, Entertainment & Recreation"},
    {"name": "Automotive (Repair Shop / Dealership / Parts)"},
    {"name": "Child Care"},
    {"name": "Construction & Real Estate"},
    {"name": "Consulting & Professional Services"},
    {"name": "E-Commerce"},
    {"name": "Education & Training"},
    {"name": "Finance & Insurance"},
    {"name": "Gas Station & Convenience Store"},
    {"name": "Government & Public Administration"},
    {"name": "Gym, Fitness & Beauty"},
    {"name": "Healthcare & Medical (Clinic / Dental / Wellness)"},
    {"name": "Hospitality & Tourism"},
    {"name": "Independent Contractor (Plumber / Electrician / HVAC / Painter / Roofer)"},
    {"name": "Indigenous Business"},
    {"name": "Information Technology / Software"},
    {"name": "Legal Services"},
    {"name": "Manufacturing"},
    {"name": "Mining, Oil & Gas"},
    {"name": "Non-Profit / Charity"},
    {"name": "Real Estate Investor"},
    {"name": "Restaurant & Café / Food Service"},
    {"name": "Retail Store"},
    {"name": "Senior Care"},
    {"name": "Transportation & Logistics"},
    {"name": "Wholesale Trade"},
    {"name": "Women-Led Business"},
    {"name": "Other"},
]

DEFAULT_OFFICES = [
    {"name": "Go-Get — Saskatoon", "city": "Saskatoon", "province": "SK", "is_primary": True, "is_active": True},
    {"name": "Go-Get — Regina", "city": "Regina", "province": "SK", "is_primary": False, "is_active": True},
]

# Confirmation-routing rule per the business's booking policy: Shorif's own
# inbox gets cc'd to cem@go-get.ca; cem's own confirmations need no separate
# cc since it's the same inbox. Both work 10:00-17:30 in 30-minute slots.
# zoom_link is left blank here — fill in the real per-person Zoom link via
# Settings > Team Members (Booking) once available; no placeholder URL is
# seeded since a fake link would silently break online bookings.
DEFAULT_BOOKING_PROFILES = [
    {
        "user_email": "shorif@go-get.ca",
        "notify_email": "Shorif@go-get.ca",
        "cc_emails": ["cem@go-get.ca"],
        "zoom_link": "",
        "working_hours_start": "10:00",
        "working_hours_end": "17:30",
        "slot_duration_minutes": 30,
        "is_active": True,
    },
    {
        "user_email": "cem@go-get.ca",
        "notify_email": "cem@go-get.ca",
        "cc_emails": [],
        "zoom_link": "",
        "working_hours_start": "10:00",
        "working_hours_end": "17:30",
        "slot_duration_minutes": 30,
        "is_active": True,
    },
]

async def _seed_rows(db, model, rows: list[dict]) -> None:
    count = (await db.execute(select(func.count()).select_from(model))).scalar_one()
    if count == 0:
        for row in rows:
            db.add(model(extra={}, **row))


async def seed_firm_defaults(db) -> None:
    await _seed_rows(db, Vendor, DEFAULT_VENDORS)
    await _seed_rows(db, DocumentType, DEFAULT_DOCUMENT_TYPES)
    await _seed_rows(db, IndustryType, DEFAULT_INDUSTRY_TYPES)
    await _seed_rows(db, Office, DEFAULT_OFFICES)
    await _seed_rows(db, TeamMemberBookingProfile, DEFAULT_BOOKING_PROFILES)
    await db.commit()


async def seed_admin() -> None:
    async with SessionLocal() as db:
        firm = (await db.execute(select(Firm).limit(1))).scalar_one_or_none()
        if firm is None:
            firm = Firm(name="Go-Get", extra={})
            db.add(firm)
            await db.flush()

        result = await db.execute(select(func.count()).select_from(User))
        if result.scalar_one() == 0:
            admin = User(
                email=settings.seed_admin_email.strip().lower(),
                hashed_password=hash_password(settings.seed_admin_password),
                full_name="Admin",
                role="director",
                permissions={},
                is_active=True,
                is_email_verified=True,
                extra={},
            )
            db.add(admin)
            print(f"Created director user: {admin.email}")
        else:
            print("Users already exist; skipping admin user seed.")

        await db.commit()
        await seed_firm_defaults(db)
        print("Firm defaults seeded (or already present).")


if __name__ == "__main__":
    asyncio.run(seed_admin())
