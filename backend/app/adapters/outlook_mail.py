"""
Per-user Outlook send adapter (Settings > Email "Connect Outlook"). Mirrors
adapters/gmail.py's shape, but against Microsoft Graph's delegated
Mail.Send scope instead of Gmail's — distinct from adapters/email.py's
Graph/SMTP sender, which is the platform's own fixed identity used only for
signup verification and other transactional mail.
"""

import base64
import datetime

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import ConnectedEmailAccount
from ..security import decrypt_secret, encrypt_secret

MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_SEND_MAIL_URL = "https://graph.microsoft.com/v1.0/me/sendMail"
OUTLOOK_SCOPE = "Mail.Send offline_access User.Read"
TOKEN_EXPIRY_BUFFER_SECONDS = 60


async def _get_access_token(account: ConnectedEmailAccount, db: AsyncSession) -> str:
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
                "scope": OUTLOOK_SCOPE,
            },
        )
        response.raise_for_status()
        data = response.json()

    access_token = data["access_token"]
    account.access_token_encrypted = encrypt_secret(access_token)
    account.access_token_expires_at = now + datetime.timedelta(seconds=data["expires_in"])
    if data.get("refresh_token"):
        account.refresh_token_encrypted = encrypt_secret(data["refresh_token"])
    await db.commit()
    return access_token


async def send_via_outlook(
    account: ConnectedEmailAccount,
    db: AsyncSession,
    to: str | list[str],
    subject: str,
    body: str,
    html: bool = False,
    cc: list[str] | None = None,
    attachments: list[dict] | None = None,
) -> None:
    access_token = await _get_access_token(account, db)
    to_list = [to] if isinstance(to, str) else to

    message = {
        "subject": subject,
        "body": {"contentType": "HTML" if html else "Text", "content": body},
        "toRecipients": [{"emailAddress": {"address": addr}} for addr in to_list],
    }
    if cc:
        message["ccRecipients"] = [{"emailAddress": {"address": addr}} for addr in cc]
    if attachments:
        message["attachments"] = [
            {
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": a["name"],
                "contentType": a.get("content_type") or "application/octet-stream",
                "contentBytes": base64.b64encode(a["content"]).decode("ascii"),
            }
            for a in attachments
        ]

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            GRAPH_SEND_MAIL_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            json={"message": message, "saveToSentItems": True},
        )
        response.raise_for_status()
