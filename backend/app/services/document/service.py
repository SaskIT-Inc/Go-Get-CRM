"""Document's entity-specific behavior — moved verbatim from the old
routers/generic.py. Client-portal uploads and staff uploads take different
notification paths."""

import logging

from ...notify import log_activity, notify_client_document_uploaded, notify_firm
from .._shared.client_portal import scope_client_create
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def before_create_body(db, user, is_client, body):
    if is_client:
        return await scope_client_create("Document", db, user, body)
    return body


async def after_create(db, user, is_client, obj):
    if is_client:
        # Best-effort: a notification-fan-out hiccup should never fail the
        # client's actual upload.
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module="documents",
                notif_type="document_activity",
                title="New client document activity",
                body=f"{user.email} shared {obj.document_name or 'a document'}",
                link_url="/Documents",
            )
        except Exception:
            logger.exception("Failed to notify firm of client Document activity, id=%s", obj.id)
        try:
            await notify_client_document_uploaded(db, obj)
        except Exception:
            logger.exception("Failed to notify staff of client document upload %s", obj.id)
    else:
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module="documents",
                notif_type="document_added",
                title="New document added",
                body=f"{user.email} — new document added: {obj.document_name}",
                link_url="/Documents",
            )
        except Exception:
            logger.exception("Failed to notify firm of new Document, id=%s", obj.id)

    if obj.client_id:
        try:
            await log_activity(
                db=db,
                client_id=obj.client_id,
                actor_email=user.email,
                activity_type="document_uploaded",
                title=f"Document uploaded: {obj.document_name}",
                extra={"document_id": obj.id, "document_type": obj.document_type, "uploaded_by": obj.uploaded_by},
            )
        except Exception:
            logger.exception("Failed to log activity 'document_uploaded' for client %s", obj.client_id)


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="documents",
            notif_type="document_deleted",
            title="Document deleted",
            body=f"{user.email} deleted: {obj.document_name}",
            link_url="/Documents",
        )
    except Exception:
        logger.exception("Failed to notify firm of Document deletion, id=%s", obj.id)


hooks = EntityHooks(before_create_body=before_create_body, after_create=after_create, before_delete=before_delete)
