"""Mirrors Base44's Core.SendEmail integration and lists a user's connected
mailbox — moved verbatim from the old routers/integrations.py, now sending
through the shared services/_shared/email_dispatch helper instead of its own
inline account-lookup/if-elif-else."""

import mimetypes

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models import ConnectedEmailAccount
from .._shared.email_dispatch import send_as_user_or_fallback
from .._shared.uploaded_files import read_uploaded_file


def split_addresses(value) -> list[str] | None:
    if isinstance(value, str):
        return [addr.strip() for addr in value.split(",") if addr.strip()]
    if isinstance(value, list):
        return [addr.strip() for addr in value if addr and addr.strip()]
    return None


def resolve_attachments(raw_attachments: list) -> list[dict]:
    """Frontend sends {name, url} for each previously-uploaded file — read
    the bytes back off disk and guess a content-type so adapters can embed
    them as real MIME/Graph attachments instead of dropping them."""
    resolved = []
    for a in raw_attachments or []:
        url = a.get("url") or a.get("file_url")
        if not url:
            continue
        try:
            content = read_uploaded_file(url)
        except OSError:
            continue
        name = a.get("name") or url.rstrip("/").split("/")[-1]
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        resolved.append({"name": name, "content_type": content_type, "content": content})
    return resolved


async def send_integration_email(db: AsyncSession, user, body: dict) -> None:
    """Sends via the caller's own connected Gmail/Outlook (Settings > Email)
    if they have one; otherwise falls back to the platform's shared
    sender."""
    to = split_addresses(body.get("to"))
    cc = split_addresses(body.get("cc"))
    attachments = resolve_attachments(body.get("attachments")) or None

    await send_as_user_or_fallback(
        db,
        user.id,
        to=to,
        subject=body.get("subject", ""),
        body=body.get("body", ""),
        html=bool(body.get("html")),
        cc=cc,
        attachments=attachments,
    )


async def list_connected_accounts(db: AsyncSession, user) -> list[dict]:
    result = await db.execute(
        select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        return []
    return [{"provider": account.provider, "email_address": account.email_address}]
