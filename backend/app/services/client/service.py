"""Client's entity-specific behavior — moved verbatim from the old
routers/generic.py."""

import logging

from ...notify import log_activity, notify_firm
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def after_create(db, user, is_client, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="clients",
            notif_type="client_onboarded",
            title="New client onboarded",
            body=f"{user.email} — new client onboarded: {obj.legal_name}",
            link_url="/Clients",
        )
    except Exception:
        logger.exception("Failed to notify firm of new Client, id=%s", obj.id)


async def after_update(db, user, obj, snapshot, body, ctx):
    # A single "profile updated" row per save is enough for the Activity
    # tab — field-level diffing isn't worth the complexity here.
    try:
        await log_activity(
            db=db,
            client_id=obj.id,
            actor_email=user.email,
            activity_type="client_updated",
            title="Client profile updated",
        )
    except Exception:
        logger.exception("Failed to log client-updated activity for client %s", obj.id)
    return obj


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="clients",
            notif_type="client_deleted",
            title="Client deleted",
            body=f"{user.email} deleted: {obj.legal_name}",
            link_url="/Clients",
        )
    except Exception:
        logger.exception("Failed to notify firm of Client deletion, id=%s", obj.id)


hooks = EntityHooks(after_create=after_create, after_update=after_update, before_delete=before_delete)
