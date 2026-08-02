"""
In-process recurring-job runner. The deployment is a single uvicorn worker
(see docker-compose.yml/Dockerfile — no --workers flag), so an in-process
scheduler is safe here: there's only ever one process that could run a job,
so there's no risk of the same tick firing twice concurrently.

Currently the only job is sending due RecurringEmailSequence follow-ups.
"""

import logging
from datetime import date, timedelta

from sqlalchemy import select

from .adapters.email import send_email
from .adapters.gmail import send_via_gmail
from .adapters.outlook_mail import send_via_outlook
from .database import SessionLocal
from .models import MODELS, ConnectedEmailAccount
from .notify import notify_specific_staff, recipients_for_client

logger = logging.getLogger(__name__)


async def send_due_recurring_emails() -> None:
    RecurringEmailSequence = MODELS["RecurringEmailSequence"]
    Client = MODELS["Client"]
    User = MODELS["User"]
    today = date.today().isoformat()

    async with SessionLocal() as db:
        result = await db.execute(
            select(RecurringEmailSequence).where(
                RecurringEmailSequence.status == "active",
                RecurringEmailSequence.next_send_date <= today,
            )
        )
        due = result.scalars().all()

        for sequence in due:
            try:
                client = await db.get(Client, sequence.client_id)
                if not client or not client.primary_email:
                    continue

                account = None
                if sequence.created_by:
                    user_result = await db.execute(select(User).where(User.email == sequence.created_by))
                    sender_user = user_result.scalar_one_or_none()
                    if sender_user:
                        account_result = await db.execute(
                            select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == sender_user.id)
                        )
                        account = account_result.scalar_one_or_none()

                if account and account.provider == "google":
                    await send_via_gmail(account, db, to=client.primary_email, subject=sequence.subject, body=sequence.body, html=True)
                elif account and account.provider == "microsoft":
                    await send_via_outlook(account, db, to=client.primary_email, subject=sequence.subject, body=sequence.body, html=True)
                else:
                    await send_email(to=client.primary_email, subject=sequence.subject, body=sequence.body, html=True)

                sequence.last_sent_date = today
                sequence.send_count = (sequence.send_count or 0) + 1
                if sequence.max_sends and sequence.send_count >= sequence.max_sends:
                    sequence.status = "stopped"
                    sequence.stopped_reason = "max_sends_reached"
                else:
                    interval = int(sequence.interval_days or 7)
                    sequence.next_send_date = (date.today() + timedelta(days=interval)).isoformat()

                await db.commit()

                # Best-effort: a notification hiccup must never look like a
                # failed send in the log/retry logic above, so it's isolated
                # in its own try/except after the real work is already
                # committed. "Other team members" = same recipient set the
                # manual Comms-thread notification uses (assigned staff +
                # admin/director), excluding whoever set the sequence up.
                try:
                    recipients = await recipients_for_client(db, client, exclude_email=sequence.created_by)
                    await notify_specific_staff(
                        db=db,
                        actor_email=sequence.created_by or "",
                        recipients=recipients,
                        notif_type="recurring_email_sent",
                        title="Recurring follow-up sent",
                        body=f"Automated follow-up sent to {client.legal_name}: \"{sequence.subject}\" (send #{int(sequence.send_count)})",
                        link_url=f"/ClientProfile?client={sequence.client_id}",
                    )
                except Exception:
                    logger.exception("Failed to notify team about recurring follow-up for sequence %s", sequence.id)
            except Exception:
                # One sequence failing to send must not block the rest of the
                # batch, and next_send_date is left untouched so it retries
                # on the next tick.
                await db.rollback()
                logger.exception("Failed to send recurring follow-up for sequence %s", sequence.id)
