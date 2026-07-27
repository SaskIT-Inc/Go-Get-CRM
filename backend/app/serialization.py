"""
Generic (de)serialization shared by every entity: flattens SQLAlchemy model
instances into plain dicts (merging the `extra` catch-all on top), and splits
incoming request bodies back into typed columns vs. the `extra` blob.
"""

import datetime
from typing import Any

from sqlalchemy import inspect

from .models import EXCLUDED_FIELDS

NON_ASSIGNABLE = {"id", "created_date", "updated_date"}

# Client-role scoping (generic.py's _authorize_client) and client
# self-registration (auth.py's register()) both match a User's own
# email against Client.primary_email — case mismatches (e.g. a staff member
# typing "John.Doe@Example.com" during onboarding vs. the lowercase login
# email that self-registration always produces) would otherwise silently
# leave the client permanently unable to see their own records. Normalizing
# every *_email field the same way User.email already is closes that class
# of bug at the source instead of every read site needing to know about it.
def _normalize_value(key: str, value: Any) -> Any:
    if isinstance(value, str) and "email" in key.lower():
        return value.strip().lower()
    return value

# Columns that must never be settable through the generic /api/{entity} CRUD
# router, even by staff roles that otherwise have full CRUD on an entity —
# these can only change via dedicated endpoints (/auth/users/{id}/access for
# User) that apply their own authorization rules. Without this, any staff
# user could PATCH /api/User/{id} with {"role": "director"} and self-promote.
PROTECTED_FIELDS: dict[str, set[str]] = {
    "User": {"role", "permissions", "hashed_password", "email", "is_active"},
}


def _known_columns(model_or_instance) -> set[str]:
    return {col.key for col in inspect(model_or_instance).mapper.columns}


def serialize(entity: str, obj: Any) -> dict:
    mapper = inspect(obj).mapper
    excluded = EXCLUDED_FIELDS.get(entity, set()) | {"extra"}
    result: dict[str, Any] = {}
    for col in mapper.columns:
        if col.key in excluded:
            continue
        value = getattr(obj, col.key)
        if isinstance(value, (datetime.date, datetime.datetime)):
            value = value.isoformat()
        result[col.key] = value
    for key, value in (obj.extra or {}).items():
        result[key] = value
    return result


def build_create(entity: str, model: type, body: dict, created_by: str | None) -> Any:
    known = _known_columns(model)
    protected = PROTECTED_FIELDS.get(entity, set())
    kwargs: dict[str, Any] = {}
    extra: dict[str, Any] = {}
    for key, value in body.items():
        if key in NON_ASSIGNABLE or key in protected:
            continue
        value = _normalize_value(key, value)
        if key in known:
            kwargs[key] = value
        else:
            extra[key] = value
    obj = model(**kwargs, extra=extra)
    if created_by is not None and "created_by" in known:
        obj.created_by = created_by
    return obj


def apply_update(entity: str, obj: Any, body: dict) -> None:
    known = _known_columns(obj)
    protected = PROTECTED_FIELDS.get(entity, set())
    extra = dict(obj.extra or {})
    for key, value in body.items():
        if key in NON_ASSIGNABLE or key == "created_by" or key in protected:
            continue
        value = _normalize_value(key, value)
        if key in known:
            setattr(obj, key, value)
        else:
            extra[key] = value
    obj.extra = extra
