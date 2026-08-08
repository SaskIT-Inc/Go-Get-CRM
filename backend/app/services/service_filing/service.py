"""ServiceFiling's entity-specific behavior — moved verbatim from the old
routers/generic.py: compliance-due-date computation, auto-creating/syncing
a linked Task, status-change notify/activity, and auto-generating an
Invoice when a filing completes."""

import datetime
import logging
import re
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select

from ...date_utils import add_days, add_months
from ...models import MODELS
from ...models.tenant_models import Firm
from ...notify import log_activity, notify_firm
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


def classify_filing(service_name: str | None) -> str | None:
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


def default_compliance_due_date(category: str | None, filing_frequency: str | None, base_iso: str | None) -> str | None:
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


def _filing_task_title(filing, client) -> str:
    client_name = client.legal_name if client else None
    return f"{filing.service_name} — {client_name}" if client_name else filing.service_name


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


async def _create_task_for_filing(db, user, filing):
    """Server-side side effect of adding a service to a client (the "Add
    Service" form on ClientProfile.jsx's Services tab) — so My Tasks/Team
    Dashboard reflect a client's filing work without anyone having to
    hand-create a matching task. Initial status is mapped from whatever
    status the filing was created with."""
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


async def _sync_tasks_for_filing(db, filing) -> None:
    """Keeps any Task(s) auto-created from a filing in sync when the filing
    itself is edited — due date, assignee, and a status mapped from the
    filing's own progress. One-directional: a task's own status never
    writes back to the filing."""
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


async def _auto_generate_invoice(db, user, filing) -> None:
    """Server-side side effect of a ServiceFiling completing, gated on the
    firm's system_preferences.auto_invoice_generation (default True). Amounts
    use Decimal throughout for the Numeric columns (asyncpg is strict about
    parameter types); only the JSONB line_items values are converted to
    float, since Decimal isn't JSON-serializable."""
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


def before_create_commit(obj):
    # Always freshly derived, never taken from the client body — this is
    # what makes compliance_due_date non-editable.
    obj.compliance_due_date = default_compliance_due_date(
        classify_filing(obj.service_name), obj.filing_frequency, obj.tax_cycle_end
    )


async def after_create(db, user, is_client, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="filings",
            notif_type="filing_added",
            title="New service filing added",
            body=f"{user.email} — new service filing added: {obj.service_name}",
            link_url="/Clients",
        )
    except Exception:
        logger.exception("Failed to notify firm of new ServiceFiling, id=%s", obj.id)

    # Runs before the activity log below so the filing's own "filing_created"
    # row can be enriched with the auto-created task's id/title/status — the
    # two are shown as one connected story in the Activity tab rather than
    # two disconnected lines (there's no separate "task_created" row for
    # these, since _create_task_for_filing bypasses the Task route entirely).
    created_task = None
    try:
        created_task = await _create_task_for_filing(db, user, obj)
    except Exception:
        logger.exception("Failed to auto-create task for new ServiceFiling %s", obj.id)

    if obj.client_id:
        activity_extra = {"service_filing_id": obj.id, "assigned_to": obj.assigned_to, "due_date": obj.due_date}
        if created_task is not None:
            activity_extra = {
                **activity_extra,
                "task_id": created_task.id,
                "task_title": created_task.title,
                "task_status": created_task.status,
            }
        try:
            await log_activity(
                db=db,
                client_id=obj.client_id,
                actor_email=user.email,
                activity_type="filing_created",
                title=f"Service added: {obj.service_name}",
                extra=activity_extra,
            )
        except Exception:
            logger.exception("Failed to log activity 'filing_created' for client %s", obj.client_id)


def snapshot_before_update(obj):
    return {"old_status": getattr(obj, "status", None)}


def before_update_commit(obj):
    # Recomputed on every save regardless of what (if anything) the client
    # sent for this field — same non-editable guarantee as create.
    obj.compliance_due_date = default_compliance_due_date(
        classify_filing(obj.service_name), obj.filing_frequency, obj.tax_cycle_end
    )


async def after_update(db, user, obj, snapshot, body, ctx):
    old_status = snapshot["old_status"]

    if old_status != obj.status:
        try:
            await notify_firm(
                db=db,
                actor_email=user.email,
                module="filings",
                notif_type="filing_status_changed",
                title="Service filing status changed",
                body=f"{user.email} — {obj.service_name}: {old_status} → {obj.status}",
                link_url="/Clients",
            )
        except Exception:
            logger.exception("Failed to notify firm of ServiceFiling status change for %s", obj.id)
        try:
            await log_activity(
                db=db,
                client_id=obj.client_id,
                actor_email=user.email,
                activity_type="filing_status_changed",
                title=f"Service status changed: {obj.service_name}",
                from_stage=old_status,
                to_stage=obj.status,
                extra={"service_filing_id": obj.id, "assigned_to": obj.assigned_to},
            )
        except Exception:
            logger.exception("Failed to log filing-status-changed activity for filing %s", obj.id)
        if old_status != "Completed" and obj.status == "Completed":
            try:
                await _auto_generate_invoice(db, user, obj)
            except Exception:
                logger.exception("Failed to auto-generate invoice for completed filing %s", obj.id)

    try:
        await _sync_tasks_for_filing(db, obj)
    except Exception:
        logger.exception("Failed to sync linked task(s) for updated ServiceFiling %s", obj.id)

    return obj


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="filings",
            notif_type="filing_deleted",
            title="Service filing deleted",
            body=f"{user.email} deleted: {obj.service_name}",
            link_url="/Clients",
        )
    except Exception:
        logger.exception("Failed to notify firm of ServiceFiling deletion, id=%s", obj.id)


hooks = EntityHooks(
    before_create_commit=before_create_commit,
    after_create=after_create,
    snapshot_before_update=snapshot_before_update,
    before_update_commit=before_update_commit,
    after_update=after_update,
    before_delete=before_delete,
)
