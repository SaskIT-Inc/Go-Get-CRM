"""Shared authorization logic every service's route.py calls through the
CRUD engine — moved verbatim from the old routers/generic.py. Single-tenant:
every entity lives in the one application database, so there's no
tenant-scoping dependency to thread through here, only role-based module
permissions plus `client`-role read/write scoping.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select

from ...modules import (
    CLIENT_CREATE_ENTITIES,
    CLIENT_READ_ENTITIES,
    ENTITY_MODULE,
    MODULES,
    STAFF_ROLES,
    has_permission,
)


def authorize(entity: str, model: type, user, *, action: str, hooks):
    """Raises 403 if the user's role can't do this at all; otherwise returns
    an extra SQLAlchemy filter clause to further restrict reads (or None if
    no extra restriction applies)."""
    role = getattr(user, "role", None)

    if role == "client":
        return authorize_client(entity, model, user, action=action)

    if role not in STAFF_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    if hooks.authorize_override is not None:
        return hooks.authorize_override(model, user, action=action)

    module = ENTITY_MODULE.get(entity)
    if module is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")
    if not has_permission(user, module, action):
        label = MODULES[module]["label"]
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"You don't have '{action}' access to {label}")

    if hooks.scope_filter is not None:
        return hooks.scope_filter(model, user)
    return None


def authorize_client(entity: str, model: type, user, *, action: str):
    if action == "create":
        if entity not in CLIENT_CREATE_ENTITIES:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not accessible to client accounts")
        return None  # body scoping enforced by the entity's before_create_body hook
    if action != "view":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client accounts have read-only access")
    if entity not in CLIENT_READ_ENTITIES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not accessible to client accounts")
    from ...models import MODELS

    Client = MODELS["Client"]
    # Case-insensitive: user.email is always lowercase (auth.py normalizes
    # it), and new Client.primary_email writes are too (serialization.py's
    # _normalize_value), but defends against any pre-existing mixed-case
    # data written before that normalization existed.
    if entity == "Client":
        return func.lower(model.primary_email) == user.email
    client_id_column = getattr(model, "client_id", None)
    if client_id_column is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not accessible to client accounts")
    return client_id_column.in_(select(Client.id).where(func.lower(Client.primary_email) == user.email))
