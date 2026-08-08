"""Communication's entity-specific behavior — moved verbatim from the old
routers/generic.py. A client's Communication thread is only open to that
client's assigned team member (plus admin/director); staff and client
creates take different body-scoping and notification paths."""

import datetime
import logging

from fastapi import HTTPException, status
from sqlalchemy import func

from ... import ws_manager
from ...models import MODELS
from ...notify import notify_client_message, notify_specific_staff, recipients_for_client
from .._shared.client_portal import scope_client_create
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


def scope_filter(model, user):
    """A client's Communication thread is only open to that client's
    assigned team member, plus admin/director (who can reach any client) —
    everyone else gets an empty result set, not a 403, same pattern as
    Conversation/Message's scope filter."""
    if user.role in ("director", "admin"):
        return None
    Client = MODELS["Client"]
    from sqlalchemy import select

    return model.client_id.in_(select(Client.id).where(func.lower(Client.assigned_to) == user.email))


async def before_create_body(db, user, is_client, body):
    if is_client:
        return await scope_client_create("Communication", db, user, body)
    # Staff posting in the two-way Comms thread (not a client): only the
    # client's assigned team member (or admin/director, who can reach any
    # client) may post — everyone else is blocked here even though the
    # read-side scope filter would already hide the thread from them.
    if user.role not in ("director", "admin"):
        target_client = await db.get(MODELS["Client"], body.get("client_id"))
        if target_client is None or (target_client.assigned_to or "").lower() != user.email:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only message clients assigned to you")
    # Stamp who sent it the same way the client-scoped branch above does,
    # and default the timestamp so the frontend doesn't have to set it.
    body = dict(body)
    body["author_email"] = user.email
    body["sender_type"] = "staff"
    body.setdefault("communication_date", datetime.datetime.now(datetime.timezone.utc).isoformat())
    return body


async def after_create(db, user, is_client, obj):
    Client = MODELS["Client"]
    if is_client:
        client_for_comm = await db.get(Client, obj.client_id)
        try:
            if client_for_comm is not None:
                recipients = await recipients_for_client(db, client_for_comm, exclude_email=user.email)
                await notify_specific_staff(
                    db=db,
                    actor_email=user.email,
                    recipients=recipients,
                    notif_type="client_message",
                    title="New message from client",
                    body=f"{user.email} sent a portal message: {(obj.notes or '')[:120]}",
                    link_url=f"/ClientProfile?client={obj.client_id}",
                )
        except Exception:
            logger.exception("Failed to notify staff of client portal message on Communication %s", obj.id)
        try:
            await notify_client_message(db, obj)
        except Exception:
            logger.exception("Failed to send client-message notification for Communication %s", obj.id)
        try:
            recipients = await recipients_for_client(db, client_for_comm) if client_for_comm else []
            await ws_manager.push(recipients, {"type": "communication", "client_id": obj.client_id})
        except Exception:
            logger.exception("Failed to push websocket update for Communication %s", obj.id)
    else:
        try:
            client_for_comm = await db.get(Client, obj.client_id)
            if client_for_comm is not None and client_for_comm.primary_email:
                await ws_manager.push(
                    [client_for_comm.primary_email.lower()],
                    {"type": "communication", "client_id": obj.client_id},
                )
        except Exception:
            logger.exception("Failed to push websocket update for staff Communication %s", obj.id)


async def before_delete(db, user, obj):
    from ...notify import notify_firm

    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="clients",
            notif_type="communication_deleted",
            title="Communication deleted",
            body=f"{user.email} deleted: {(obj.notes or '')[:60]}",
            link_url="/Clients",
        )
    except Exception:
        logger.exception("Failed to notify firm of Communication deletion, id=%s", obj.id)


hooks = EntityHooks(
    scope_filter=scope_filter,
    before_create_body=before_create_body,
    after_create=after_create,
    before_delete=before_delete,
)
