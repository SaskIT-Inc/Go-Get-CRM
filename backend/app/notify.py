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
Client = MODELS["Client"]


async def _staff_emails_for_module(db: AsyncSession, module: str, *, exclude_email: str | None = None) -> list[str]:
    """Same recipient selection as notify_firm's fan-out, factored out so the
    email-sending helpers below (notify_client_document_uploaded,
    notify_client_message) target the same staff without duplicating the
    STAFF_ROLES + has_permission query."""
    staff = (await db.execute(select(User).where(User.role.in_(STAFF_ROLES)))).scalars().all()
    return [u.email for u in staff if u.email != exclude_email and has_permission(u, module, "view")]


async def recipients_for_client(db: AsyncSession, client, *, exclude_email: str | None = None) -> list[str]:
    """Who's actually allowed to chat with this client — director/admin (any
    client) plus their specific assigned team member — narrower than
    'everyone with clients view', matching the read/write access enforced in
    routers/generic.py's _communication_scope_filter."""
    staff = (await db.execute(select(User).where(User.role.in_(STAFF_ROLES)))).scalars().all()
    assigned = (client.assigned_to or "").lower()
    return [
        u.email
        for u in staff
        if u.email != exclude_email
        and has_permission(u, "clients", "view")
        and (u.role in ("director", "admin") or u.email == assigned)
    ]

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
    recipients = await _staff_emails_for_module(db, module, exclude_email=actor_email)
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


async def notify_specific_staff(
    *,
    db: AsyncSession,
    actor_email: str,
    recipients: list[str],
    notif_type: str,
    title: str,
    body: str,
    link_url: str,
) -> None:
    """Same Notification-row fan-out as notify_firm, but to an explicit
    recipient list instead of 'everyone with view access to this module' —
    used where access is narrower than the module permission itself (e.g.
    client chat, restricted to the assigned team member + admin/director)."""
    for email in recipients:
        if email == actor_email:
            continue
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
    extra: dict | None = None,
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
            extra=extra or {},
        )
    )
    await db.commit()


async def notify_client_document_uploaded(db: AsyncSession, document) -> None:
    """Emails every staff member with 'documents' view access when a client
    uploads through their portal — the existing notify_firm call alongside
    this one only creates an in-app Notification, which is easy to miss.
    Best-effort: caller wraps this in try/except."""
    recipients = await _staff_emails_for_module(db, "documents")
    if not recipients:
        return
    client = (await db.execute(select(Client).where(Client.id == document.client_id))).scalar_one_or_none()
    client_name = client.legal_name if client else "A client"
    subject = f"New document uploaded: {client_name}"
    body = (
        f"{client_name} just uploaded a document through their client portal.\n\n"
        f"Document: {document.document_name}\n"
        f"Type: {document.document_type or '—'}\n\n"
        "View it in the Documents tab of their Client Profile."
    )
    for to in recipients:
        await send_email(to=to, subject=subject, body=body)


async def notify_client_message(db: AsyncSession, communication) -> None:
    """Emails only the staff who can actually open this client's thread —
    their assigned team member, plus admin/director — when a client posts in
    the two-way Comms thread from their portal. Best-effort: caller wraps
    this in try/except."""
    client = (await db.execute(select(Client).where(Client.id == communication.client_id))).scalar_one_or_none()
    if client is None:
        return
    recipients = await recipients_for_client(db, client)
    if not recipients:
        return
    client_name = client.legal_name
    subject = f"New message from {client_name}"
    body = (
        f"{client_name} sent a new message through their client portal.\n\n"
        f"{communication.notes or ''}\n\n"
        "Reply from the Comms tab of their Client Profile."
    )
    for to in recipients:
        await send_email(to=to, subject=subject, body=body)
