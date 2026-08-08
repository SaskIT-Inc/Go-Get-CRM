"""
In-process recurring-job runner. The deployment is a single uvicorn worker
(see docker-compose.yml/Dockerfile — no --workers flag), so an in-process
scheduler is safe here: there's only ever one process that could run a job,
so there's no risk of the same tick firing twice concurrently.

Two jobs: sending due RecurringEmailSequence follow-ups, and rolling
overdue Tasks forward to next month.
"""

import calendar
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from .adapters.email import send_email
from .adapters.gmail import send_via_gmail
from .adapters.outlook_mail import send_via_outlook
from .database import SessionLocal
from .models import MODELS, ConnectedEmailAccount
from .notify import log_activity, notify_specific_staff, recipients_for_client

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


def _add_one_month(d: date) -> date:
    """Advance a date by one calendar month, clamping the day to the target
    month's length (e.g. Jan 31 -> Feb 28/29) — plain stdlib `calendar`, no
    new dependency."""
    month = d.month + 1
    year = d.year + (1 if month > 12 else 0)
    month = 1 if month > 12 else month
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


async def roll_over_overdue_tasks() -> None:
    """Daily sweep: any Task still open (status != Complete) whose due_date
    has passed gets automatically pushed one month forward. The original
    due date is preserved in task.extra['overdue_reschedule_history'] (a
    list, so repeated misses accumulate a visible trail) rather than lost,
    and the assignee is notified — see [[project's My Tasks overdue-rollover
    feature]] for why this exists: a task that's overdue in January
    shouldn't just silently vanish into February with no record."""
    Task = MODELS["Task"]
    today_iso = date.today().isoformat()

    async with SessionLocal() as db:
        result = await db.execute(
            select(Task).where(
                Task.due_date.isnot(None),
                Task.due_date < today_iso,
                Task.status != "Complete",
            )
        )
        overdue_tasks = result.scalars().all()

        for task in overdue_tasks:
            try:
                old_due_iso = task.due_date
                new_due_iso = _add_one_month(date.fromisoformat(old_due_iso)).isoformat()
                now_iso = datetime.now(timezone.utc).isoformat()

                extra = dict(task.extra or {})
                history = list(extra.get("overdue_reschedule_history") or [])
                history.append({"from": old_due_iso, "to": new_due_iso, "at": now_iso})
                extra["overdue_reschedule_history"] = history
                task.extra = extra
                task.due_date = new_due_iso
                await db.commit()
            except Exception:
                await db.rollback()
                logger.exception("Failed to auto-reschedule overdue task %s", task.id)
                continue

            if task.client_id:
                try:
                    await log_activity(
                        db=db,
                        client_id=task.client_id,
                        actor_email="system",
                        activity_type="task_rescheduled",
                        title=f"Task auto-rescheduled (was overdue): {task.title}",
                        from_stage=old_due_iso,
                        to_stage=new_due_iso,
                        details=f"Due date automatically pushed from {old_due_iso} to {new_due_iso} after going overdue.",
                        extra={
                            "task_id": task.id,
                            "assigned_to": task.assigned_to,
                            "from_due_date": old_due_iso,
                            "to_due_date": new_due_iso,
                        },
                    )
                except Exception:
                    logger.exception("Failed to log auto-reschedule activity for task %s", task.id)

            if task.assigned_to:
                try:
                    await notify_specific_staff(
                        db=db,
                        actor_email="system",
                        recipients=[task.assigned_to],
                        notif_type="task_overdue_rescheduled",
                        title="Overdue task rescheduled",
                        body=f"\"{task.title}\" was overdue and has been automatically moved to {new_due_iso}.",
                        link_url="/Tasks",
                    )
                except Exception:
                    logger.exception("Failed to notify assignee of auto-reschedule for task %s", task.id)
