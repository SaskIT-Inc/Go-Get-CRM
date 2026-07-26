"""
Per-user OneDrive file upload adapter (Settings > Email > Connected Cloud
Storage). Mirrors adapters/gmail.py's token-refresh shape, but for
Microsoft Graph's delegated Files.ReadWrite scope instead of Gmail send —
each staff member or client connects their own personal/work/school OneDrive
via routers/onedrive_oauth.py, and files land in *their* account, not one
shared firm-wide drive.
"""

import datetime
from urllib.parse import quote

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import ConnectedOneDriveAccount
from ..security import decrypt_secret, encrypt_secret

MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
TOKEN_EXPIRY_BUFFER_SECONDS = 60


async def _get_access_token(account: ConnectedOneDriveAccount, db: AsyncSession) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    if (
        account.access_token_encrypted
        and account.access_token_expires_at
        and account.access_token_expires_at > now + datetime.timedelta(seconds=TOKEN_EXPIRY_BUFFER_SECONDS)
    ):
        return decrypt_secret(account.access_token_encrypted)

    refresh_token = decrypt_secret(account.refresh_token_encrypted)
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            MS_TOKEN_URL,
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
                "scope": "Files.ReadWrite offline_access User.Read",
            },
        )
        response.raise_for_status()
        data = response.json()

    access_token = data["access_token"]
    account.access_token_encrypted = encrypt_secret(access_token)
    account.access_token_expires_at = now + datetime.timedelta(seconds=data["expires_in"])
    # A rotated refresh token isn't guaranteed on every response, but save it
    # when Microsoft does send one rather than letting it go stale.
    if data.get("refresh_token"):
        account.refresh_token_encrypted = encrypt_secret(data["refresh_token"])
    await db.commit()
    return access_token


def _encode_path(path: str) -> str:
    """Percent-encode each path segment individually — a raw '/' in a
    folder/file name would otherwise be read as a path separator by Graph's
    colon-path addressing."""
    return "/".join(quote(segment, safe="") for segment in path.split("/"))


async def upload_file(
    account: ConnectedOneDriveAccount,
    db: AsyncSession,
    folder_path: str,
    filename: str,
    content: bytes,
) -> dict:
    """Uploads `content` to /{folder_path}/{filename} in the connected
    user's own OneDrive, creating any missing parent folders along the way
    (Graph's path-addressing upload does this automatically). Returns the
    created item's Graph metadata (includes webUrl)."""
    access_token = await _get_access_token(account, db)
    full_path = _encode_path(f"{folder_path}/{filename}")

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.put(
            f"{GRAPH_BASE_URL}/me/drive/root:/{full_path}:/content",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/octet-stream",
            },
            content=content,
        )
        response.raise_for_status()
        return response.json()
