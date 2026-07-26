"""
Per-user "Connect your OneDrive" OAuth (Settings > Email > Connected Cloud
Storage). Mirrors google_oauth.py's shape exactly, but against Microsoft's
identity platform "common" authority so both personal Microsoft accounts and
work/school (Azure AD) accounts can connect — distinct from the Graph
app-only mail sender in adapters/email.py, which is unaffected by any of
this.

/connect and /disconnect are normal authenticated endpoints. /callback is
not — it's Microsoft redirecting the user's browser directly, so the
caller's identity comes from the signed `state` token minted in /connect,
same pattern as google_oauth.py.
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
from ..models import ConnectedOneDriveAccount
from ..security import create_oauth_state_token, decode_oauth_state_token, encrypt_secret

router = APIRouter(prefix="/api/integrations/onedrive", tags=["integrations"])

MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"
ONEDRIVE_SCOPE = "Files.ReadWrite offline_access User.Read"

# Settings > Email lives at this frontend route (src/App.jsx); the callback
# redirects the browser back here once the connection succeeds or fails.
_REDIRECT_PAGE = "/EmailSettings"


@router.get("/status")
async def onedrive_status(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConnectedOneDriveAccount).where(ConnectedOneDriveAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        return {"connected": False, "email_address": None}
    return {"connected": True, "email_address": account.email_address}


@router.get("/connect")
async def onedrive_connect(user=Depends(get_current_user)):
    if not settings.onedrive_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "OneDrive integration is not configured")

    state = create_oauth_state_token({"user_id": user.id, "purpose": "onedrive_oauth"})
    params = {
        "client_id": settings.onedrive_client_id,
        "redirect_uri": settings.onedrive_redirect_uri,
        "response_type": "code",
        "scope": ONEDRIVE_SCOPE,
        "response_mode": "query",
        "prompt": "consent",
        "state": state,
    }
    return {"authorize_url": f"{MS_AUTH_URL}?{urlencode(params)}"}


@router.get("/callback")
async def onedrive_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    redirect_base = f"{settings.frontend_base_url.rstrip('/')}{_REDIRECT_PAGE}"

    if error or not code or not state:
        return RedirectResponse(f"{redirect_base}?onedrive_connect_error=onedrive_oauth_failed")

    payload = decode_oauth_state_token(state)
    if not payload or payload.get("purpose") != "onedrive_oauth":
        return RedirectResponse(f"{redirect_base}?onedrive_connect_error=onedrive_oauth_failed")

    user_id = payload["user_id"]

    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post(
            MS_TOKEN_URL,
            data={
                "client_id": settings.onedrive_client_id,
                "client_secret": settings.onedrive_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.onedrive_redirect_uri,
                "scope": ONEDRIVE_SCOPE,
            },
        )
        if token_response.status_code != 200:
            return RedirectResponse(f"{redirect_base}?onedrive_connect_error=onedrive_oauth_failed")
        tokens = token_response.json()

        refresh_token = tokens.get("refresh_token")
        if not refresh_token:
            return RedirectResponse(f"{redirect_base}?onedrive_connect_error=onedrive_oauth_no_refresh_token")

        userinfo_response = await client.get(
            GRAPH_ME_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_response.status_code != 200:
            return RedirectResponse(f"{redirect_base}?onedrive_connect_error=onedrive_oauth_failed")
        userinfo = userinfo_response.json()
        # Personal Microsoft accounts often have `mail: null` — userPrincipalName
        # is always present and is the right fallback identifier either way.
        email_address = userinfo.get("mail") or userinfo.get("userPrincipalName")

    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(ConnectedOneDriveAccount).where(ConnectedOneDriveAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        account = ConnectedOneDriveAccount(user_id=user_id, extra={})
        db.add(account)

    account.email_address = email_address
    account.refresh_token_encrypted = encrypt_secret(refresh_token)
    account.access_token_encrypted = encrypt_secret(tokens["access_token"])
    account.access_token_expires_at = now + datetime.timedelta(seconds=tokens["expires_in"])
    account.scopes = tokens.get("scope", ONEDRIVE_SCOPE)
    await db.commit()

    return RedirectResponse(f"{redirect_base}?onedrive_connected=1")


@router.delete("/disconnect")
async def onedrive_disconnect(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConnectedOneDriveAccount).where(ConnectedOneDriveAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account:
        await db.delete(account)
        await db.commit()
    return {"success": True}
