from pathlib import Path

from ...config import settings


def read_uploaded_file(file_url: str) -> bytes:
    """Local files uploaded through /api/files live at UPLOAD_DIR/{filename}
    — file_url is just that filename with UPLOAD_BASE_URL prefixed. Shared
    by ai_reports (OneDrive sync) and integrations (email attachments), both
    of which need to read a previously-uploaded file back off disk."""
    filename = file_url.rstrip("/").split("/")[-1]
    return (Path(settings.upload_dir) / filename).read_bytes()
