"""Message's entity-specific behavior — moved verbatim from the old
routers/generic.py. Visible only to participants of the parent
Conversation."""

import logging

from sqlalchemy import select

from ... import ws_manager
from ...models import MODELS
from .._shared.client_portal import scope_message_create
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


def scope_filter(model, user):
    Conversation = MODELS["Conversation"]
    return model.conversation_id.in_(
        select(Conversation.id).where(Conversation.participant_emails.contains([user.email]))
    )


async def before_create_body(db, user, is_client, body):
    return await scope_message_create(db, user, body)


async def after_create(db, user, is_client, obj):
    try:
        Conversation = MODELS["Conversation"]
        conversation = await db.get(Conversation, obj.conversation_id)
        if conversation is not None:
            await ws_manager.push(
                conversation.participant_emails or [],
                {"type": "message", "conversation_id": obj.conversation_id},
            )
    except Exception:
        logger.exception("Failed to push websocket update for Message %s", obj.id)


hooks = EntityHooks(scope_filter=scope_filter, before_create_body=before_create_body, after_create=after_create)
