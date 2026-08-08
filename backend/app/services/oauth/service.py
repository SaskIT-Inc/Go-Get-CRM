"""
Per-user "Connect your email/cloud storage" OAuth — Settings > Email and
Settings > Email > Connected Cloud Storage. Three providers (Gmail, Outlook,
OneDrive) share this exact flow shape and used to be three copy-pasted
router files (google_oauth.py, outlook_oauth.py, onedrive_oauth.py):
/connect mints a signed state token and returns an authorize_url,
/callback exchanges the code for tokens (the browser lands here directly
from the provider — no Authorization header available, so the caller's
identity comes from the state token minted in /connect instead), and
/disconnect deletes the stored account row.

Each ProviderConfig below captures the handful of things that actually
differ between the three: auth/token/userinfo URLs, requested scope, which
Settings credentials to use, which account table it stores into (Gmail and
Outlook share ConnectedEmailAccount distinguished by `.provider`; OneDrive
has its own ConnectedOneDriveAccount table since it's storage, not a mail
identity), how to pull the connected email address out of that provider's
userinfo response, and the exact redirect query-param names the frontend
already listens for on Settings > Email.

Distinct from the Microsoft Graph app-only sender in adapters/email.py
(info@go-get.ca, signup verification only) and Google/Microsoft's own
OAuth app registrations used only for this per-user flow — none of that is
affected by any of this.
"""

import datetime
from dataclasses import dataclass
from typing import Callable, Optional
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import settings
from ...models import ConnectedEmailAccount, ConnectedOneDriveAccount
from ...security import create_oauth_state_token, decode_oauth_state_token, encrypt_secret

# Settings > Email lives at this frontend route (src/App.jsx); every
# callback redirects the browser back here once the connection succeeds or
# fails, regardless of provider.
REDIRECT_PAGE = "/EmailSettings"

MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"


def _microsoft_userinfo_email(userinfo: dict) -> Optional[str]:
    # Personal Microsoft accounts often have `mail: null` — userPrincipalName
    # is always present and is the right fallback identifier either way.
    return userinfo.get("mail") or userinfo.get("userPrincipalName")


@dataclass
class ProviderConfig:
    name: str
    purpose: str
    auth_url: str
    token_url: str
    userinfo_url: str
    scope: str
    response_mode: Optional[str]
    account_model: type
    account_provider_value: Optional[str]
    extract_email: Callable[[dict], Optional[str]]
    error_param: str
    connected_param: str
    not_configured_message: str
    is_configured: Callable[[], bool]
    client_id: Callable[[], str]
    client_secret: Callable[[], str]
    redirect_uri: Callable[[], str]


def build_provider_configs():
    google = ProviderConfig(
        name="google",
        purpose="google_oauth",
        auth_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        userinfo_url="https://www.googleapis.com/oauth2/v2/userinfo",
        scope="https://www.googleapis.com/auth/gmail.send",
        response_mode=None,
        account_model=ConnectedEmailAccount,
        account_provider_value="google",
        extract_email=lambda userinfo: userinfo.get("email"),
        error_param="email_connect_error",
        connected_param="email_connected",
        not_configured_message="Google integration is not configured",
        is_configured=lambda: settings.google_configured,
        client_id=lambda: settings.google_client_id,
        client_secret=lambda: settings.google_client_secret,
        redirect_uri=lambda: settings.google_oauth_redirect_uri,
    )
    onedrive = ProviderConfig(
        name="onedrive",
        purpose="onedrive_oauth",
        auth_url=MS_AUTH_URL,
        token_url=MS_TOKEN_URL,
        userinfo_url=GRAPH_ME_URL,
        scope="Files.ReadWrite offline_access User.Read",
        response_mode="query",
        account_model=ConnectedOneDriveAccount,
        account_provider_value=None,
        extract_email=_microsoft_userinfo_email,
        error_param="onedrive_connect_error",
        connected_param="onedrive_connected",
        not_configured_message="OneDrive integration is not configured",
        is_configured=lambda: settings.microsoft_oauth_configured,
        client_id=lambda: settings.microsoft_client_id,
        client_secret=lambda: settings.microsoft_client_secret,
        redirect_uri=lambda: settings.onedrive_redirect_uri,
    )
    outlook = ProviderConfig(
        name="outlook",
        purpose="outlook_oauth",
        auth_url=MS_AUTH_URL,
        token_url=MS_TOKEN_URL,
        userinfo_url=GRAPH_ME_URL,
        scope="Mail.Send offline_access User.Read",
        response_mode="query",
        account_model=ConnectedEmailAccount,
        account_provider_value="microsoft",
        extract_email=_microsoft_userinfo_email,
        error_param="email_connect_error",
        connected_param="email_connected",
        not_configured_message="Outlook integration is not configured",
        is_configured=lambda: settings.microsoft_oauth_configured,
        client_id=lambda: settings.microsoft_client_id,
        client_secret=lambda: settings.microsoft_client_secret,
        redirect_uri=lambda: settings.outlook_redirect_uri,
    )
    return google, onedrive, outlook


