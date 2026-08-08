"""The shared CRUD engine every entity's route.py builds its router from —
extracted verbatim from the old routers/generic.py. All entity-specific
behavior is expressed as an EntityHooks instance (see hooks.py) rather than
`if entity == "X"` branches, so this file itself never changes when a new
entity is added.

Mirrors the Base44 SDK's `entities.<Name>.list/filter/get/create/update/
delete/bulkCreate` shape so the frontend's call sites (src/api/apiClient.js)
need zero changes — every URL and response shape here is byte-identical to
before the restructure.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from ...models import MODELS, REQUIRED_FIELDS
from ...modules import STAFF_ROLES
from ...serialization import apply_update, build_create, serialize
from .authorization import authorize
from .hooks import EntityHooks


def _validate_required(entity: str, body: dict) -> None:
    missing = [field for field in REQUIRED_FIELDS.get(entity, []) if not body.get(field)]
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Missing required field(s) for {entity}: {', '.join(missing)}",
        )


async def _get_scoped(db: AsyncSession, model: type, item_id: str, extra_filter):
    from sqlalchemy import select

    stmt = select(model).where(model.id == item_id)
    if extra_filter is not None:
        stmt = stmt.where(extra_filter)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def build_entity_router(entity: str, hooks: EntityHooks | None = None) -> APIRouter:
    """Returns a fully-wired APIRouter serving one entity's `/api/<Entity>`
    CRUD surface. `hooks` defaults to an all-no-op EntityHooks for a "plain"
    entity with no special behavior beyond standard module-permission CRUD."""
    hooks = hooks or EntityHooks()
    model = MODELS[entity]
    router = APIRouter(prefix=f"/api/{entity}", tags=[entity])

    @router.post("/query")
    async def query_entities(
        body: dict = Body(default={}),
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
    ):
        """Backs both `.list()` (empty filter) and `.filter({...})` on the frontend."""
        from sqlalchemy import select

        extra_filter = authorize(entity, model, user, action="view", hooks=hooks)
        filters = body.get("filter") or {}
        sort = body.get("sort")
        limit = body.get("limit")
        offset = body.get("offset") or 0

        stmt = select(model)
        if extra_filter is not None:
            stmt = stmt.where(extra_filter)
        for key, value in filters.items():
            column = getattr(model, key, None)
            if column is not None:
                stmt = stmt.where(column == value)

        if sort:
            descending = sort.startswith("-")
            field = sort[1:] if descending else sort
            column = getattr(model, field, None)
            if column is not None:
                stmt = stmt.order_by(column.desc() if descending else column.asc())
        else:
            stmt = stmt.order_by(model.created_date.desc())

        if offset:
            stmt = stmt.offset(offset)
        if limit:
            stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        return [serialize(entity, row) for row in result.scalars().all()]

    @router.get("/{item_id}")
    async def get_entity(
        item_id: str,
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
    ):
        extra_filter = authorize(entity, model, user, action="view", hooks=hooks)
        obj = await _get_scoped(db, model, item_id, extra_filter)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        return serialize(entity, obj)

    @router.post("", status_code=status.HTTP_201_CREATED)
    async def create_entity(
        body: dict = Body(...),
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
    ):
        authorize(entity, model, user, action="create", hooks=hooks)
        is_client = getattr(user, "role", None) == "client"
        if hooks.before_create_body is not None:
            body = await hooks.before_create_body(db, user, is_client, body)
        _validate_required(entity, body)
        obj = build_create(entity, model, body, created_by=getattr(user, "email", None))
        if hooks.before_create_commit is not None:
            hooks.before_create_commit(obj)
        db.add(obj)
        try:
            await db.commit()
        except SQLAlchemyError:
            # A bad field type must not surface as an opaque 500.
            await db.rollback()
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Couldn't create {entity} — check that all fields have valid values.",
            )
        await db.refresh(obj)

        if hooks.after_create is not None:
            await hooks.after_create(db, user, is_client, obj)

        return serialize(entity, obj)

    @router.post("/bulk", status_code=status.HTTP_201_CREATED)
    async def bulk_create_entities(
        body: list = Body(...),
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
    ):
        if getattr(user, "role", None) not in STAFF_ROLES:
            # Bulk create is a staff-only bulk-import tool; the client create
            # allowlist (Document, single-item, client_id force-scoped) doesn't
            # extend here.
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")
        authorize(entity, model, user, action="create", hooks=hooks)
        for item in body:
            _validate_required(entity, item)
        objs = [build_create(entity, model, item, created_by=getattr(user, "email", None)) for item in body]
        db.add_all(objs)
        await db.commit()
        for obj in objs:
            await db.refresh(obj)
        return [serialize(entity, obj) for obj in objs]

    @router.patch("/{item_id}")
    async def update_entity(
        item_id: str,
        body: dict = Body(...),
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
    ):
        extra_filter = authorize(entity, model, user, action="edit", hooks=hooks)
        obj = await _get_scoped(db, model, item_id, extra_filter)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        ctx: dict = {}
        if hooks.filter_update_body is not None:
            body = hooks.filter_update_body(user, body, ctx)
        snapshot = hooks.snapshot_before_update(obj) if hooks.snapshot_before_update is not None else {}
        apply_update(entity, obj, body)
        if hooks.before_update_commit is not None:
            hooks.before_update_commit(obj)
        try:
            await db.commit()
        except SQLAlchemyError:
            # A bad field type (e.g. a numeric column sent as a string) fails at
            # the DB level with an opaque, unhandled 500 otherwise — surface it
            # as a clear 422 instead so the frontend can show a real error rather
            # than silently discarding the edit.
            await db.rollback()
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Couldn't save {entity} — check that all fields have valid values.",
            )
        await db.refresh(obj)

        if hooks.after_update is not None:
            obj = await hooks.after_update(db, user, obj, snapshot, body, ctx)

        return serialize(entity, obj)

    @router.delete("/{item_id}")
    async def delete_entity(
        item_id: str,
        db: AsyncSession = Depends(get_db),
        user=Depends(get_current_user),
    ):
        extra_filter = authorize(entity, model, user, action="delete", hooks=hooks)
        obj = await _get_scoped(db, model, item_id, extra_filter)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        if hooks.before_delete is not None:
            await hooks.before_delete(db, user, obj)
        await db.delete(obj)
        await db.commit()
        return {"success": True}

    return router
