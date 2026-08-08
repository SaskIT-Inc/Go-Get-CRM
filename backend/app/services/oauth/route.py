from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from . import service
from .service import ProviderConfig

GOOGLE_CFG, ONEDRIVE_CFG, OUTLOOK_CFG = service.build_provider_configs()


def _build_router(cfg: ProviderConfig) -> APIRouter:
    router = APIRouter(prefix=f"/api/integrations/{cfg.name}", tags=["integrations"])

    @router.get("/connect")
    async def connect(user=Depends(get_current_user)):
        return service.connect(cfg, user)

    @router.get("/callback")
    async def callback(
        code: str | None = Query(default=None),
        state: str | None = Query(default=None),
        error: str | None = Query(default=None),
        db: AsyncSession = Depends(get_db),
    ):
        return await service.callback(cfg, db, code, state, error)

    @router.delete("/disconnect")
    async def disconnect(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        return await service.disconnect(cfg, user, db)

    return router


google_router = _build_router(GOOGLE_CFG)
onedrive_router = _build_router(ONEDRIVE_CFG)
outlook_router = _build_router(OUTLOOK_CFG)


@onedrive_router.get("/status")
async def onedrive_status(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await service.get_account(ONEDRIVE_CFG, user, db)
    if account is None:
        return {"connected": False, "email_address": None}
    return {"connected": True, "email_address": account.email_address}


routers = [google_router, onedrive_router, outlook_router]
