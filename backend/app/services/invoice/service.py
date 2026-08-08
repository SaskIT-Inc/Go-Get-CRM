"""Invoice's entity-specific behavior — moved verbatim from the old
routers/generic.py's NOTIFY_ON_CREATE/NOTIFY_ON_STATUS_CHANGE/
NOTIFIABLE_ON_DELETE dict entries."""

import logging

from ...notify import notify_firm
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


def _subject(obj) -> str:
    return obj.invoice_number or f"${obj.total_amount}"


async def after_create(db, user, is_client, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="billing",
            notif_type="invoice_created",
            title="New invoice created",
            body=f"{user.email} — new invoice created: {_subject(obj)}",
            link_url="/Invoices",
        )
    except Exception:
        logger.exception("Failed to notify firm of new Invoice, id=%s", obj.id)


def snapshot_before_update(obj):
    return {"old_status": getattr(obj, "payment_status", None)}


async def after_update(db, user, obj, snapshot, body, ctx):
    old_status = snapshot["old_status"]
    new_status = getattr(obj, "payment_status", None)
    if old_status != new_status:
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module="billing",
                notif_type="invoice_status_changed",
                title="Invoice status changed",
                body=f"{user.email} — {_subject(obj)}: {old_status} \u2192 {new_status}",
                link_url="/Invoices",
            )
        except Exception:
            logger.exception("Failed to notify firm of Invoice status change for %s", obj.id)
    return obj


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="billing",
            notif_type="invoice_deleted",
            title="Invoice deleted",
            body=f"{user.email} deleted: {_subject(obj)}",
            link_url="/Invoices",
        )
    except Exception:
        logger.exception("Failed to notify firm of Invoice deletion, id=%s", obj.id)


hooks = EntityHooks(
    after_create=after_create,
    snapshot_before_update=snapshot_before_update,
    after_update=after_update,
    before_delete=before_delete,
)
