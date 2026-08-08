"""Unauthenticated endpoints reachable from the public marketing site —
moved verbatim from the old routers/public.py."""

import datetime

from ...adapters.email import send_email
from ...adapters.llm import invoke_chat
from ...chatbot_prompt import SYSTEM_PROMPT
from ...config import settings
from ...models import MODELS
from ...notify import notify_lead_captured
from ...serialization import build_create
from .._shared.rate_limit import RateLimiter

# ── Contact form ─────────────────────────────────────────────────────────
async def submit_contact_form(name: str, email: str, message: str, company: str) -> None:
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


# ── Marketing-site chatbot ──────────────────────────────────────────────────
# Stateless on the server: the widget resends its own (client-trimmed)
# conversation history every turn, so no chat storage/entity is needed.
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
chatbot_rate_limiter = RateLimiter(window_seconds=300, max_requests=15)


async def run_chatbot(message: str, history: list) -> str:
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
    return await invoke_chat(messages)


# ── Website lead capture (Settings > Website Integration) ───────────────────
# Go-Get's own webhook_key (see services/company/); since this endpoint is
# unauthenticated, that key in the URL confirms the submission is genuine.
webhook_rate_limiter = RateLimiter(window_seconds=300, max_requests=30)


async def capture_website_lead(db, firm, body: dict):
    lead_body = {
        "contact_name": body.get("contact_name") or body.get("full_name"),
        "company_name": body.get("company_name") or body.get("business_name"),
        "email": body.get("email"),
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

    return lead
