"""Task's entity-specific behavior — moved verbatim from the old
routers/generic.py. Individual contributors are scoped to their own
assigned tasks and may only change status; managerial roles see/manage
everyone's."""

import datetime
import logging

from ...models import MODELS
from ...modules import MANAGERIAL_ROLES
from ...notify import log_activity, notify_firm, notify_specific_staff
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)

# The two `_`-prefixed keys are the optional "was the client emailed" marker
# TaskFormModal sends alongside a Complete status change — transient, never
# persisted as-is (popped into ctx below before apply_update ever sees them).
TASK_SELF_EDIT_FIELDS = {"status", "completed_date", "_client_emailed", "_client_emailed_note"}


def scope_filter(model, user):
    """Individual contributors (every STAFF_ROLE not in MANAGERIAL_ROLES)
    only ever see/address their own allocated tasks — a managerial role
    (director/admin/manager) can see and manage everyone's."""
    if user.role in MANAGERIAL_ROLES:
        return None
    return model.assigned_to == user.email


def filter_update_body(user, body, ctx):
    if user.role not in MANAGERIAL_ROLES:
        # Individual contributors editing their own task (the only kind
        # scope_filter would have let them reach at all) may only change
        # its status — every other field is management's call.
        body = {key: value for key, value in body.items() if key in TASK_SELF_EDIT_FIELDS}
    ctx["client_emailed_flag"] = body.pop("_client_emailed", None)
    ctx["client_emailed_note"] = body.pop("_client_emailed_note", None)
    return body


def snapshot_before_update(obj):
    return {
        "was_completed": getattr(obj, "status", None) == "Complete",
        "old_assigned_to": getattr(obj, "assigned_to", None),
    }


async def after_create(db, user, is_client, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="tasks",
            notif_type="task_created",
            title="New task created",
            body=f"{user.email} — new task created: {obj.title}",
            link_url="/Tasks",
        )
    except Exception:
        logger.exception("Failed to notify firm of new Task, id=%s", obj.id)

    if obj.assigned_to and obj.assigned_to != user.email:
        # Personal, targeted alert to the assignee — separate from the
        # "task_created" broadcast above (which goes to everyone with tasks
        # view and says nothing about who it's for).
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

    if obj.client_id:
        try:
            await log_activity(
                db=db,
                client_id=obj.client_id,
                actor_email=user.email,
                activity_type="task_created",
                title=f"Task created: {obj.title}",
                extra={"task_id": obj.id, "assigned_to": obj.assigned_to, "due_date": obj.due_date},
            )
        except Exception:
            logger.exception("Failed to log activity 'task_created' for client %s", obj.client_id)


async def after_update(db, user, obj, snapshot, body, ctx):
    was_completed = snapshot["was_completed"]
    old_assigned_to = snapshot["old_assigned_to"]
    client_emailed_flag = ctx.get("client_emailed_flag")
    client_emailed_note = ctx.get("client_emailed_note")

    if not was_completed and obj.status == "Complete":
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
                # its attributes on commit by default, and the caller's
                # final serialize(obj) would otherwise try to lazily reload
                # them outside of an awaited context and 500.
                await db.refresh(obj)
            except Exception:
                logger.exception("Failed to record client-emailed status for completed task %s", obj.id)

    if obj.assigned_to and obj.assigned_to != old_assigned_to and obj.assigned_to != user.email:
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

    return obj


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="tasks",
            notif_type="task_deleted",
            title="Task deleted",
            body=f"{user.email} deleted: {obj.title}",
            link_url="/Tasks",
        )
    except Exception:
        logger.exception("Failed to notify firm of Task deletion, id=%s", obj.id)


hooks = EntityHooks(
    scope_filter=scope_filter,
    filter_update_body=filter_update_body,
    snapshot_before_update=snapshot_before_update,
    after_create=after_create,
    after_update=after_update,
    before_delete=before_delete,
)
