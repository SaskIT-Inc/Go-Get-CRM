"""DocumentComment's entity-specific behavior — moved verbatim from the old
routers/generic.py. Only client-portal-authored comments notify staff;
staff-authored comments are silent (matches the original is_client-gated
branch exactly)."""

import logging

from ...notify import notify_firm
from .._shared.client_portal import scope_client_create
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def before_create_body(db, user, is_client, body):
    if is_client:
        return await scope_client_create("DocumentComment", db, user, body)
    return body


async def after_create(db, user, is_client, obj):
    if not is_client:
        return
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="documents",
            notif_type="document_activity",
            title="New client document activity",
            body=f"{user.email} shared a document",
            link_url="/Documents",
        )
    except Exception:
        logger.exception("Failed to notify firm of client DocumentComment activity, id=%s", obj.id)


hooks = EntityHooks(before_create_body=before_create_body, after_create=after_create)
