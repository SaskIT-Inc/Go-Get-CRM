"""
Generic transactional email adapter (replaces Base44's Core.SendEmail).

Sends via Microsoft Graph (Mail.Send, application permission, client-
credentials flow) when graph_* settings are configured — the primary path,
since Microsoft 365 tenants with Security Defaults enabled reject basic-auth
SMTP outright (see .env.example). Falls back to plain SMTP only when Graph
isn't configured.
"""

import base64
import logging
import mimetypes
import time

import aiosmtplib
import httpx
from email.message import EmailMessage
from email.utils import formataddr

from ..config import settings

logger = logging.getLogger(__name__)

GRAPH_SCOPE = "https://graph.microsoft.com/.default"
GRAPH_TOKEN_EXPIRY_BUFFER_SECONDS = 60

# Cached app-only access token — one app registration, one tenant, so a
# single module-level slot (refreshed lazily on expiry) is all this needs.
_graph_token: str | None = None
_graph_token_expires_at: float = 0.0


async def _get_graph_token() -> str:
    global _graph_token, _graph_token_expires_at

    now = time.monotonic()
    if _graph_token and now < _graph_token_expires_at - GRAPH_TOKEN_EXPIRY_BUFFER_SECONDS:
        return _graph_token

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"https://login.microsoftonline.com/{settings.graph_tenant_id}/oauth2/v2.0/token",
            data={
                "client_id": settings.graph_client_id,
                "client_secret": settings.graph_client_secret,
                "scope": GRAPH_SCOPE,
                "grant_type": "client_credentials",
            },
        )
        response.raise_for_status()
        data = response.json()

    _graph_token = data["access_token"]
    _graph_token_expires_at = now + data["expires_in"]
    return _graph_token


def _graph_attachments(attachments: list[dict] | None) -> list[dict] | None:
    if not attachments:
        return None
    return [
        {
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": a["name"],
            "contentType": a.get("content_type") or "application/octet-stream",
            "contentBytes": base64.b64encode(a["content"]).decode("ascii"),
        }
        for a in attachments
    ]


async def _send_via_graph(
    to: str | list[str],
    subject: str,
    body: str,
    html: bool,
    cc: list[str] | None,
    sender: str,
    attachments: list[dict] | None = None,
) -> None:
    token = await _get_graph_token()
    to_list = [to] if isinstance(to, str) else to
    message: dict = {
        "subject": subject,
        "body": {"contentType": "HTML" if html else "Text", "content": body},
        "toRecipients": [{"emailAddress": {"address": addr}} for addr in to_list],
    }
    if cc:
        message["ccRecipients"] = [{"emailAddress": {"address": addr}} for addr in cc]
    graph_attachments = _graph_attachments(attachments)
    if graph_attachments:
        message["attachments"] = graph_attachments

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": message, "saveToSentItems": "true"},
        )
        response.raise_for_status()


async def send_email(
    to: str | list[str],
    subject: str,
    body: str,
    html: bool = False,
    cc: list[str] | None = None,
    from_email: str | None = None,
    attachments: list[dict] | None = None,
) -> None:
    sender = from_email or settings.smtp_from

    if settings.graph_configured:
        await _send_via_graph(to, subject, body, html=html, cc=cc, sender=sender, attachments=attachments)
        return

    if not settings.smtp_host:
        logger.warning(
            "Email not configured (no Graph credentials or SMTP host); skipping email to %s (subject=%r)",
            to,
            subject,
        )
        return

    message = EmailMessage()
    message["From"] = formataddr((settings.smtp_from_name, sender))
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

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        start_tls=settings.smtp_use_tls,
    )
