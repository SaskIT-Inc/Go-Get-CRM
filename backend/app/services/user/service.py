"""User's entity-specific behavior — moved verbatim from the old
routers/generic.py. Team directory reads are a shared dependency (assignee
pickers, Tasks/dashboards) so every staff role can read it regardless of
their 'team' permission; writes only via /auth/users/{id}/access."""

from fastapi import HTTPException, status

from .._shared.hooks import EntityHooks


def authorize_override(model, user, *, action: str):
    if action != "view":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Manage team members from User Management")
    return None


hooks = EntityHooks(authorize_override=authorize_override)
