"""Signature's entity-specific behavior — moved verbatim from the old
routers/generic.py. Unlike Document/DocumentComment, a client-portal
signature still gets the standard firm-wide broadcast (it was never
special-cased into the is_client notify branch)."""

import logging

from ...notify import log_activity, notify_firm
from .._shared.client_portal import scope_client_create
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def before_create_body(db, user, is_client, body):
    if is_client:
        return await scope_client_create("Signature", db, user, body)
    return body


async def after_create(db, user, is_client, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="documents",
            notif_type="signature_completed",
            title="Document signed",
            body=f"{user.email} — document signed: {obj.signer_name or obj.signer_email}",
            link_url="/Documents",
        )
    except Exception:
        logger.exception("Failed to notify firm of new Signature, id=%s", obj.id)

    if obj.client_id:
        try:
            await log_activity(
                db=db,
                client_id=obj.client_id,
                actor_email=user.email,
                activity_type="signature_completed",
                title=f"Signed: {obj.document_type}",
                extra={"document_type": obj.document_type},
            )
        except Exception:
            logger.exception("Failed to log activity 'signature_completed' for client %s", obj.client_id)


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="documents",
            notif_type="signature_deleted",
            title="Signature deleted",
            body=f"{user.email} deleted: {obj.signer_name or obj.signer_email}",
            link_url="/Documents",
        )
    except Exception:
        logger.exception("Failed to notify firm of Signature deletion, id=%s", obj.id)


hooks = EntityHooks(before_create_body=before_create_body, after_create=after_create, before_delete=before_delete)
