"""
One generic router mounted for every entity in MODELS, mirroring the Base44
SDK's `entities.<Name>.list/filter/get/create/update/delete/bulkCreate` shape
so the frontend's call sites barely change.

Single-tenant: every entity lives in the one application database, so there's
no tenant-scoping dependency to thread through — `_authorize` below is the
only access-control layer (role-based module permissions plus `client`-role
read/write scoping).
"""

import datetime
import re
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import ws_manager
from ..database import get_db
from ..deps import get_current_user
from ..models import MODELS, REQUIRED_FIELDS
from ..models.tenant_models import Firm
from ..modules import (
    CLIENT_CREATE_ENTITIES,
    CLIENT_READ_ENTITIES,
    ENTITY_MODULE,
    MODULES,
    STAFF_ROLES,
    has_permission,
)
from ..notify import (
    log_activity,
    notify_client_document_uploaded,
    notify_client_message,
    notify_firm,
    notify_lead_captured,
    notify_specific_staff,
    recipients_for_client,
)
from ..serialization import apply_update, build_create, serialize

router = APIRouter(prefix="/api", tags=["entities"])


def _get_model(entity: str) -> type:
    model = MODELS.get(entity)
    if model is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown entity '{entity}'")
    return model


def _authorize(entity: str, model: type, user, *, action: str):
    """Raises 403 if the user's role can't do this at all; otherwise returns
    an extra SQLAlchemy filter clause to further restrict reads (or None if
    no extra restriction applies)."""
    role = getattr(user, "role", None)

    if role == "client":
        return _authorize_client(entity, model, user, action=action)

    if role not in STAFF_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    if entity == "User":
        # Team directory reads are a shared dependency (assignee pickers,
        # Tasks/dashboards) so every staff role can read it regardless of
        # their 'team' permission; writes only via /auth/users/{id}/access.
        if action != "view":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Manage team members from User Management")
        return None

    if entity == "Notification":
        return _authorize_notification(model, user, action=action)

    module = ENTITY_MODULE.get(entity)
    if module is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")
    if not has_permission(user, module, action):
        label = MODULES[module]["label"]
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"You don't have '{action}' access to {label}")

    if entity in ("Conversation", "Message"):
        return _conversation_scope_filter(entity, model, user)
    if entity == "Communication":
        return _communication_scope_filter(model, user)
    return None


