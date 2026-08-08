"""Read-only provincial sales-tax reference (dynamic tax engine — see
models/reference_models.py's ProvincialTaxInfo). Global, not tenant-scoped:
identical for every firm regardless of which province they're in. Moved
verbatim from the old routers/provincial_tax.py."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from ...models import ProvincialTaxInfo

router = APIRouter(prefix="/api", tags=["provincial-tax"])


@router.get("/provincial-tax-info")
async def list_provincial_tax_info(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(ProvincialTaxInfo).order_by(ProvincialTaxInfo.sort_order))
    rows = result.scalars().all()
    return [
        {
            "id": row.id,
            "province": row.province,
            "abbreviation": row.abbreviation,
            "tax_system": row.tax_system,
            "gst_rate": float(row.gst_rate),
            "provincial_rate": float(row.provincial_rate) if row.provincial_rate is not None else None,
            "combined_rate": float(row.combined_rate),
            "sales_tax_number_label": row.sales_tax_number_label,
            "filing_authority_federal": row.filing_authority_federal,
            "filing_authority_provincial": row.filing_authority_provincial,
            "notes": row.notes,
        }
        for row in rows
    ]
