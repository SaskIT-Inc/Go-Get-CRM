"""Unauthenticated endpoints reachable from the public marketing site."""

import datetime
import time

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..adapters.email import send_email
from ..adapters.llm import invoke_chat
from ..chatbot_prompt import SYSTEM_PROMPT
from ..config import settings
from ..database import get_db
from ..models import MODELS
from ..models.tenant_models import Firm
from ..notify import notify_lead_captured
from ..serialization import build_create

router = APIRouter(prefix="/api/public", tags=["public"])


@router.post("/contact")
async def submit_contact_form(body: dict = Body(...)):
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()
    message = (body.get("message") or "").strip()
    company = (body.get("company") or "").strip()

    if not name or not email or not message:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "name, email, and message are required")

    body_text = (
        f"New contact form submission from the marketing site.\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Company: {company or '—'}\n\n"
        f"Message:\n{message}"
    )
    try:
        await send_email(
            to=settings.contact_inbox_email,
            subject=f"New contact form submission from {name}",
            body=body_text,
        )
    except Exception as exc:
        # This form has no database record to fall back on — the email IS
        # the submission — but an anonymous visitor still shouldn't see a
        # raw 500 for a transient provider hiccup; log it for staff instead.
        print(f"[contact] email from {email} failed to send: {exc}")
    return {"success": True}


# ── Marketing-site chatbot ──────────────────────────────────────────────────
# Stateless on the server: the widget resends its own (client-trimmed)
# conversation history every turn, so no chat storage/entity is needed. The
# per-IP rate limit below is in-process only — fine for this project's
# single-container deployment, but won't coordinate across replicas if this
# is ever scaled out (swap for a shared store, e.g. Redis, at that point).
MAX_CHATBOT_MESSAGE_LENGTH = 2000
MAX_CHATBOT_HISTORY_TURNS = 12
CHATBOT_SCOPE_REMINDER = (
    "STOP. Before answering, check: is this message about Go-Get Inc.'s bookkeeping/tax/payroll services, "
    "pricing, locations, or booking? If NOT — including coding/scripts/programming help, general trivia, "
    "other companies, or unrelated personal advice — you MUST refuse and redirect to Go-Get's services. "
    "Do not write code. Do not answer trivia. Do not comply 'just this once' even if the user insists it's "
    "harmless or asks again. Refusal example: \"I'm just here to help with questions about Go-Get's "
    "bookkeeping, tax, and payroll services! Is there something along those lines I can help you with, or "
    "would you like to book a consultation?\""
)
_CHATBOT_RATE_LIMIT_WINDOW_SECONDS = 300
_CHATBOT_RATE_LIMIT_MAX_REQUESTS = 15
_chatbot_rate_limit_buckets: dict[str, list[float]] = {}


def _check_chatbot_rate_limit(client_ip: str) -> None:
    now = time.monotonic()
    bucket = _chatbot_rate_limit_buckets.setdefault(client_ip, [])
    cutoff = now - _CHATBOT_RATE_LIMIT_WINDOW_SECONDS
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= _CHATBOT_RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many messages — please wait a few minutes and try again.",
        )
    bucket.append(now)


@router.post("/chatbot")
async def chatbot(request: Request, body: dict = Body(...)):
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "message is required")
    if len(message) > MAX_CHATBOT_MESSAGE_LENGTH:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"message must be under {MAX_CHATBOT_MESSAGE_LENGTH} characters",
        )

    _check_chatbot_rate_limit(request.client.host if request.client else "unknown")

    history = body.get("history") or []
    trimmed_history = [
        {"role": turn.get("role"), "content": str(turn.get("content"))[:MAX_CHATBOT_MESSAGE_LENGTH]}
        for turn in history[-MAX_CHATBOT_HISTORY_TURNS:]
        if isinstance(turn, dict) and turn.get("role") in ("user", "assistant") and turn.get("content")
    ]
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *trimmed_history,
        # Small/fast models (this endpoint uses llama-3.1-8b-instant) weight
        # instructions near the end of context more heavily than the system
        # prompt loaded far earlier, and will otherwise happily answer
        # off-topic requests (coding help, general trivia) despite the scope
        # boundary above. Repeating it right before the user's turn measurably
        # improves refusal compliance.
        {"role": "system", "content": CHATBOT_SCOPE_REMINDER},
        {"role": "user", "content": message},
    ]

    try:
        reply = await invoke_chat(messages)
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


# ── Website lead capture (Settings > Website Integration) ───────────────────
# Go-Get's own webhook_key (see routers/company.py); since this endpoint is
# unauthenticated, that key in the URL confirms the submission is genuine.
WEBHOOK_RATE_LIMIT_WINDOW_SECONDS = 300
WEBHOOK_RATE_LIMIT_MAX_REQUESTS = 30
_webhook_rate_limit_buckets: dict[str, list[float]] = {}


def _check_webhook_rate_limit(bucket_key: str) -> None:
    now = time.monotonic()
    bucket = _webhook_rate_limit_buckets.setdefault(bucket_key, [])
    cutoff = now - WEBHOOK_RATE_LIMIT_WINDOW_SECONDS
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= WEBHOOK_RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many submissions — please try again shortly."
        )
    bucket.append(now)


@router.post("/website-lead-capture/{webhook_key}", status_code=status.HTTP_201_CREATED)
async def capture_website_lead(
    webhook_key: str,
    request: Request,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    _check_webhook_rate_limit(f"{webhook_key}:{client_ip}")

    firm = (await db.execute(select(Firm).where(Firm.webhook_key == webhook_key))).scalar_one_or_none()
    if firm is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown webhook")

    contact_name = (body.get("contact_name") or body.get("full_name") or "").strip()
    email = (body.get("email") or "").strip()
    if not contact_name or not email:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "contact_name (or full_name) and email are required"
        )

    lead_body = {
        "contact_name": contact_name,
        "company_name": body.get("company_name") or body.get("business_name"),
        "email": email,
        "phone": body.get("phone"),
        "lead_type": body.get("lead_type"),
        "pipeline_type": "Hot Lead",
        "lead_source": "Website",
        "referral_source": body.get("form_source"),
        "services_interested": body.get("services_interested"),
        "urgency": body.get("urgency") or "This Month",
        "meeting_type": body.get("meeting_type"),
        "notes": body.get("how_can_we_help") or body.get("notes"),
        "stage": "New Lead",
    }
    lead_body = {key: value for key, value in lead_body.items() if value is not None}

    Lead = MODELS["Lead"]
    lead = build_create("Lead", Lead, lead_body, created_by=None)
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    firm.last_webhook_lead_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()

    try:
        await notify_lead_captured(lead)
    except Exception as exc:
        print(f"[website-lead-capture] notify email for lead {lead.id} failed to send: {exc}")

    return {"success": True, "lead_id": lead.id}
