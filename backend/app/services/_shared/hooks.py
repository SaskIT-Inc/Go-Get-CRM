"""EntityHooks: the interface a service's service.py implements to plug its
entity-specific behavior into the shared CRUD engine (crud_engine.py). Every
field is optional/no-op by default, so a "plain" entity with no special
behavior just does `hooks = EntityHooks()`.

This mirrors exactly the shape routers/generic.py's old `if entity == "X"`
branches had — each hook fires at the same point in the request lifecycle
that branch used to, just addressed by entity via composition instead of by
a giant if/elif chain.
"""

from dataclasses import dataclass
from typing import Callable, Optional


@dataclass
class EntityHooks:
    # --- Authorization ---
    # (model, user) -> extra SQLAlchemy filter clause, or None. Applied on
    # top of the standard module-permission check for both list/query and
    # by-id lookups (get/update/delete).
    scope_filter: Optional[Callable] = None

    # (model, user, action) -> filter clause | None, or raises HTTPException.
    # Bypasses the standard module-permission check ENTIRELY when set (only
    # User and Notification need this — team-directory-read-for-everyone and
    # own-feed-only, respectively, neither of which fits the module matrix).
    authorize_override: Optional[Callable] = None

    # (user, body, ctx) -> body. Restricts/rewrites an update's body before
    # apply_update ever sees it (e.g. Task's TASK_SELF_EDIT_FIELDS), and may
    # pop transient non-column keys into `ctx` (a plain dict, fresh per
    # request) for a later hook to read — e.g. Task's `_client_emailed`
    # marker, which must never reach apply_update/obj.extra as a raw key.
    filter_update_body: Optional[Callable] = None

    # --- Create ---
    # async (db, user, is_client, body) -> body. Body scoping/stamping
    # before validation (e.g. client-portal Document/Communication scoping,
    # staff Communication authorship stamp, Conversation/Message scoping).
    before_create_body: Optional[Callable] = None

    # (obj) -> None. Mutate the freshly built object before the first
    # commit (e.g. ServiceFiling.compliance_due_date).
    before_create_commit: Optional[Callable] = None

    # async (db, user, is_client, obj) -> None. Every post-commit side
    # effect: notifications, activity logging, websocket pushes, auto-
    # generated related rows. Runs after db.refresh(obj).
    after_create: Optional[Callable] = None

    # --- Update ---
    # (obj) -> dict. Captures whatever "before" state after_update needs
    # (old status, old assignee, etc.) — called right before apply_update.
    snapshot_before_update: Optional[Callable] = None

    # (obj) -> None. Mutate obj after apply_update but before commit (e.g.
    # ServiceFiling recomputing compliance_due_date every save).
    before_update_commit: Optional[Callable] = None

    # async (db, user, obj, snapshot, body, ctx) -> obj. Every post-commit
    # side effect for updates; may itself commit again (e.g. Task's client-
    # emailed stamp) — must return the final obj so the route can serialize
    # a fresh, non-expired instance.
    after_update: Optional[Callable] = None

    # --- Delete ---
    # async (db, user, obj) -> None. Runs before the row is actually
    # deleted, while its display fields are still populated (e.g. the
    # deletion notification).
    before_delete: Optional[Callable] = None
