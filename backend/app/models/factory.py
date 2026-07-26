"""
Builds one SQLAlchemy model per entry in ENTITY_DEFINITIONS. This replaces
having to hand-write ~27 nearly-identical classes: every model gets the same
base columns (id/created_date/updated_date/created_by/extra) plus whatever
typed columns its definition lists.

Single-tenant: every entity lives in the one application database (Base
metadata) — there's no per-firm database split to route between.
"""

import uuid
from typing import Any

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict

from ..database import Base
from .definitions import ENTITY_DEFINITIONS

INDEXED_NAMES = {"email", "status", "assigned_to"}


class BaseColumnsMixin:
    """id/created_date/updated_date/created_by/extra, shared by every table
    (generated entities and hand-written models like Firm alike). Plain
    Column objects on a mixin are copied per-subclass by SQLAlchemy's
    declarative extension, so this is safe to reuse across many models."""

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_date = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    created_by = Column(String, nullable=True)
    extra = Column(MutableDict.as_mutable(JSONB), nullable=False, default=dict)


class ScopedBase(BaseColumnsMixin, Base):
    """Base for every generated entity table."""

    __abstract__ = True


def _wants_index(field_name: str) -> bool:
    return field_name.endswith("_id") or field_name in INDEXED_NAMES


def _build_column(field_name: str, spec: Any) -> Column:
    if isinstance(spec, tuple):
        col_type, kwargs = spec
    else:
        col_type, kwargs = spec, {}
    kwargs = dict(kwargs)
    kwargs.setdefault("nullable", True)
    kwargs.setdefault("index", _wants_index(field_name))
    return Column(col_type, **kwargs)


def _build_model(entity_name: str, table_name: str, fields: dict[str, Any]) -> type:
    attrs: dict[str, Any] = {"__tablename__": table_name}
    for field_name, spec in fields.items():
        attrs[field_name] = _build_column(field_name, spec)
    return type(entity_name, (ScopedBase,), attrs)


MODELS: dict[str, type] = {
    name: _build_model(name, defn["table"], defn["fields"]) for name, defn in ENTITY_DEFINITIONS.items()
}
