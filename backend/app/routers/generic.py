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
import logging
import re
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import ws_manager
from ..database import get_db
from ..date_utils import add_days, add_months
from ..deps import get_current_user
from ..models import MODELS, REQUIRED_FIELDS
from ..models.tenant_models import Firm
from ..modules import (
    CLIENT_CREATE_ENTITIES,
    CLIENT_READ_ENTITIES,
    ENTITY_MODULE,
    MANAGERIAL_ROLES,
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
logger = logging.getLogger(__name__)


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
    if entity == "Task":
        return _task_scope_filter(model, user)
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


def _task_scope_filter(model: type, user):
    """Individual contributors (every STAFF_ROLE not in MANAGERIAL_ROLES)
    only ever see/address their own allocated tasks — a managerial role
    (director/admin/manager) can see and manage everyone's. Applies to both
    'view' and 'edit' since _authorize's return value is used for both the
    list query filter and _get_scoped's by-id lookup, so a non-managerial
    user addressing someone else's task by ID gets a 404, not just an empty
    list."""
    if user.role in MANAGERIAL_ROLES:
        return None
    return model.assigned_to == user.email


# A non-managerial user completing/updating their own task may only change
# its status (and the completion timestamp that naturally comes with it) —
# every other field (title, assigned_to, due_date, etc.) is management's
# call. Enforced here rather than in serialization.py's PROTECTED_FIELDS
# since it's role-dependent, not a blanket restriction. The two `_`-prefixed
# keys are the optional "was the client emailed" marker TaskFormModal sends
# alongside a Complete status change — transient, never persisted as-is
# (see update_entity, which pops them before calling apply_update).
TASK_SELF_EDIT_FIELDS = {"status", "completed_date", "_client_emailed", "_client_emailed_note"}


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
        logger.exception("Failed to notify firm of auto-generated invoice for filing %s", filing.id)
    try:
        await log_activity(
            db=db,
            client_id=filing.client_id,
            actor_email=user.email,
            activity_type="invoice_generated",
            title=f"Invoice auto-generated: ${total}",
        )
    except Exception:
        logger.exception("Failed to log activity for auto-generated invoice on filing %s", filing.id)


def _filing_task_title(filing, client) -> str:
    client_name = client.legal_name if client else None
    return f"{filing.service_name} — {client_name}" if client_name else filing.service_name


def _classify_filing(service_name: str | None) -> str | None:
    """Best-effort keyword classification of a filing's free-text
    service_name — there's no dedicated category column on ServiceFiling
    (only on the Service catalog, which a hand-edited service_name can drift
    out of sync with). Order matters: more specific tokens are checked
    before "gst"/"pst" so combo names like "GST/PST Filing" classify as GST,
    and "T2"/"T1" don't accidentally match a stray "t" elsewhere."""
    name = (service_name or "").lower()
    if "t2" in name or "corporate tax" in name or "corporation tax" in name:
        return "t2"
    if "t1" in name or "personal tax" in name:
        return "t1"
    if "t4" in name:
        return "t4"
    if "wcb" in name:
        return "wcb"
    if "remittance" in name:
        return "remittance"
    if "bookkeeping" in name:
        return "bookkeeping"
    if "gst" in name:
        return "gst"
    if "pst" in name:
        return "pst"
    return None


def _default_compliance_due_date(category: str | None, filing_frequency: str | None, base_iso: str | None) -> str | None:
    """Server-computed CRA-style compliance deadline — the whole point of
    this being separate from the always-editable `due_date` is that it's
    never taken from client input, only ever derived fresh from the
    filing's own fields. Returns None wherever no rule applies (unmatched
    category, missing period-end-date base, or a GST filing whose
    filing_frequency is neither "Annual" nor "Quarterly")."""
    if not base_iso:
        return None
    if category == "gst":
        if filing_frequency == "Annual":
            return add_months(base_iso, 3)
        if filing_frequency == "Quarterly":
            return add_months(base_iso, 1)
        return None
    if category == "pst":
        return add_months(base_iso, 1)
    if category == "t2":
        return add_months(base_iso, 6)
    if category == "t4" or category == "wcb":
        return add_months(base_iso, 2)
    if category == "t1":
        return add_months(base_iso, 4)
    if category == "remittance":
        return add_days(base_iso, 15)
    return None


# Maps a ServiceFiling's (richer) status vocabulary onto a Task's own, so a
# task auto-created from a filing keeps reflecting that filing's progress.
_FILING_TO_TASK_STATUS = {
    "Not Started": "Not Started",
    "Documents Pending": "In Progress",
    "In Progress": "In Progress",
    "Review": "In Progress",
    "Filed": "Complete",
    "Completed": "Complete",
}


async def _create_task_for_filing(db: AsyncSession, user, filing):
    """Server-side side effect of adding a service to a client (the "Add
    Service" form on ClientProfile.jsx's Services tab) — bypasses the normal
    create_entity path the same way _auto_generate_invoice does, so My
    Tasks/Team Dashboard reflect a client's filing work without anyone
    having to hand-create a matching task. Initial status is mapped from
    whatever status the filing was created with — a filing added directly
    as "In Progress" shouldn't produce a task stuck at "Not Started" until
    the next edit re-syncs it (see _sync_tasks_for_filing)."""
    Task = MODELS["Task"]
    Client = MODELS["Client"]
    client = await db.get(Client, filing.client_id) if filing.client_id else None
    task = Task(
        title=_filing_task_title(filing, client),
        description=filing.notes,
        status=_FILING_TO_TASK_STATUS.get(filing.status, "Not Started"),
        priority="Medium",
        assigned_to=filing.assigned_to,
        client_id=filing.client_id,
        service_filing_id=filing.id,
        due_date=filing.due_date,
        created_by=user.email,
        extra={},
    )
    db.add(task)
    await db.commit()
    return task


async def _sync_tasks_for_filing(db: AsyncSession, filing) -> None:
    """Keeps any Task(s) auto-created from a filing (see
    _create_task_for_filing) in sync when the filing itself is edited —
    due date, assignee, and a status mapped from the filing's own progress.
    One-directional: a task's own status never writes back to the filing."""
    Task = MODELS["Task"]
    Client = MODELS["Client"]
    result = await db.execute(select(Task).where(Task.service_filing_id == filing.id))
    tasks = result.scalars().all()
    if not tasks:
        return
    client = await db.get(Client, filing.client_id) if filing.client_id else None
    title = _filing_task_title(filing, client)
    mapped_status = _FILING_TO_TASK_STATUS.get(filing.status)
    for task in tasks:
        task.title = title
        task.due_date = filing.due_date
        task.assigned_to = filing.assigned_to
        if mapped_status:
            task.status = mapped_status
    await db.commit()


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
    "ServiceFiling": lambda obj: ("filings", "filing_added", "New service filing added", obj.service_name, "/Clients"),
    "Invoice": lambda obj: (
        "billing", "invoice_created", "New invoice created", obj.invoice_number or f"${obj.total_amount}", "/Invoices"
    ),
    "Document": lambda obj: (
        "documents", "document_added", "New document added", obj.document_name, "/Documents"
    ),
    "Payment": lambda obj: (
        "billing", "payment_recorded", "New payment recorded", f"${obj.payment_amount}", "/Invoices"
    ),
    "Estimate": lambda obj: (
        "billing", "estimate_created", "New estimate created", obj.estimate_number or f"${obj.total_amount}", "/Invoices"
    ),
    "Retainer": lambda obj: (
        "billing", "retainer_created", "New retainer created", obj.retainer_number or obj.client_id, "/Invoices"
    ),
    "Signature": lambda obj: (
        "documents", "signature_completed", "Document signed", obj.signer_name or obj.signer_email, "/Documents"
    ),
}

