"""Conversation's entity-specific behavior — moved verbatim from the old
routers/generic.py. Visible only to participants."""

import logging

from ... import ws_manager
from .._shared.client_portal import scope_conversation_create
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


def scope_filter(model, user):
    """Conversations are visible only to participants — having the
    'conversations' module permission (implied for a Director, grantable to
    anyone else) only means you're allowed to use chat at all, not that you
    can read every thread in the firm."""
    return model.participant_emails.contains([user.email])


async def before_create_body(db, user, is_client, body):
    return scope_conversation_create(user, body)


async def after_create(db, user, is_client, obj):
    try:
        await ws_manager.push(obj.participant_emails or [], {"type": "conversation"})
    except Exception:
        logger.exception("Failed to push websocket update for Conversation %s", obj.id)


hooks = EntityHooks(scope_filter=scope_filter, before_create_body=before_create_body, after_create=after_create)