def connect(cfg: ProviderConfig, user) -> dict:
    if not cfg.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, cfg.not_configured_message)

    state = create_oauth_state_token({"user_id": user.id, "purpose": cfg.purpose})
    params = {
        "client_id": cfg.client_id(),
        "redirect_uri": cfg.redirect_uri(),
        "response_type": "code",
        "scope": cfg.scope,
        "prompt": "consent",
        "state": state,
    }
    if cfg.name == "google":
        params["access_type"] = "offline"
    if cfg.response_mode:
        params["response_mode"] = cfg.response_mode
    return {"authorize_url": f"{cfg.auth_url}?{urlencode(params)}"}


async def callback(
    cfg: ProviderConfig,
    db: AsyncSession,
    code: Optional[str],
    state: Optional[str],
    error: Optional[str],
) -> RedirectResponse:
    redirect_base = f"{settings.frontend_base_url.rstrip('/')}{REDIRECT_PAGE}"

    if error or not code or not state:
        return RedirectResponse(f"{redirect_base}?{cfg.error_param}={cfg.purpose}_failed")

    payload = decode_oauth_state_token(state)
    if not payload or payload.get("purpose") != cfg.purpose:
        return RedirectResponse(f"{redirect_base}?{cfg.error_param}={cfg.purpose}_failed")

    user_id = payload["user_id"]

    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post(
            cfg.token_url,
            data={
                "client_id": cfg.client_id(),
                "client_secret": cfg.client_secret(),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": cfg.redirect_uri(),
                **({"scope": cfg.scope} if cfg.name != "google" else {}),
            },
        )
        if token_response.status_code != 200:
            return RedirectResponse(f"{redirect_base}?{cfg.error_param}={cfg.purpose}_failed")
        tokens = token_response.json()

        refresh_token = tokens.get("refresh_token")
        if not refresh_token:
            # Both providers only issue a refresh_token on first consent for
            # a given client+user; prompt=consent above should always force
            # one, but guard rather than silently store a token we can never
            # renew.
            return RedirectResponse(f"{redirect_base}?{cfg.error_param}={cfg.purpose}_no_refresh_token")

        userinfo_response = await client.get(
            cfg.userinfo_url,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_response.status_code != 200:
            return RedirectResponse(f"{redirect_base}?{cfg.error_param}={cfg.purpose}_failed")
        email_address = cfg.extract_email(userinfo_response.json())

    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(cfg.account_model).where(cfg.account_model.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        account = cfg.account_model(user_id=user_id, extra={})
        db.add(account)

    if cfg.account_provider_value is not None:
        account.provider = cfg.account_provider_value
    account.email_address = email_address
    account.refresh_token_encrypted = encrypt_secret(refresh_token)
    account.access_token_encrypted = encrypt_secret(tokens["access_token"])
    account.access_token_expires_at = now + datetime.timedelta(seconds=tokens["expires_in"])
    account.scopes = tokens.get("scope", cfg.scope)
    await db.commit()

    return RedirectResponse(f"{redirect_base}?{cfg.connected_param}=1")


async def get_account(cfg: ProviderConfig, user, db: AsyncSession):
    result = await db.execute(
        select(cfg.account_model).where(cfg.account_model.user_id == user.id)
    )
    return result.scalar_one_or_none()


async def disconnect(cfg: ProviderConfig, user, db: AsyncSession) -> dict:
    account = await get_account(cfg, user, db)
    if account:
        await db.delete(account)
        await db.commit()
    return {"success": True}
