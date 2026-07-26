"""
Firm: the single row holding Go-Get's own company profile/settings. Hand-
written rather than a generic ENTITY_DEFINITIONS entry, because unlike every
other entity it must NOT get the generic `/api/{entity}` CRUD surface (it's
read/written only through routers/company.py, scoped to the one row).
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from ..database import Base
from .factory import BaseColumnsMixin


class Firm(BaseColumnsMixin, Base):
    __tablename__ = "firms"

    name = Column(String, nullable=False)
    # Company profile, editable from Settings > Company (routers/company.py).
    legal_name = Column(String, nullable=True)
    business_number = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    province = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    website = Column(String, nullable=True)
    # Uploaded via /api/files (Settings > Company).
    logo_url = Column(String, nullable=True)
    # Website Lead Capture (Settings > Website Integration). Generated lazily
    # on first view of that tab (routers/company.py); the public webhook
    # (routers/public.py) uses it to confirm the submission is genuine, since
    # that endpoint is unauthenticated.
    webhook_key = Column(String, unique=True, nullable=True, index=True)
    last_webhook_lead_at = Column(DateTime(timezone=True), nullable=True)


class Invitation(BaseColumnsMixin, Base):
    """A pending staff invite. token_hash stores only sha256(raw token) —
    the raw token exists only in the accept-invite email/link, never at
    rest, so a database read alone can't be used to accept someone else's
    invite."""

    __tablename__ = "invitations"

    email = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="user")
    job_title = Column(String, nullable=True)
    permissions = Column(JSONB, nullable=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    invited_by = Column(String, nullable=True)


class EmailVerification(BaseColumnsMixin, Base):
    """A pending signup email-verification code. code_hash stores only
    sha256(code) — the raw code exists only in the sent email, never at
    rest — mirroring Invitation.token_hash's approach above."""

    __tablename__ = "email_verifications"

    email = Column(String, nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    attempts = Column(Integer, nullable=False, default=0)


class ConnectedEmailAccount(BaseColumnsMixin, Base):
    """A staff member's own connected mailbox (Settings > Email), used to
    send CRM email as *them* instead of the platform's shared sender
    (adapters/email.py, which stays reserved for signup verification and
    other platform-identity transactional mail). refresh_token_encrypted is
    genuinely reversible (Fernet, app/security/crypto.py) rather than hashed
    like Invitation.token_hash/EmailVerification.code_hash above, since the
    app must present the raw refresh token back to the provider later."""

    __tablename__ = "connected_email_accounts"

    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    provider = Column(String, nullable=False)  # "google" today; "microsoft" later
    email_address = Column(String, nullable=False)
    refresh_token_encrypted = Column(String, nullable=False)
    access_token_encrypted = Column(String, nullable=True)
    access_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(String, nullable=True)


class ConnectedOneDriveAccount(BaseColumnsMixin, Base):
    """A staff member's or client's own connected OneDrive (Settings > Email
    > Connected Cloud Storage), used to upload synced filings/signed
    documents into *their* personal Microsoft account instead of one shared
    firm-wide drive — see adapters/onedrive.py. Same encrypted-refresh-token
    shape as ConnectedEmailAccount above, kept as its own table (rather than
    a shared "provider" row) since a user could plausibly connect both a
    Gmail sender and a OneDrive storage account at once."""

    __tablename__ = "connected_onedrive_accounts"

    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    email_address = Column(String, nullable=False)
    refresh_token_encrypted = Column(String, nullable=False)
    access_token_encrypted = Column(String, nullable=True)
    access_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(String, nullable=True)
