import mimetypes

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..adapters.email import send_email
from ..adapters.gmail import send_via_gmail
from ..adapters.outlook_mail import send_via_outlook
from ..database import get_db
from ..deps import get_current_user
from ..models import ConnectedEmailAccount
from .functions import _read_uploaded_file

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def _split_addresses(value) -> list[str] | None:
    if isinstance(value, str):
        return [addr.strip() for addr in value.split(",") if addr.strip()]
    if isinstance(value, list):
        return [addr.strip() for addr in value if addr and addr.strip()]
    return None


def _resolve_attachments(raw_attachments: list) -> list[dict]:
    """Frontend sends {name, url} for each previously-uploaded file — read
    the bytes back off disk and guess a content-type so adapters can embed
    them as real MIME/Graph attachments instead of dropping them."""
    resolved = []
    for a in raw_attachments or []:
        url = a.get("url") or a.get("file_url")
        if not url:
            continue
        try:
            content = _read_uploaded_file(url)
        except OSError:
            continue
        name = a.get("name") or url.rstrip("/").split("/")[-1]
        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
        resolved.append({"name": name, "content_type": content_type, "content": content})
    return resolved


@router.post("/send-email")
async def integration_send_email(
    body: dict = Body(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mirrors Base44's Core.SendEmail integration. Sends via the caller's
    own connected Gmail/Outlook (Settings > Email) if they have one;
    otherwise falls back to the platform's shared sender, unchanged."""
    to = _split_addresses(body.get("to"))
    cc = _split_addresses(body.get("cc"))
    attachments = _resolve_attachments(body.get("attachments")) or None

    result = await db.execute(
        select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()

    try:
        if account and account.provider == "google":
            await send_via_gmail(
                account,
                db,
                to=to,
                subject=body.get("subject", ""),
                body=body.get("body", ""),
                html=bool(body.get("html")),
                cc=cc or None,
                attachments=attachments,
            )
        elif account and account.provider == "microsoft":
            await send_via_outlook(
                account,
                db,
                to=to,
                subject=body.get("subject", ""),
                body=body.get("body", ""),
                html=bool(body.get("html")),
                cc=cc or None,
                attachments=attachments,
            )
        else:
            await send_email(
                to=to,
                subject=body.get("subject", ""),
                body=body.get("body", ""),
                html=bool(body.get("html")),
                cc=cc or None,
                attachments=attachments,
            )
    except Exception as exc:
        # Unlike the best-effort sends elsewhere in the app, sending IS this
        # endpoint's whole job — surface a clean error instead of an opaque
        # 500 so the caller's toast/error UI can show something useful.
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Failed to send email: {exc}") from exc
    return {"success": True}


@router.get("/connected-accounts")
async def list_connected_accounts(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        return []
    return [{"provider": account.provider, "email_address": account.email_address}]
