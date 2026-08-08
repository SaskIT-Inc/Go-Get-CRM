from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from ...models import MODELS
from .._shared.crud_engine import build_entity_router
from .service import hooks

router = build_entity_router("Notification", hooks=hooks)

# Fixed path, NOT under this entity's own /api/Notification prefix — matches
# the frontend's existing api.notifications.markAllRead() call exactly
# (src/api/apiClient.js), unchanged from the old routers/generic.py.
extra_router = APIRouter(prefix="/api/notifications", tags=["Notification"])


@extra_router.post("/mark-all-read")
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
