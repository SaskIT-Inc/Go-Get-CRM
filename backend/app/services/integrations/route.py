from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from . import service

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.post("/send-email")
async def integration_send_email(
    body: dict = Body(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await service.send_integration_email(db, user, body)
    except Exception as exc:
        # Unlike the best-effort sends elsewhere in the app, sending IS this
        # endpoint's whole job — surface a clean error instead of an opaque
        # 500 so the caller's toast/error UI can show something useful.
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Failed to send email: {exc}") from exc
    return {"success": True}


@router.get("/connected-accounts")
async def list_connected_accounts(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.list_connected_accounts(db, user)
