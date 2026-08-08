"""Raw file upload — moved verbatim from the old routers/files.py."""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from ...config import settings

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


async def save_upload(file: UploadFile) -> dict:
    """Mirrors the shape of Base44's Core.UploadFile integration: returns {file_url}."""
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix
    stored_name = f"{uuid.uuid4()}{suffix}"
    destination = upload_dir / stored_name

    size = 0
    with destination.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds 25MB limit")
            out.write(chunk)

    file_url = f"{settings.upload_base_url.rstrip('/')}/{stored_name}"
    return {
        "file_url": file_url,
        "file_name": file.filename,
        "file_size": size,
        "file_type": file.content_type,
    }
