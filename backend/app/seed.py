"""Bootstraps Go-Get's single-firm data: the Firm settings row, a director
admin account, and starter reference data (vendors, document types, industry
types, offices, team booking profiles, the service price list, and the
monthly retainer packages). Every step is idempotent (skipped if rows already
exist), so this is safe to run on every boot alongside app.migrate.

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
Service = MODELS["Service"]
Package = MODELS["Package"]

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
# inbox gets cc'd to cem@go-get.ca; Safayat's confirmations go to cem@go-get.ca
# directly (no separate Safayat inbox in use yet). Both work 10:00-17:30 in
# 30-minute slots. zoom_link is left blank here — fill in the real per-person
# Zoom link via Settings > Team Members (Booking) once available; no
# placeholder URL is seeded since a fake link would silently break online
# bookings.
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
        "user_email": "safayat@go-get.ca",
        "notify_email": "cem@go-get.ca",
        "cc_emails": [],
        "zoom_link": "",
        "working_hours_start": "10:00",
        "working_hours_end": "17:30",
        "slot_duration_minutes": 30,
        "is_active": True,
    },
]

# Go-Get's real service price list.
DEFAULT_SERVICES = [
    {
        "service_category": "Incorporation",
        "service_name": "Business Incorporation (Federal & Provincial)",
        "base_price": 999,
        "notes": "$999 + govt fees — Articles of Incorporation, BN registration",
        "is_active": True,
    },
    {
        "service_category": "Incorporation",
        "service_name": "Business Incorporation (Extra Provincial)",
        "base_price": 499,
        "notes": "$499 + govt fees — Provincial name reservation & registration",
        "is_active": True,
    },
    {
        "service_category": "CRA & Compliance",
        "service_name": "CRA Account Setup",
        "base_price": 99,
        "notes": "$99 — GST/PST & Payroll accounts under BN",
        "is_active": True,
    },
    {
        "service_category": "Bookkeeping",
        "service_name": "Bookkeeping Software Setup",
        "base_price": 449,
        "notes": "$449 — QBO/Xero setup, chart of accounts, tax codes",
        "is_active": True,
    },
    {
        "service_category": "Bookkeeping",
        "service_name": "Startup Bookkeeping Training",
        "base_price": 149,
        "notes": "$149 — 1-2 hrs of training in-person or Zoom",
        "is_active": True,
    },
    {
        "service_category": "Advisory",
        "service_name": "CPA Tax Consultation",
        "base_price": 350,
        "notes": "$350/hr — Tax planning, structure, or compliance advice",
        "is_active": True,
    },
    {
        "service_category": "CRA & Compliance",
        "service_name": "CRA Audit Support",
        "base_price": None,
        "notes": "Custom Quote — Payroll/GST audits; CRA correspondence",
        "is_active": True,
    },
    {
        "service_category": "Tax",
        "service_name": "Personal Tax Return (T1)",
        "base_price": 45,
        "notes": (
            "Starting at $45 — Newcomer & New Client: $45; Existing Client: $45; "
            "Self-Employed: starts at $100; Couple/family: 25% off (conditions apply)"
        ),
        "is_active": True,
    },
    {
        "service_category": "Tax",
        "service_name": "Business Tax Return (T2)",
        "base_price": 650,
        "notes": "Starting at $650 (conditions apply)",
        "is_active": True,
    },
    {
        "service_category": "Notary",
        "service_name": "Notary",
        "base_price": 40,
        "notes": "Starting at $40 (conditions apply)",
        "is_active": True,
    },
    {
        "service_category": "Government Benefits",
        "service_name": "Govt. Benefits & Application",
        "base_price": 75,
        "notes": (
            "Starting at $75 — Employment Insurance (EI) or Worker Compensation Benefit (WCB), "
            "Maternity Benefit Application (EI), GST/Federal Benefits, Low-income Tax Credit Application, "
            "Home Renovation Tax Credit Application, Graduate Retention Program, Child Benefit Application, "
            "Canada Passport Application/Renew, Bangladesh No Visa Required Application, Bangladesh Passport "
            "Application, Canada Carbon Rebate (CCR), Canada Caregiver Credit, Child Disability Benefit, "
            "Canada Workers Benefit (CWB), Disability Tax Credit (DTC), Health Card Application, Leisure "
            "Access program, Discounted Bus Service Application."
        ),
        "is_active": True,
    },
]

# Monthly retainer bundle tiers.
DEFAULT_PACKAGES = [
    {
        "name": "Essential",
        "price": "$299/month",
        "billing_frequency": "Monthly",
        "description": (
            "Bookkeeping: up to 150 transactions/month, quarterly bookkeeping, QBO Basic subscription.\n"
            "Tax: Corporate Tax (T2) & filing, 2 Personal Tax Returns included, GST/PST remittance, "
            "up to 10 T4/T4A/T5 slips.\n"
            "Payroll: up to 6 employees (no direct deposit).\n"
            "Support & Advisory: Email/Call/Text support, quarterly financial summary.\n"
            "Alerts & Insights: no financial alerts, no gov't benefit updates, no industry insights."
        ),
        "is_active": True,
    },
    {
        "name": "Standard",
        "price": "$599/month",
        "billing_frequency": "Monthly",
        "description": (
            "Bookkeeping: up to 350 transactions/month, monthly bookkeeping + reconciliation, "
            "QBO Standard subscription.\n"
            "Tax: Corporate Tax (T2) & filing, 3 Personal Tax Returns included, GST/PST remittance, "
            "up to 20 T4/T4A/T5 slips.\n"
            "Payroll: up to 20 employees (no direct deposit).\n"
            "Support & Advisory: Phone support + 1 hr consult/month, quarterly financial review meetings.\n"
            "Alerts & Insights: financial alerts, gov't benefit updates, basic industry tips."
        ),
        "is_active": True,
    },
    {
        "name": "Premium",
        "price": "$1,499/month",
        "billing_frequency": "Monthly",
        "description": (
            "Bookkeeping: up to 1,500 transactions/month, weekly bookkeeping + reconciliation, "
            "QBO subscription as required.\n"
            "Tax: Corporate Tax (T2) & filing, 5 Personal Tax Returns included, GST/PST remittance, "
            "up to 100 T4/T4A/T5 slips.\n"
            "Payroll: up to 100 employees (no direct deposit).\n"
            "Support & Advisory: Priority support, unlimited access, CFO-level strategic planning meetings.\n"
            "Alerts & Insights: real-time financial alerts, early access to gov't benefit updates, "
            "tailored industry insights & benchmarks."
        ),
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
    await _seed_rows(db, Service, DEFAULT_SERVICES)
    await _seed_rows(db, Package, DEFAULT_PACKAGES)
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
