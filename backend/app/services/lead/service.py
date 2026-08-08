"""Lead's entity-specific behavior — moved verbatim from the old
routers/generic.py."""

import logging

from ...notify import notify_firm, notify_lead_captured
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def after_create(db, user, is_client, obj):
    subject = obj.contact_name + (f" ({obj.company_name})" if obj.company_name else "")
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="leads",
            notif_type="lead_created",
            title="New lead added",
            body=f"{user.email} — new lead added: {subject}",
            link_url="/LeadPipeline",
        )
    except Exception:
        logger.exception("Failed to notify firm of new Lead, id=%s", obj.id)
    try:
        await notify_lead_captured(obj)
    except Exception:
        logger.exception("Failed to send lead-captured notification for Lead %s", obj.id)


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="leads",
            notif_type="lead_deleted",
            title="Lead deleted",
            body=f"{user.email} deleted: {obj.contact_name}",
            link_url="/LeadPipeline",
        )
    except Exception:
        logger.exception("Failed to notify firm of Lead deletion, id=%s", obj.id)


hooks = EntityHooks(after_create=after_create, before_delete=before_delete)
