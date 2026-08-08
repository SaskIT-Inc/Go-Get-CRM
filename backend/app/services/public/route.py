from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...models.tenant_models import Firm
from . import service

router = APIRouter(prefix="/api/public", tags=["public"])


@router.post("/contact")
async def submit_contact_form(body: dict = Body(...)):
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()
    message = (body.get("message") or "").strip()
    company = (body.get("company") or "").strip()

    if not name or not email or not message:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "name, email, and message are required")

    await service.submit_contact_form(name, email, message, company)
    return {"success": True}


@router.post("/chatbot")
async def chatbot(request: Request, body: dict = Body(...)):
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "message is required")
    if len(message) > service.MAX_CHATBOT_MESSAGE_LENGTH:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"message must be under {service.MAX_CHATBOT_MESSAGE_LENGTH} characters",
        )

    service.chatbot_rate_limiter.enforce(
        request.client.host if request.client else "unknown",
        "Too many messages — please wait a few minutes and try again.",
    )

    history = body.get("history") or []
    try:
        reply = await service.run_chatbot(message, history)
    except RuntimeError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The assistant isn't configured yet. Please contact us directly."
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "The assistant is temporarily unavailable. Please try again shortly or contact us directly.",
        ) from exc

    return {"reply": reply}


@router.post("/website-lead-capture/{webhook_key}", status_code=status.HTTP_201_CREATED)
async def capture_website_lead(
    webhook_key: str,
    request: Request,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    service.webhook_rate_limiter.enforce(
        f"{webhook_key}:{client_ip}", "Too many submissions — please try again shortly."
    )

    firm = (await db.execute(select(Firm).where(Firm.webhook_key == webhook_key))).scalar_one_or_none()
    if firm is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown webhook")

    contact_name = (body.get("contact_name") or body.get("full_name") or "").strip()
    email = (body.get("email") or "").strip()
    if not contact_name or not email:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "contact_name (or full_name) and email are required"
        )

    lead = await service.capture_website_lead(db, firm, {**body, "contact_name": contact_name, "email": email})
    return {"success": True, "lead_id": lead.id}
