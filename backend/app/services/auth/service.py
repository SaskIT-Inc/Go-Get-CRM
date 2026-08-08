"""Signup/login/invite business logic — moved verbatim from the old
routers/auth.py. Not an entity CRUD service (no schema.py): User rows are
created here, but only through these specific, carefully-guarded flows —
generic /api/User writes are blocked (see serialization.PROTECTED_FIELDS)
specifically so these checks can't be bypassed via the CRUD router instead.
"""

import datetime
import hashlib
import secrets

from ...adapters.email import send_email
from ...config import settings
from ...models import EmailVerification
from .._shared.rate_limit import RateLimiter

INVITE_EXPIRE_DAYS = 7


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def send_verification_email(email: str, code: str) -> None:
    link = f"{settings.frontend_base_url}/verify-email?email={email}&code={code}"
    try:
        await send_email(
            to=email,
            subject="Verify your email — GOGET CRM",
            body=(
                f"Welcome to GOGET CRM!\n\n"
                f"Your verification code is: {code}\n\n"
                f"This code expires in {settings.verification_code_expire_minutes} minutes.\n\n"
                f"Or click this link to verify automatically:\n{link}\n\n"
                f"If you didn't request this, you can ignore this email."
            ),
            from_email=settings.verification_from_email,
        )
    except Exception as exc:
        # Non-fatal: the verification code is already saved, so the caller
        # can still verify by requesting another resend rather than getting
        # a 500 from a transient email-provider hiccup.
        print(f"[verify-email] send to {email} failed: {exc}")


async def create_verification(db, email: str) -> str:
    code = generate_verification_code()
    verification = EmailVerification(
        email=email,
        code_hash=hash_token(code),
        expires_at=datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(minutes=settings.verification_code_expire_minutes),
    )
    db.add(verification)
    await db.commit()
    return code


# In-process per-email rate limit for the unauthenticated resend endpoint —
# mirrors the pattern used for the public chatbot/webhook endpoints.
resend_rate_limiter = RateLimiter(window_seconds=900, max_requests=3)

# In-process per-IP rate limit on login attempts — the only unauthenticated,
# brute-forceable endpoint in the app.
login_rate_limiter = RateLimiter(window_seconds=300, max_requests=10)
