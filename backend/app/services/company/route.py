from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import require_admin
from . import service

router = APIRouter(prefix="/api", tags=["company"])


@router.get("/company-profile")
async def get_company_profile(db: AsyncSession = Depends(get_db)):
    return service.serialize_profile(await service.get_firm(db))


@router.patch("/company-profile")
async def update_company_profile(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    firm = await service.get_firm(db)
    return await service.update_profile(firm, db, body)


@router.get("/notification-settings")
async def get_notification_settings(db: AsyncSession = Depends(get_db)):
    return service.read_blob(await service.get_firm(db), "notification_settings", service.NOTIFICATION_SETTINGS_DEFAULTS)


@router.patch("/notification-settings")
async def update_notification_settings(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    firm = await service.get_firm(db)
    return await service.write_blob(firm, db, "notification_settings", service.NOTIFICATION_SETTINGS_DEFAULTS, body)


@router.get("/system-preferences")
async def get_system_preferences(db: AsyncSession = Depends(get_db)):
    return service.read_blob(await service.get_firm(db), "system_preferences", service.SYSTEM_PREFERENCES_DEFAULTS)


@router.patch("/system-preferences")
async def update_system_preferences(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    firm = await service.get_firm(db)
    return await service.write_blob(firm, db, "system_preferences", service.SYSTEM_PREFERENCES_DEFAULTS, body)


@router.get("/website-integration")
async def get_website_integration(db: AsyncSession = Depends(get_db)):
    firm = await service.get_firm(db)
    return await service.get_website_integration(firm, db)
