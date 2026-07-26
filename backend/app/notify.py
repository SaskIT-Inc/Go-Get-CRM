"""
Notification fan-out and activity logging. notify_firm() broadcasts a
Notification row to every staff member who can view a given module,
excluding whoever performed the triggering action (no one needs to be told
about their own action). log_activity() writes a single Activity row for a
client's audit trail. Both are called from generic.py's create_entity/
update_entity as server-side side effects of an action the user is already
authorized to perform — never through a user-initiated Activity.create,
which is why neither checks the acting user's own permissions on the
Notification/Activity entities themselves.
"""

import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .adapters.email import send_email
from .models import MODELS
from .modules import STAFF_ROLES, has_permission

User = MODELS["User"]
Notification = MODELS["Notification"]
Activity = MODELS["Activity"]

# Every new lead — however it enters the pipeline (internal "Capture New
# Lead" page via generic.py, or the public website webhook via public.py) —
# gets emailed to Go-Get's lead-intake team immediately, same to/cc routing
# already used for appointment confirmations (LeadDetailsModal.jsx).
LEAD_CAPTURED_TO_EMAIL = "Shorif@go-get.ca"
LEAD_CAPTURED_CC_EMAILS = ["cem@go-get.ca"]


async def notify_lead_captured(lead) -> None:
    """Best-effort: callers wrap this in try/except so a transient send
    failure never blocks the lead creation it's reporting on."""
    subject = f"New lead: {lead.contact_name}" + (f" ({lead.company_name})" if lead.company_name else "")
    body = (
        "A new lead was just added to the pipeline.\n\n"
        f"Name: {lead.contact_name}\n"
        f"Company: {lead.company_name or '—'}\n"
        f"Email: {lead.email or '—'}\n"
        f"Phone: {lead.phone or '—'}\n"
        f"Source: {lead.lead_source or '—'}\n"
        f"Pipeline: {lead.pipeline_type or '—'}\n"
        f"Notes: {lead.notes or '—'}\n"
    )
    await send_email(to=LEAD_CAPTURED_TO_EMAIL, cc=LEAD_CAPTURED_CC_EMAILS, subject=subject, body=body)


async def notify_firm(
    *,
    db: AsyncSession,
    actor_email: str,
    module: str,
    notif_type: str,
    title: str,
    body: str,
    link_url: str,
) -> None:
    """Fan out a Notification row to every staff member who can view
    `module`, excluding the actor. Best-effort: recipients with no view
    access are skipped, not an error; callers wrap this in try/except so a
    notification hiccup never blocks the actual create/update it's
    reporting on."""
    staff = (await db.execute(select(User).where(User.role.in_(STAFF_ROLES)))).scalars().all()
    recipients = [u.email for u in staff if u.email != actor_email and has_permission(u, module, "view")]
    if not recipients:
        return
    for email in recipients:
        db.add(
            Notification(
                recipient_email=email,
                type=notif_type,
                title=title,
                body=body,
                link_url=link_url,
                actor_email=actor_email,
                extra={},
            )
        )
    await db.commit()


async def log_activity(
    *,
    db: AsyncSession,
    client_id: str,
    actor_email: str,
    activity_type: str,
    title: str,
    from_stage: str | None = None,
    to_stage: str | None = None,
    details: str | None = None,
) -> None:
    """Write one Activity row for a client's audit trail. Unlike notify_firm
    there's no recipient fan-out — this is a single insert, committed
    immediately since callers treat it as fire-and-forget (wrapped in
    try/except at the call site)."""
    db.add(
        Activity(
            client_id=client_id,
            activity_type=activity_type,
            title=title,
            from_stage=from_stage,
            to_stage=to_stage,
            performed_by=actor_email,
            activity_date=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            details=details,
            extra={},
        )
    )
    await db.commit()
