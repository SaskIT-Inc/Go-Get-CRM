"""Body-scoping helpers shared by every entity a client-portal user can
create against (Document, DocumentComment, Communication, Signature) and by
the internal staff Conversation/Message chat — moved verbatim from the old
routers/generic.py. Each entity's before_create_body hook calls into these
rather than duplicating the logic four times.
"""

import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def scope_client_create(entity: str, db: AsyncSession, user, body: dict) -> dict:
    """For a client-role create (Document, DocumentComment, Communication):
    force client_id to the caller's own Client row regardless of what the
    request body says, so a client can never upload into another client's
    file space, comment as someone else, or post a portal message into
    another client's thread."""
    from ...models import MODELS

    Client = MODELS["Client"]
    own_client = (
        await db.execute(
            select(Client.id, Client.primary_contact_name, Client.legal_name).where(
                func.lower(Client.primary_email) == user.email
            )
        )
    ).first()
    if own_client is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No client record linked to this account")
    body = dict(body)
    body["client_id"] = own_client.id
    if entity == "Document":
        body["uploaded_by"] = user.email
    elif entity == "DocumentComment":
        body["author_email"] = user.email
        body["author_name"] = own_client.primary_contact_name or own_client.legal_name
    elif entity == "Communication":
        body["author_email"] = user.email
        body["sender_type"] = "client"
        body.setdefault("communication_type", "Portal Message")
        body.setdefault("communication_date", datetime.datetime.now(datetime.timezone.utc).isoformat())
    return body


def scope_conversation_create(user, body: dict) -> dict:
    """Every conversation always includes its creator as a participant,
    regardless of what the request body says."""
    body = dict(body)
    participants = set(body.get("participant_emails") or [])
    participants.add(user.email)
    body["participant_emails"] = sorted(participants)
    body["created_by_email"] = user.email
    return body


async def scope_message_create(db: AsyncSession, user, body: dict) -> dict:
    """A message can only be posted into a conversation the sender is
    actually a participant of — checked here since it's a create-time
    property of the request body, not something a read-time filter can
    express."""
    from ...models import MODELS

    Conversation = MODELS["Conversation"]
    conversation = (
        await db.execute(select(Conversation).where(Conversation.id == body.get("conversation_id")))
    ).scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    if user.email not in (conversation.participant_emails or []):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You're not a participant in this conversation")
    body = dict(body)
    body["sender_email"] = user.email
    return body
