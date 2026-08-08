"""RecurringEmailSequence's entity-specific behavior — moved verbatim from
the old routers/generic.py. Fires on the very first send (the frontend
sends that email, then creates this row) — subsequent automated sends are
notified from scheduler.py's send_due_recurring_emails instead."""

import logging

from ...models import MODELS
from ...notify import notify_specific_staff, recipients_for_client
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def after_create(db, user, is_client, obj):
    Client = MODELS["Client"]
    try:
        client_for_sequence = await db.get(Client, obj.client_id)
        if client_for_sequence is not None:
            recipients = await recipients_for_client(db, client_for_sequence, exclude_email=user.email)
            await notify_specific_staff(
                db=db,
                actor_email=user.email,
                recipients=recipients,
                notif_type="recurring_email_sent",
                title="Recurring follow-up sent",
                body=f"{user.email} sent a follow-up to {client_for_sequence.legal_name}: \"{obj.subject}\"",
                link_url=f"/ClientProfile?client={obj.client_id}",
            )
    except Exception:
        logger.exception("Failed to notify staff of recurring email sent for sequence %s", obj.id)


hooks = EntityHooks(after_create=after_create)
