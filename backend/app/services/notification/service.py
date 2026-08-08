"""Notification's entity-specific behavior — moved verbatim from the old
routers/generic.py. Notifications aren't part of anyone's permission
matrix — they're a strictly own-feed-only surface for every staff member
regardless of role. Creation only ever happens server-side (see
app/notify.py, a direct model insert that never goes through this route)."""

from fastapi import HTTPException, status

from .._shared.hooks import EntityHooks


def authorize_override(model, user, *, action: str):
    if action not in ("view", "edit"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Notifications are created by the system")
    return model.recipient_email == user.email


hooks = EntityHooks(authorize_override=authorize_override)