# Firm-wide notifications fired on update, wherever the named status-like
# field actually changed value (Task/Client have their own, narrower
# existing logic elsewhere — Task only cares about the "Complete"
# transition specifically, and Client already logs an Activity row on any
# change — so they're deliberately not folded into this generic table).
# Each entry: (status_field_name, module, notif_type, title, body_fn(obj,
# old, new), link_url).
NOTIFY_ON_STATUS_CHANGE = {
    "ServiceFiling": (
        "status", "filings", "filing_status_changed", "Service filing status changed",
        lambda obj, old, new: f"{obj.service_name}: {old} → {new}", "/Clients",
    ),
    "Invoice": (
        "payment_status", "billing", "invoice_status_changed", "Invoice status changed",
        lambda obj, old, new: f"{obj.invoice_number or obj.id}: {old} → {new}", "/Invoices",
    ),
    "Payment": (
        "payment_status", "billing", "payment_status_changed", "Payment status changed",
        lambda obj, old, new: f"${obj.payment_amount}: {old} → {new}", "/Invoices",
    ),
    "Estimate": (
        "status", "billing", "estimate_status_changed", "Estimate status changed",
        lambda obj, old, new: f"{obj.estimate_number or obj.id}: {old} → {new}", "/Invoices",
    ),
    "Retainer": (
        "status", "billing", "retainer_status_changed", "Retainer status changed",
        lambda obj, old, new: f"{obj.retainer_number or obj.id}: {old} → {new}", "/Invoices",
    ),
}

