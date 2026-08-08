"""ComplianceAlert's entity-specific behavior — moved verbatim from the old
routers/generic.py's NOTIFIABLE_ON_DELETE entry. Creation is otherwise
handled by scheduler.py's generate_compliance_alerts job, which inserts
rows directly rather than going through this route."""

import logging

from ...notify import notify_firm
from .._shared.hooks import EntityHooks

logger = logging.getLogger(__name__)


async def before_delete(db, user, obj):
    try:
        await notify_firm(
            db=db,
            actor_email=user.email,
            module="compliance",
            notif_type="compliance_alert_deleted",
            title="Compliance alert deleted",
            body=f"{user.email} deleted: {obj.title}",
            link_url="/Clients",
        )
    except Exception:
        logger.exception("Failed to notify firm of ComplianceAlert deletion, id=%s", obj.id)


hooks = EntityHooks(before_delete=before_delete)
