from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..adapters.email import send_email
from ..adapters.gmail import send_via_gmail
from ..adapters.outlook_mail import send_via_outlook
from ..database import get_db
from ..deps import get_current_user
from ..models import ConnectedEmailAccount

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.post("/send-email")
async def integration_send_email(
    body: dict = Body(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mirrors Base44's Core.SendEmail integration. Sends via the caller's
    own connected Gmail/Outlook (Settings > Email) if they have one;
    otherwise falls back to the platform's shared sender, unchanged."""
    cc = body.get("cc")
    if isinstance(cc, str):
        cc = [addr.strip() for addr in cc.split(",") if addr.strip()]

    result = await db.execute(
        select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()

    try:
        if account and account.provider == "google":
            await send_via_gmail(
                account,
                db,
                to=body.get("to"),
                subject=body.get("subject", ""),
                body=body.get("body", ""),
                html=bool(body.get("html")),
                cc=cc or None,
            )
        elif account and account.provider == "microsoft":
            await send_via_outlook(
                account,
                db,
                to=body.get("to"),
                subject=body.get("subject", ""),
                body=body.get("body", ""),
                html=bool(body.get("html")),
                cc=cc or None,
            )
        else:
            await send_email(
                to=body.get("to"),
                subject=body.get("subject", ""),
                body=body.get("body", ""),
                html=bool(body.get("html")),
                cc=cc or None,
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
