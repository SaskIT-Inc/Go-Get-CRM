"""Send-as-the-user helper: uses a user's connected Gmail/Outlook account
(Settings > Email) when they have one, otherwise falls back to the
platform's shared sender. Three call sites used to each inline this same
if/elif/else independently (routers/integrations.py, scheduler.py,
routers/functions.py's sendDocumentEmail) — consolidated here so the
fallback behavior can't drift between them.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.email import send_email
from ...adapters.gmail import send_via_gmail
from ...adapters.outlook_mail import send_via_outlook
from ...models import ConnectedEmailAccount


async def send_as_user_or_fallback(
    db: AsyncSession,
    user_id: str | None,
    *,
    to,
    subject: str,
    body: str,
    html: bool = False,
    cc=None,
    attachments=None,
) -> None:
    account = None
    if user_id:
        result = await db.execute(select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user_id))
        account = result.scalar_one_or_none()

    if account and account.provider == "google":
        await send_via_gmail(account, db, to=to, subject=subject, body=body, html=html, cc=cc, attachments=attachments)
    elif account and account.provider == "microsoft":
        await send_via_outlook(account, db, to=to, subject=subject, body=body, html=html, cc=cc, attachments=attachments)
    else:
        await send_email(to=to, subject=subject, body=body, html=html, cc=cc, attachments=attachments)
