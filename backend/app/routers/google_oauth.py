"""
Per-user "Connect your Gmail" OAuth (Settings > Email). Distinct from the
Microsoft Graph app-only sender in adapters/email.py (info@go-get.ca,
signup verification only, unaffected by any of this) — this lets any staff
user send CRM email as themselves. See adapters/gmail.py for the send call.

/connect and /disconnect are normal authenticated endpoints. /callback is
not — it's Google redirecting the user's browser directly, with no
Authorization header available, so the caller's identity instead comes from
the signed `state` token minted in /connect (see security.py's
create_oauth_state_token/decode_oauth_state_token).
"""

import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import ConnectedEmailAccount
from ..security import create_oauth_state_token, decode_oauth_state_token, encrypt_secret

router = APIRouter(prefix="/api/integrations/google", tags=["integrations"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"

# Settings > Email lives at this frontend route (src/App.jsx); the callback
# redirects the browser back here once the connection succeeds or fails.
_REDIRECT_PAGE = "/EmailSettings"


@router.get("/connect")
async def google_connect(user=Depends(get_current_user)):
    if not settings.google_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google integration is not configured")

    state = create_oauth_state_token({"user_id": user.id, "purpose": "google_oauth"})
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": GMAIL_SEND_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return {"authorize_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/callback")
async def google_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    redirect_base = f"{settings.frontend_base_url.rstrip('/')}{_REDIRECT_PAGE}"

    if error or not code or not state:
        return RedirectResponse(f"{redirect_base}?email_connect_error=google_oauth_failed")

    payload = decode_oauth_state_token(state)
    if not payload or payload.get("purpose") != "google_oauth":
        return RedirectResponse(f"{redirect_base}?email_connect_error=google_oauth_failed")

    user_id = payload["user_id"]

    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_oauth_redirect_uri,
            },
        )
        if token_response.status_code != 200:
            return RedirectResponse(f"{redirect_base}?email_connect_error=google_oauth_failed")
        tokens = token_response.json()

        refresh_token = tokens.get("refresh_token")
        if not refresh_token:
            # Google only issues a refresh_token on first consent for a given
            # client+user; prompt=consent above should always force one, but
            # guard rather than silently store a token we can't ever renew.
            return RedirectResponse(f"{redirect_base}?email_connect_error=google_oauth_no_refresh_token")

        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_response.status_code != 200:
            return RedirectResponse(f"{redirect_base}?email_connect_error=google_oauth_failed")
        email_address = userinfo_response.json().get("email")

    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        account = ConnectedEmailAccount(user_id=user_id, extra={})
        db.add(account)

    account.provider = "google"
    account.email_address = email_address
    account.refresh_token_encrypted = encrypt_secret(refresh_token)
    account.access_token_encrypted = encrypt_secret(tokens["access_token"])
    account.access_token_expires_at = now + datetime.timedelta(seconds=tokens["expires_in"])
    account.scopes = tokens.get("scope", GMAIL_SEND_SCOPE)
    await db.commit()

    return RedirectResponse(f"{redirect_base}?email_connected=1")


@router.delete("/disconnect")
async def google_disconnect(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account:
        await db.delete(account)
        await db.commit()
    return {"success": True}