# Firm-wide notifications fired on delete — every other entity here has zero
# audit trail today (delete_entity is otherwise a bare db.delete). Each
# entry: (module, notif_type, title, subject_fn(obj), link_url). Fired
# before the actual delete so obj's display fields are still populated.
NOTIFIABLE_ON_DELETE = {
    "Task": ("tasks", "task_deleted", "Task deleted", lambda obj: obj.title, "/Tasks"),
    "Client": ("clients", "client_deleted", "Client deleted", lambda obj: obj.legal_name, "/Clients"),
    "Lead": ("leads", "lead_deleted", "Lead deleted", lambda obj: obj.contact_name, "/LeadPipeline"),
    "ServiceFiling": ("filings", "filing_deleted", "Service filing deleted", lambda obj: obj.service_name, "/Clients"),
    "Invoice": ("billing", "invoice_deleted", "Invoice deleted", lambda obj: obj.invoice_number or obj.id, "/Invoices"),
    "Document": ("documents", "document_deleted", "Document deleted", lambda obj: obj.document_name, "/Documents"),
    "Appointment": ("calendar", "appointment_deleted", "Appointment deleted", lambda obj: obj.title, "/Calendar"),
    "ComplianceAlert": (
        "compliance", "compliance_alert_deleted", "Compliance alert deleted", lambda obj: obj.title, "/Clients"
    ),
    "Payment": ("billing", "payment_deleted", "Payment deleted", lambda obj: f"${obj.payment_amount}", "/Invoices"),
    "Estimate": ("billing", "estimate_deleted", "Estimate deleted", lambda obj: obj.estimate_number or obj.id, "/Invoices"),
    "Retainer": ("billing", "retainer_deleted", "Retainer deleted", lambda obj: obj.retainer_number or obj.id, "/Invoices"),
    "Signature": (
        "documents", "signature_deleted", "Signature deleted", lambda obj: obj.signer_name or obj.signer_email, "/Documents"
    ),
    "Communication": (
        "clients", "communication_deleted", "Communication deleted", lambda obj: (obj.notes or "")[:60], "/Clients"
    ),
}

