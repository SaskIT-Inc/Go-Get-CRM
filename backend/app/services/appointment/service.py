"""Appointment's entity-specific behavior — moved verbatim from the old
routers/generic.py."""

import logging

from ...notify import notify_firm
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def after_create(db, user, is_client, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="calendar",
            notif_type="appointment_booked",
            title="New appointment booked",
            body=f"{user.email} — new appointment booked: {obj.title}",
            link_url="/Calendar",
        )
    except Exception:
        logger.exception("Failed to notify firm of new Appointment, id=%s", obj.id)


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="calendar",
            notif_type="appointment_deleted",
            title="Appointment deleted",
            body=f"{user.email} deleted: {obj.title}",
            link_url="/Calendar",
        )
    except Exception:
        logger.exception("Failed to notify firm of Appointment deletion, id=%s", obj.id)


hooks = EntityHooks(after_create=after_create, before_delete=before_delete)
