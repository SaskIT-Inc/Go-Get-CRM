"""Read-only CRA filing deadline reference (Settings > CRA Forms Reference).
Global, not tenant-scoped — see models/reference_models.py. Moved verbatim
from the old routers/cra_forms.py."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from ...models import CRAFormReference

router = APIRouter(prefix="/api", tags=["cra-forms"])


@router.get("/cra-forms")
async def list_cra_forms(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(CRAFormReference).order_by(CRAFormReference.sort_order))
    forms = result.scalars().all()
    return [
        {
            "id": form.id,
            "code": form.code,
            "name": form.name,
            "deadline": form.deadline,
            "category": form.category,
            "jurisdiction": form.jurisdiction,
        }
        for form in forms
    ]