# Client audit-trail logging fired on create, one entry per entity whose
# creation is worth a row on that client's Activity tab. Each lambda maps
# the freshly created row to (client_id, activity_type, title, extra) —
# skipped entirely if client_id is falsy (Task/Document's client_id is
# optional). `extra` carries structured fields the Activity tab can render
# as detail chips (assignee, due date, etc.) beyond the plain title string.
ACTIVITY_ON_CREATE = {
    "Task": lambda obj: (
        obj.client_id,
        "task_created",
        f"Task created: {obj.title}",
        {"task_id": obj.id, "assigned_to": obj.assigned_to, "due_date": obj.due_date},
    ),
    "ServiceFiling": lambda obj: (
        obj.client_id,
        "filing_created",
        f"Service added: {obj.service_name}",
        {"service_filing_id": obj.id, "assigned_to": obj.assigned_to, "due_date": obj.due_date},
    ),
    "Document": lambda obj: (
        obj.client_id,
        "document_uploaded",
        f"Document uploaded: {obj.document_name}",
        {"document_id": obj.id, "document_type": obj.document_type, "uploaded_by": obj.uploaded_by},
    ),
    "Signature": lambda obj: (
        obj.client_id,
        "signature_completed",
        f"Signed: {obj.document_type}",
        {"document_type": obj.document_type},
    ),
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
    if entity == "ServiceFiling":
        # Always freshly derived, never taken from the client body — this is
        # what makes compliance_due_date non-editable.
        obj.compliance_due_date = _default_compliance_due_date(
            _classify_filing(obj.service_name), obj.filing_frequency, obj.tax_cycle_end
        )
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
            logger.exception("Failed to notify firm of client %s activity, id=%s", entity, obj.id)
        if entity == "Document":
            try:
                await notify_client_document_uploaded(db, obj)
            except Exception:
                logger.exception("Failed to notify staff of client document upload %s", obj.id)
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
            logger.exception("Failed to notify staff of client portal message on Communication %s", obj.id)
        try:
            await notify_client_message(db, obj)
        except Exception:
            logger.exception("Failed to send client-message notification for Communication %s", obj.id)
        try:
            recipients = await recipients_for_client(db, client_for_comm) if client_for_comm else []
            await ws_manager.push(recipients, {"type": "communication", "client_id": obj.client_id})
        except Exception:
            logger.exception("Failed to push websocket update for Communication %s", obj.id)
    elif not is_client and entity == "Communication":
        try:
            client_for_comm = await db.get(MODELS["Client"], obj.client_id)
            if client_for_comm is not None and client_for_comm.primary_email:
                await ws_manager.push(
                    [client_for_comm.primary_email.lower()],
                    {"type": "communication", "client_id": obj.client_id},
                )
        except Exception:
            logger.exception("Failed to push websocket update for staff Communication %s", obj.id)
    elif entity == "RecurringEmailSequence":
        # Fires on the very first send (the frontend sends that email, then
        # creates this row) — subsequent automated sends are notified from
        # scheduler.py's send_due_recurring_emails instead.
        try:
            client_for_sequence = await db.get(MODELS["Client"], obj.client_id)
            if client_for_sequence is not None:
                recipients = await recipients_for_client(db, client_for_sequence, exclude_email=user.email)
                await notify_specific_staff(
                    db=db,
                    actor_email=user.email,
                    recipients=recipients,
                    notif_type="recurring_email_sent",
                    title="Recurring follow-up sent",
                    body=f"{user.email} sent a follow-up to {client_for_sequence.legal_name}: \"{obj.subject}\"",
                    link_url=f"/ClientProfile?client={obj.client_id}",
                )
        except Exception:
            logger.exception("Failed to notify staff of recurring email sent for sequence %s", obj.id)
    elif entity == "Conversation":
        try:
            await ws_manager.push(obj.participant_emails or [], {"type": "conversation"})
        except Exception:
            logger.exception("Failed to push websocket update for Conversation %s", obj.id)
    elif entity == "Message":
        try:
            conversation = await db.get(MODELS["Conversation"], obj.conversation_id)
            if conversation is not None:
                await ws_manager.push(
                    conversation.participant_emails or [],
                    {"type": "message", "conversation_id": obj.conversation_id},
                )
        except Exception:
            logger.exception("Failed to push websocket update for Message %s", obj.id)
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
            logger.exception("Failed to notify firm of new %s, id=%s", entity, obj.id)
        if entity == "Lead":
            try:
                await notify_lead_captured(obj)
            except Exception:
                logger.exception("Failed to send lead-captured notification for Lead %s", obj.id)

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
            logger.exception("Failed to notify assignee %s of new task %s", obj.assigned_to, obj.id)

    # Runs before the activity log below so a filing's own "filing_created"
    # row can be enriched with the auto-created task's id/title/status —
    # the two are shown as one connected story in the Activity tab rather
    # than two disconnected lines (there's no separate "task_created" row
    # for these, since _create_task_for_filing bypasses create_entity).
    created_task = None
    if entity == "ServiceFiling":
        try:
            created_task = await _create_task_for_filing(db, user, obj)
        except Exception:
            logger.exception("Failed to auto-create task for new ServiceFiling %s", obj.id)

    if entity in ACTIVITY_ON_CREATE:
        client_id, activity_type, title, activity_extra = ACTIVITY_ON_CREATE[entity](obj)
        if entity == "ServiceFiling" and created_task is not None:
            activity_extra = {
                **activity_extra,
                "task_id": created_task.id,
                "task_title": created_task.title,
                "task_status": created_task.status,
            }
        if client_id:
            try:
                await log_activity(
                    db=db,
                    client_id=client_id,
                    actor_email=user.email,
                    activity_type=activity_type,
                    title=title,
                    extra=activity_extra,
                )
            except Exception:
                logger.exception("Failed to log activity '%s' for client %s", activity_type, client_id)

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
    if entity == "Task" and user.role not in MANAGERIAL_ROLES:
        # Individual contributors editing their own task (the only kind
        # _task_scope_filter would have let them reach at all) may only
        # change its status — every other field is management's call.
        body = {key: value for key, value in body.items() if key in TASK_SELF_EDIT_FIELDS}
    # Optional "was the client emailed about this" marker (see
    # TASK_SELF_EDIT_FIELDS comment) — extracted before apply_update ever
    # sees it, since these aren't real Task columns and shouldn't land in
    # `extra` under their raw transient key names.
    client_emailed_flag = body.pop("_client_emailed", None) if entity == "Task" else None
    client_emailed_note = body.pop("_client_emailed_note", None) if entity == "Task" else None
    # Snapshot before apply_update mutates obj in place — it has no diff/
    # return value, so this is the only chance to detect a transition.
    was_completed = entity == "Task" and getattr(obj, "status", None) == "Complete"
    old_assigned_to = getattr(obj, "assigned_to", None) if entity == "Task" else None
    old_filing_status = getattr(obj, "status", None) if entity == "ServiceFiling" else None
    old_status_for_notify = (
        getattr(obj, NOTIFY_ON_STATUS_CHANGE[entity][0], None) if entity in NOTIFY_ON_STATUS_CHANGE else None
    )
    apply_update(entity, obj, body)
    if entity == "ServiceFiling":
        # Recomputed on every save regardless of what (if anything) the
        # client sent for this field — same non-editable guarantee as create.
        obj.compliance_due_date = _default_compliance_due_date(
            _classify_filing(obj.service_name), obj.filing_frequency, obj.tax_cycle_end
        )
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

    if entity == "Task" and not was_completed and obj.status == "Complete":
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
            logger.exception("Failed to notify firm of task completion for task %s", obj.id)
        emailed_details = None
        if client_emailed_flag is not None:
            emailed_details = (
                "Client was emailed about this." if client_emailed_flag else "Client was not emailed about this."
            )
        if obj.client_id:
            try:
                await log_activity(
                    db=db,
                    client_id=obj.client_id,
                    actor_email=user.email,
                    activity_type="task_completed",
                    title=f"Task completed: {obj.title}",
                    details=emailed_details,
                    extra={
                        "task_id": obj.id,
                        "assigned_to": obj.assigned_to,
                        "due_date": obj.due_date,
                        "client_emailed": bool(client_emailed_flag),
                        "client_emailed_note": client_emailed_note,
                    },
                )
            except Exception:
                logger.exception("Failed to log task-completed activity for task %s", obj.id)
        if client_emailed_flag:
            # Best-effort: a real Communication row so this shows up in the
            # client's own Comms thread, plus a quick-badge stamp on the
            # task itself so task lists don't need to cross-reference
            # Communication just to show an "Emailed" indicator.
            try:
                now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                if obj.client_id:
                    Communication = MODELS["Communication"]
                    db.add(
                        Communication(
                            client_id=obj.client_id,
                            communication_type="Email",
                            subject=f"Re: {obj.title}",
                            notes=client_emailed_note or f"Client emailed regarding completed task: {obj.title}",
                            communication_date=now_iso,
                            author_email=user.email,
                            sender_type="staff",
                            created_by=user.email,
                            extra={},
                        )
                    )
                extra = dict(obj.extra or {})
                extra["client_emailed"] = True
                extra["client_emailed_at"] = now_iso
                obj.extra = extra
                await db.commit()
                # Re-sync obj after this second commit — SQLAlchemy expires
                # its attributes on commit by default, and the final
                # serialize(entity, obj) below would otherwise try to lazily
                # reload them outside of an awaited context and 500.
                await db.refresh(obj)
            except Exception:
                logger.exception("Failed to record client-emailed status for completed task %s", obj.id)

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
            logger.exception("Failed to notify new assignee %s of reassigned task %s", obj.assigned_to, obj.id)

    if entity in NOTIFY_ON_STATUS_CHANGE:
        status_field, module, notif_type, notif_title, body_fn, link_url = NOTIFY_ON_STATUS_CHANGE[entity]
        new_status_for_notify = getattr(obj, status_field, None)
        if old_status_for_notify != new_status_for_notify:
            try:
                await notify_firm(
                    db=db,
                    actor_email=user.email,
                    module=module,
                    notif_type=notif_type,
                    title=notif_title,
                    body=f"{user.email} — {body_fn(obj, old_status_for_notify, new_status_for_notify)}",
                    link_url=link_url,
                )
            except Exception:
                logger.exception("Failed to notify firm of %s status change for %s", entity, obj.id)

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
            logger.exception("Failed to log client-updated activity for client %s", obj.id)

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
                extra={"service_filing_id": obj.id, "assigned_to": obj.assigned_to},
            )
        except Exception:
            logger.exception("Failed to log filing-status-changed activity for filing %s", obj.id)
        if old_filing_status != "Completed" and obj.status == "Completed":
            try:
                await _auto_generate_invoice(db, user, obj)
            except Exception:
                logger.exception("Failed to auto-generate invoice for completed filing %s", obj.id)

    if entity == "ServiceFiling":
        try:
            await _sync_tasks_for_filing(db, obj)
        except Exception:
            logger.exception("Failed to sync linked task(s) for updated ServiceFiling %s", obj.id)

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
    if entity in NOTIFIABLE_ON_DELETE:
        module, notif_type, notif_title, subject_fn, link_url = NOTIFIABLE_ON_DELETE[entity]
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module=module,
                notif_type=notif_type,
                title=notif_title,
                body=f"{user.email} deleted: {subject_fn(obj)}",
                link_url=link_url,
            )
        except Exception:
            logger.exception("Failed to notify firm of %s deletion, id=%s", entity, obj.id)
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
