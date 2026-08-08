from fastapi import APIRouter, Depends, UploadFile

from ...deps import get_current_user
from . import service

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("")
async def upload_file(file: UploadFile, _user=Depends(get_current_user)):
    return await service.save_upload(file)
