"""
Per-user Gmail send adapter (Settings > Email "Connect Gmail"). Distinct
from adapters/email.py's Graph/SMTP sender, which is the platform's own
fixed identity used only for signup verification and other transactional
mail — this sends as the individual staff member's own connected mailbox.
"""

import base64
import datetime
import mimetypes
from email.message import EmailMessage

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import ConnectedEmailAccount
from ..security import decrypt_secret, encrypt_secret

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
TOKEN_EXPIRY_BUFFER_SECONDS = 60


async def _get_access_token(account: ConnectedEmailAccount, db: AsyncSession) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    if (
        account.access_token_encrypted
        and account.access_token_expires_at
        and account.access_token_expires_at
        > now + datetime.timedelta(seconds=TOKEN_EXPIRY_BUFFER_SECONDS)
    ):
        return decrypt_secret(account.access_token_encrypted)

    refresh_token = decrypt_secret(account.refresh_token_encrypted)
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        data = response.json()

    access_token = data["access_token"]
    account.access_token_encrypted = encrypt_secret(access_token)
    account.access_token_expires_at = now + datetime.timedelta(seconds=data["expires_in"])
    await db.commit()
    return access_token


async def send_via_gmail(
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

    message = EmailMessage()
    message["From"] = account.email_address
    to_list = [to] if isinstance(to, str) else to
    message["To"] = ", ".join(to_list)
    if cc:
        message["Cc"] = ", ".join(cc)
    message["Subject"] = subject
    if html:
        message.add_alternative(body, subtype="html")
    else:
        message.set_content(body)

    for a in attachments or []:
        content_type = a.get("content_type") or mimetypes.guess_type(a["name"])[0] or "application/octet-stream"
        maintype, _, subtype = content_type.partition("/")
        message.add_attachment(a["content"], maintype=maintype or "application", subtype=subtype or "octet-stream", filename=a["name"])

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            GMAIL_SEND_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": raw},
        )
        response.raise_for_status()
