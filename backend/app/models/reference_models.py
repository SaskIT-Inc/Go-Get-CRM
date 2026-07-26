"""
Global reference data shared by every firm (e.g. CRA filing deadlines) —
identical federal tax rules for all tenants, so unlike Client/Service/etc.
these live once in the central DB rather than being duplicated into every
per-firm database. Hand-written rather than an ENTITY_DEFINITIONS entry: no
tenant_id, no generic /api/{entity} CRUD, no per-firm editability.
"""

from sqlalchemy import Column, Integer, Numeric, String

from ..database import Base
from .factory import BaseColumnsMixin


class CRAFormReference(BaseColumnsMixin, Base):
    __tablename__ = "cra_form_references"

    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    deadline = Column(String, nullable=True)
    category = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    # "Federal" for the original CRA-only rows, or a province name for the
    # provincial sales-tax/annual-return rows added alongside
    # ProvincialTaxInfo below — lets the CRA Forms page group/filter by
    # jurisdiction instead of presenting every firm a federal-only list.
    jurisdiction = Column(String, nullable=False, default="Federal", server_default="Federal")


class ProvincialTaxInfo(BaseColumnsMixin, Base):
    """Sales tax facts per province/territory — identical for every firm,
    so this is central reference data (like CRAFormReference above), not a
    per-tenant setting. Feeds the dynamic tax rate/label logic in Client
    Onboarding and EstimateBuilder instead of a single flat firm-wide rate."""

    __tablename__ = "provincial_tax_info"

    province = Column(String, nullable=False, unique=True)
    abbreviation = Column(String, nullable=False)
    tax_system = Column(String, nullable=False)  # "GST only" | "GST + PST" | "HST" | "GST + QST"
    gst_rate = Column(Numeric, nullable=False)
    provincial_rate = Column(Numeric, nullable=True)
    combined_rate = Column(Numeric, nullable=False)
    # Label for the province's own sales-tax registration number field, or
    # null where there isn't one (GST-only and HST provinces don't have a
    # separate provincial number — HST is remitted through the same GST/HST
    # account, and GST-only provinces have no provincial sales tax at all).
    sales_tax_number_label = Column(String, nullable=True)
    filing_authority_federal = Column(String, nullable=False, default="CRA")
    filing_authority_provincial = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
