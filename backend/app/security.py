from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    return payload.get("sub")


# Short-lived signed state for browser-redirect OAuth flows (Google connect),
# where the callback has no Authorization header to identify the caller —
# distinct from create_access_token above, which is a long-lived login
# session token keyed only by email.
def create_oauth_state_token(data: dict, expire_minutes: int = 10) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_oauth_state_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


# Reversible encryption for OAuth refresh/access tokens at rest (unlike the
# one-way hashes used for Invitation.token_hash / EmailVerification.code_hash,
# these must be decryptable — the app presents the raw token back to the
# provider later). Keyed by settings.encryption_key, a Fernet key distinct
# from jwt_secret.
def _fernet() -> Fernet:
    if not settings.encryption_key:
        raise RuntimeError("ENCRYPTION_KEY is not configured")
    return Fernet(settings.encryption_key.encode("utf-8"))


def encrypt_secret(raw: str) -> str:
    return _fernet().encrypt(raw.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Could not decrypt stored token") from exc