def _authorize_notification(model: type, user, *, action: str):
    """Notifications aren't part of anyone's permission matrix — they're a
    strictly own-feed-only surface for every staff member regardless of
    role. Creation only ever happens server-side (see app/notify.py, a
    direct model insert that never goes through this router)."""
    if action not in ("view", "edit"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Notifications are created by the system")
    return model.recipient_email == user.email


def _conversation_scope_filter(entity: str, model: type, user):
    """Conversations (and their messages) are visible only to participants —
    having the 'conversations' module permission (implied for a Director,
    grantable to anyone else) only means you're allowed to use chat at all,
    not that you can read every thread in the firm."""
    Conversation = MODELS["Conversation"]
    if entity == "Conversation":
        return model.participant_emails.contains([user.email])
    return model.conversation_id.in_(
        select(Conversation.id).where(Conversation.participant_emails.contains([user.email]))
    )


def _communication_scope_filter(model: type, user):
    """A client's Communication thread is only open to that client's
    assigned team member, plus admin/director (who can reach any client) —
    everyone else gets an empty result set, not a 403, same pattern as
    _conversation_scope_filter above."""
    if user.role in ("director", "admin"):
        return None
    Client = MODELS["Client"]
    return model.client_id.in_(
        select(Client.id).where(func.lower(Client.assigned_to) == user.email)
    )


def _authorize_client(entity: str, model: type, user, *, action: str):
    if action == "create":
        if entity not in CLIENT_CREATE_ENTITIES:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not accessible to client accounts")
        return None  # body scoping enforced in create_entity (_scope_client_create)
    if action != "view":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client accounts have read-only access")
    if entity not in CLIENT_READ_ENTITIES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not accessible to client accounts")
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


async def _scope_client_create(entity: str, db: AsyncSession, user, body: dict) -> dict:
    """For a client-role create (Document, DocumentComment, Communication):
    force client_id to the caller's own Client row regardless of what the
    request body says, so a client can never upload into another client's
    file space, comment as someone else, or post a portal message into
    another client's thread."""
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


def _scope_conversation_create(user, body: dict) -> dict:
    """Every conversation always includes its creator as a participant,
    regardless of what the request body says."""
    body = dict(body)
    participants = set(body.get("participant_emails") or [])
    participants.add(user.email)
    body["participant_emails"] = sorted(participants)
    body["created_by_email"] = user.email
    return body


async def _scope_message_create(db: AsyncSession, user, body: dict) -> dict:
    """A message can only be posted into a conversation the sender is
    actually a participant of — checked here since it's a create-time
    property of the request body, not something a read-time filter can
    express."""
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


async def _auto_generate_invoice(db: AsyncSession, user, filing) -> None:
    """Server-side side effect of a ServiceFiling completing, gated on the
    firm's system_preferences.auto_invoice_generation (default True — see
    company.py's SYSTEM_PREFERENCES_DEFAULTS). Bypasses the normal
    create_entity path the same way notify_firm/log_activity do. Amounts use
    Decimal throughout for the Numeric columns (asyncpg is strict about
    parameter types — a plain float/str here would risk the same class of
    500 the Business Details bug hit); only the JSONB line_items values are
    converted to float, since Decimal isn't JSON-serializable."""
    firm = (await db.execute(select(Firm).limit(1))).scalar_one_or_none()
    prefs = ((firm.extra if firm else None) or {}).get("system_preferences", {})
    if not prefs.get("auto_invoice_generation", True):
        return

    Invoice = MODELS["Invoice"]
    Client = MODELS["Client"]

    fee = filing.fee if filing.fee is not None else Decimal("0")
    tax_rate_fraction = Decimal(str(prefs.get("default_tax_rate", 5) or 0)) / Decimal("100")
    tax_amount = (fee * tax_rate_fraction).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (fee + tax_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    terms = prefs.get("invoice_terms") or "Net 30"
    days_match = re.search(r"\d+", terms)
    due_days = int(days_match.group()) if days_match else 30
    today = datetime.date.today()

    count = (await db.execute(select(func.count()).select_from(Invoice))).scalar_one()
    invoice_number = f"INV-{today.year}-{count + 1:04d}"

    invoice = Invoice(
        created_by=user.email,
        extra={},
        invoice_number=invoice_number,
        client_id=filing.client_id,
        service_filing_id=filing.id,
        invoice_date=today.isoformat(),
        due_date=(today + datetime.timedelta(days=due_days)).isoformat(),
        line_items=[
            {"description": filing.service_name, "quantity": 1, "rate": float(fee), "amount": float(fee)}
        ],
        subtotal=fee,
        tax_rate=tax_rate_fraction,
        tax_amount=tax_amount,
        total_amount=total,
        amount_paid=Decimal("0"),
        balance_due=total,
        payment_status="Pending",
        terms=terms,
        notes=f"Auto-generated from completed service filing: {filing.service_name}",
    )
    db.add(invoice)
    await db.commit()

    client = await db.get(Client, filing.client_id)
    client_name = client.legal_name if client else "the client"

    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="billing",
            notif_type="invoice_auto_generated",
            title="Invoice auto-generated",
            body=f"${total} invoice generated for {client_name} — {filing.service_name}",
            link_url="/Invoices",
        )
    except Exception:
        pass
    try:
        await log_activity(
            db=db,
            client_id=filing.client_id,
            actor_email=user.email,
            activity_type="invoice_generated",
            title=f"Invoice auto-generated: ${total}",
        )
    except Exception:
        pass


async def _get_scoped(db: AsyncSession, model: type, item_id: str, extra_filter):
    stmt = select(model).where(model.id == item_id)
    if extra_filter is not None:
        stmt = stmt.where(extra_filter)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


@router.post("/{entity}/query")
async def query_entities(
    entity: str,
    body: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Backs both `.list()` (empty filter) and `.filter({...})` on the frontend."""
    model = _get_model(entity)
    extra_filter = _authorize(entity, model, user, action="view")
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


@router.get("/{entity}/{item_id}")
async def get_entity(
    entity: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    model = _get_model(entity)
    extra_filter = _authorize(entity, model, user, action="view")
    obj = await _get_scoped(db, model, item_id, extra_filter)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return serialize(entity, obj)


# Firm-wide "something important happened" notifications fired on create,
# one entry per entity that warrants them. Each lambda maps the freshly
# created row to (module, notif_type, title, subject, link_url) — module
# drives who receives it (every staff member with view access to that
# module, see notify.notify_firm), the rest becomes the Notification row's
# content.
NOTIFY_ON_CREATE = {
    "Task": lambda obj: ("tasks", "task_created", "New task created", obj.title, "/Tasks"),
    "Lead": lambda obj: (
        "leads",
        "lead_created",
        "New lead added",
        obj.contact_name + (f" ({obj.company_name})" if obj.company_name else ""),
        "/LeadPipeline",
    ),
    "Client": lambda obj: ("clients", "client_onboarded", "New client onboarded", obj.legal_name, "/Clients"),
    "Appointment": lambda obj: ("calendar", "appointment_booked", "New appointment booked", obj.title, "/Calendar"),
}

# Client audit-trail logging fired on create, one entry per entity whose
# creation is worth a row on that client's Activity tab. Each lambda maps
# the freshly created row to (client_id, activity_type, title) — skipped
# entirely if client_id is falsy (Task/Document's client_id is optional).
ACTIVITY_ON_CREATE = {
    "Task": lambda obj: (obj.client_id, "task_created", f"Task created: {obj.title}"),
    "ServiceFiling": lambda obj: (obj.client_id, "filing_created", f"Service added: {obj.service_name}"),
    "Document": lambda obj: (obj.client_id, "document_uploaded", f"Document uploaded: {obj.document_name}"),
    "Signature": lambda obj: (obj.client_id, "signature_completed", f"Signed: {obj.document_type}"),
}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Bulk 'Clear All' for the notification bell — marks every unread
    Notification row for this user as read in one round trip, not just the
    (limited) page the frontend currently has loaded."""
    Notification = MODELS["Notification"]
    result = await db.execute(
        select(Notification).where(
            Notification.recipient_email == user.email,
            Notification.is_read.is_(False),
        )
    )
    rows = result.scalars().all()
    for row in rows:
        row.is_read = True
    await db.commit()
    return {"updated": len(rows)}


@router.post("/{entity}", status_code=status.HTTP_201_CREATED)
async def create_entity(
    entity: str,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    model = _get_model(entity)
    _authorize(entity, model, user, action="create")
    is_client = getattr(user, "role", None) == "client"
    if is_client and entity in ("Document", "DocumentComment", "Communication", "Signature"):
        body = await _scope_client_create(entity, db, user, body)
    elif entity == "Communication":
        # Staff posting in the two-way Comms thread (not a client): only the
        # client's assigned team member (or admin/director, who can reach any
        # client) may post — everyone else is blocked here even though the
        # read-side scope filter would already hide the thread from them.
        if user.role not in ("director", "admin"):
            target_client = await db.get(MODELS["Client"], body.get("client_id"))
            if target_client is None or (target_client.assigned_to or "").lower() != user.email:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only message clients assigned to you")
        # Stamp who sent it the same way the client-scoped branch above does,
        # and default the timestamp so the frontend doesn't have to set it.
        body = dict(body)
        body["author_email"] = user.email
        body["sender_type"] = "staff"
        body.setdefault("communication_date", datetime.datetime.now(datetime.timezone.utc).isoformat())
    elif entity == "Conversation":
        body = _scope_conversation_create(user, body)
    elif entity == "Message":
        body = await _scope_message_create(db, user, body)
    _validate_required(entity, body)
    obj = build_create(entity, model, body, created_by=getattr(user, "email", None))
    db.add(obj)
    try:
        await db.commit()
    except SQLAlchemyError:
        # Same guarantee as update_entity below: a bad field type must not
        # surface as an opaque 500.
        await db.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Couldn't create {entity} — check that all fields have valid values.",
        )
    await db.refresh(obj)

    if is_client and entity in ("Document", "DocumentComment"):
        # Best-effort: a notification-fan-out hiccup should never fail the
        # client's actual upload/comment.
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module="documents",
                notif_type="document_activity",
                title="New client document activity",
                body=f"{user.email} shared {getattr(obj, 'document_name', None) or 'a document'}",
                link_url="/Documents",
            )
        except Exception:
            pass
        if entity == "Document":
            try:
                await notify_client_document_uploaded(db, obj)
            except Exception:
                pass
    elif is_client and entity == "Communication":
        client_for_comm = await db.get(MODELS["Client"], obj.client_id)
        try:
            if client_for_comm is not None:
                recipients = await recipients_for_client(db, client_for_comm, exclude_email=user.email)
                await notify_specific_staff(
                    db=db,
                    actor_email=user.email,
                    recipients=recipients,
                    notif_type="client_message",
                    title="New message from client",
                    body=f"{user.email} sent a portal message: {(obj.notes or '')[:120]}",
                    link_url=f"/ClientProfile?client={obj.client_id}",
                )
        except Exception:
            pass
        try:
            await notify_client_message(db, obj)
        except Exception:
            pass
        try:
            recipients = await recipients_for_client(db, client_for_comm) if client_for_comm else []
            await ws_manager.push(recipients, {"type": "communication", "client_id": obj.client_id})
        except Exception:
            pass
    elif not is_client and entity == "Communication":
        try:
            client_for_comm = await db.get(MODELS["Client"], obj.client_id)
            if client_for_comm is not None and client_for_comm.primary_email:
                await ws_manager.push(
                    [client_for_comm.primary_email.lower()],
                    {"type": "communication", "client_id": obj.client_id},
                )
        except Exception:
            pass
    elif entity == "Conversation":
        try:
            await ws_manager.push(obj.participant_emails or [], {"type": "conversation"})
        except Exception:
            pass
    elif entity == "Message":
        try:
            conversation = await db.get(MODELS["Conversation"], obj.conversation_id)
            if conversation is not None:
                await ws_manager.push(
                    conversation.participant_emails or [],
                    {"type": "message", "conversation_id": obj.conversation_id},
                )
        except Exception:
            pass
    elif entity in NOTIFY_ON_CREATE:
        # Same best-effort guarantee: never let a notification hiccup fail
        # the actual create it's reporting on.
        try:
            module, notif_type, title, subject, link_url = NOTIFY_ON_CREATE[entity](obj)
            await notify_firm(
                db=db,
                actor_email=user.email,
                module=module,
                notif_type=notif_type,
                title=title,
                body=f"{user.email} — {title.lower()}: {subject}",
                link_url=link_url,
            )
        except Exception:
            pass
        if entity == "Lead":
            try:
                await notify_lead_captured(obj)
            except Exception:
                pass

    if entity == "Task" and obj.assigned_to and obj.assigned_to != user.email:
        # Personal, targeted alert to the assignee — separate from the
        # "task_created" broadcast above (which goes to everyone with tasks
        # view and says nothing about who it's for). This is the one that
        # actually matters to a single person's notification feed.
        try:
            await notify_specific_staff(
                db=db,
                actor_email=user.email,
                recipients=[obj.assigned_to],
                notif_type="task_assigned",
                title="You were assigned a task",
                body=f"{user.email} assigned you to \"{obj.title}\"",
                link_url="/Tasks",
            )
        except Exception:
            pass

    if entity in ACTIVITY_ON_CREATE:
        client_id, activity_type, title = ACTIVITY_ON_CREATE[entity](obj)
        if client_id:
            try:
                await log_activity(
                    db=db,
                    client_id=client_id,
                    actor_email=user.email,
                    activity_type=activity_type,
                    title=title,
                )
            except Exception:
                pass

    return serialize(entity, obj)


@router.post("/{entity}/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_entities(
    entity: str,
    body: list = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    model = _get_model(entity)
    if getattr(user, "role", None) not in STAFF_ROLES:
        # Bulk create is a staff-only bulk-import tool; the client create
        # allowlist (Document, single-item, client_id force-scoped) doesn't
        # extend here.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")
    _authorize(entity, model, user, action="create")
    for item in body:
        _validate_required(entity, item)
    objs = [build_create(entity, model, item, created_by=getattr(user, "email", None)) for item in body]
    db.add_all(objs)
    await db.commit()
    for obj in objs:
        await db.refresh(obj)
    return [serialize(entity, obj) for obj in objs]


@router.patch("/{entity}/{item_id}")
async def update_entity(
    entity: str,
    item_id: str,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    model = _get_model(entity)
    extra_filter = _authorize(entity, model, user, action="edit")
    obj = await _get_scoped(db, model, item_id, extra_filter)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    # Snapshot before apply_update mutates obj in place — it has no diff/
    # return value, so this is the only chance to detect a transition.
    was_completed = entity == "Task" and getattr(obj, "status", None) == "Completed"
    old_assigned_to = getattr(obj, "assigned_to", None) if entity == "Task" else None
    old_filing_status = getattr(obj, "status", None) if entity == "ServiceFiling" else None
    apply_update(entity, obj, body)
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

    if entity == "Task" and not was_completed and obj.status == "Completed":
        # Best-effort, same guarantee as the create-time notifications above.
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module="tasks",
                notif_type="task_completed",
                title="Task completed",
                body=f"{user.email} completed: {obj.title}",
                link_url="/Tasks",
            )
        except Exception:
            pass
        if obj.client_id:
            try:
                await log_activity(
                    db=db,
                    client_id=obj.client_id,
                    actor_email=user.email,
                    activity_type="task_completed",
                    title=f"Task completed: {obj.title}",
                )
            except Exception:
                pass

    if entity == "Task" and obj.assigned_to and obj.assigned_to != old_assigned_to and obj.assigned_to != user.email:
        try:
            await notify_specific_staff(
                db=db,
                actor_email=user.email,
                recipients=[obj.assigned_to],
                notif_type="task_assigned",
                title="You were assigned a task",
                body=f"{user.email} assigned you to \"{obj.title}\"",
                link_url="/Tasks",
            )
        except Exception:
            pass

    if entity == "Client":
        # A single "profile updated" row per save is enough for the Activity
        # tab — field-level diffing isn't worth the complexity here.
        try:
            await log_activity(
                db=db,
                client_id=obj.id,
                actor_email=user.email,
                activity_type="client_updated",
                title="Client profile updated",
            )
        except Exception:
            pass

    if entity == "ServiceFiling" and old_filing_status != obj.status:
        try:
            await log_activity(
                db=db,
                client_id=obj.client_id,
                actor_email=user.email,
                activity_type="filing_status_changed",
                title=f"Service status changed: {obj.service_name}",
                from_stage=old_filing_status,
                to_stage=obj.status,
            )
        except Exception:
            pass
        if old_filing_status != "Completed" and obj.status == "Completed":
            try:
                await _auto_generate_invoice(db, user, obj)
            except Exception:
                pass

    return serialize(entity, obj)


@router.delete("/{entity}/{item_id}")
async def delete_entity(
    entity: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    model = _get_model(entity)
    extra_filter = _authorize(entity, model, user, action="delete")
    obj = await _get_scoped(db, model, item_id, extra_filter)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    await db.delete(obj)
    await db.commit()
    return {"success": True}


def _validate_required(entity: str, body: dict) -> None:
    missing = [field for field in REQUIRED_FIELDS.get(entity, []) if not body.get(field)]
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Missing required field(s) for {entity}: {', '.join(missing)}",
        )
