import datetime
import secrets

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.email import send_email
from ...config import settings
from ...database import get_db
from ...deps import get_current_user
from ...models import MODELS, ConnectedEmailAccount, ConnectedOneDriveAccount, EmailVerification, Invitation
from ...modules import INVITABLE, normalize_matrix
from ...security import create_access_token, hash_password, verify_password
from ...serialization import serialize
from . import service

router = APIRouter(prefix="/auth", tags=["auth"])

User = MODELS["User"]
Client = MODELS["Client"]


@router.post("/login")
async def login(request: Request, body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    service.login_rate_limiter.enforce(
        request.client.host if request.client else "unknown",
        "Too many login attempts — please wait a few minutes and try again.",
    )
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")
    if not user.is_email_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            {
                "message": "Please verify your email before logging in.",
                "error_code": "email_not_verified",
                "email": user.email,
            },
        )
    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer", "user": serialize("User", user)}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return serialize("User", user)


@router.patch("/me")
async def update_me(body: dict = Body(...), user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for field in ("full_name", "phone", "job_title"):
        if field in body:
            setattr(user, field, body[field])
    await db.commit()
    await db.refresh(user)
    return serialize("User", user)


@router.post("/verify-email")
async def verify_email(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """Confirms a signup verification code and issues the access token."""
    email = (body.get("email") or "").strip().lower()
    code = (body.get("code") or "").strip()
    if not email or not code:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "email and code are required")

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account found for that email")

    if user.is_email_verified:
        token = create_access_token(user.email)
        return {"access_token": token, "token_type": "bearer", "user": serialize("User", user)}

    record = (
        await db.execute(
            select(EmailVerification)
            .where(EmailVerification.email == email, EmailVerification.verified_at.is_(None))
            .order_by(EmailVerification.created_date.desc())
        )
    ).scalars().first()
    if record is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "No pending verification for that email. Request a new code."
        )
    if record.expires_at < datetime.datetime.now(datetime.timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "This code has expired. Request a new one.")
    if record.attempts >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Request a new code.")

    record.attempts += 1
    if service.hash_token(code) != record.code_hash:
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect code")

    record.verified_at = datetime.datetime.now(datetime.timezone.utc)
    user.is_email_verified = True
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer", "user": serialize("User", user)}


@router.post("/resend-verification")
async def resend_verification(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "email is required")

    # Always return the same response regardless of what's found, so this
    # unauthenticated endpoint can't be used to probe which emails have
    # accounts or are already verified.
    if not service.resend_rate_limiter.allow(email):
        return {"status": "ok"}

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None or user.is_email_verified:
        return {"status": "ok"}

    code = await service.create_verification(db, email)
    await service.send_verification_email(email, code)
    return {"status": "ok"}


@router.post("/register")
async def register(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """
    Client self-activation: the email matches a Client record a staff member
    already created (e.g. via Client Onboarding), but no User row exists yet.
    Creates one with role "client", linking them to that record, and logs
    them in. Anyone else (no matching client record) is rejected — staff
    always arrive via /auth/accept-invite, never this endpoint.

    Deliberately does NOT touch an existing User row: earlier versions of
    this endpoint reset the password of any already-registered email with no
    proof of ownership (an account-takeover hole) — a match here now just
    means "sign in instead."
    """
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "email and password are required")

    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with that email already exists. Try signing in instead."
        )

    client = (
        (await db.execute(select(Client).where(func.lower(Client.primary_email) == email))).scalars().first()
    )
    if client is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "We couldn't find an invitation or client record for this email. "
            "Ask your firm admin for an invite, or contact us if you're a client.",
        )
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=body.get("full_name") or client.primary_contact_name or client.legal_name,
        role="client",
        # Matching an existing Client record by email is this endpoint's own
        # proof of ownership — there's no separate code-based verification
        # step in this flow, so mark it verified now or the account gets
        # silently locked out of login() the moment this token expires.
        is_email_verified=True,
        extra={},
    )
    db.add(user)

    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer", "user": serialize("User", user)}


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    body: dict = Body(...), _inviter=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Invites a new staff (or client) account: creates a pending Invitation
    (not a User yet — that only happens once they accept it via
    /auth/accept-invite) and emails them a link. Re-inviting an email that
    still has an unaccepted invitation refreshes that same invitation's
    token/expiry instead of creating a duplicate.

    Who can invite whom is the hierarchy in app/modules.py's INVITABLE:
    director -> admin/manager/bookkeeper/client; admin -> manager/bookkeeper/
    client; manager and bookkeeper can't invite anyone.
    """
    target_role = body.get("role")
    allowed_targets = INVITABLE.get(_inviter.role, set())
    if target_role not in allowed_targets:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, f"Your role can't invite a '{target_role}' user"
        )

    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "email is required")
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists")

    try:
        permissions = {} if target_role == "client" else normalize_matrix(body.get("permissions"))
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    pending = await db.execute(
        select(Invitation).where(
            Invitation.email == email,
            Invitation.accepted_at.is_(None),
        )
    )
    invitation = pending.scalar_one_or_none()
    if invitation is None:
        invitation = Invitation(email=email, extra={})
        db.add(invitation)

    raw_token = secrets.token_urlsafe(32)
    invitation.full_name = body.get("full_name")
    invitation.role = target_role
    invitation.job_title = body.get("job_title")
    invitation.permissions = permissions
    invitation.token_hash = service.hash_token(raw_token)
    invitation.expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        days=service.INVITE_EXPIRE_DAYS
    )
    invitation.invited_by = _inviter.email
    await db.commit()

    accept_url = f"{settings.frontend_base_url}/accept-invite/{raw_token}"
    try:
        await send_email(
            to=email,
            subject="You've been invited to join Go-Get on GOGET CRM",
            body=(
                f"You've been invited to join Go-Get on GOGET CRM as {invitation.role}.\n\n"
                f"Accept your invite: {accept_url}\n\n"
                f"This link expires in {service.INVITE_EXPIRE_DAYS} days."
            ),
        )
    except Exception as exc:
        # Non-fatal: the invitation itself is already saved, and accept_url
        # is handed back below regardless — a transient email-provider
        # hiccup shouldn't turn a successful invite into a 500.
        print(f"[invite] email to {email} failed: {exc} — accept_url still returned")

    # Always returned (not just when SMTP is unconfigured): this is an
    # admin-only endpoint, and the inviting admin already has legitimate
    # access to the invite — handing it back lets them relay it manually
    # (Slack, etc.) as a fallback alongside the email.
    return {"success": True, "email": email, "accept_url": accept_url}


@router.get("/invite/{token}")
async def get_invite(token: str, db: AsyncSession = Depends(get_db)):
    """Looked up by an unauthenticated visitor following the emailed link,
    so the accept-invite page can show them what they're joining before
    asking for a password."""
    result = await db.execute(select(Invitation).where(Invitation.token_hash == service.hash_token(token)))
    invitation = result.scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This invitation link is invalid.")
    if invitation.accepted_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This invitation has already been used.")
    if invitation.expires_at < datetime.datetime.now(datetime.timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "This invitation has expired.")

    return {
        "email": invitation.email,
        "role": invitation.role,
        "full_name": invitation.full_name,
        "firm_name": "Go-Get",
    }


@router.post("/accept-invite", status_code=status.HTTP_201_CREATED)
async def accept_invite(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    token = (body.get("token") or "").strip()
    password = body.get("password") or ""
    if not token or not password:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "token and password are required")
    if len(password) < 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password must be at least 8 characters")

    result = await db.execute(select(Invitation).where(Invitation.token_hash == service.hash_token(token)))
    invitation = result.scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This invitation link is invalid.")
    if invitation.accepted_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This invitation has already been used. Please sign in instead."
        )
    if invitation.expires_at < datetime.datetime.now(datetime.timezone.utc):
        raise HTTPException(
            status.HTTP_410_GONE, "This invitation has expired. Ask your admin to send a new one."
        )

    existing = await db.execute(select(User).where(User.email == invitation.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with that email already exists. Try signing in instead."
        )

    user = User(
        email=invitation.email,
        hashed_password=hash_password(password),
        full_name=body.get("full_name") or invitation.full_name or invitation.email,
        role=invitation.role,
        job_title=invitation.job_title,
        permissions=invitation.permissions or {},
        is_active=True,
        # Accepting the emailed invite link is this flow's own proof of email
        # ownership — mark verified now, or the account gets silently locked
        # out of login() the moment this token expires.
        is_email_verified=True,
        extra={},
    )
    db.add(user)
    invitation.accepted_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(user)

    token_out = create_access_token(user.email)
    return {"access_token": token_out, "token_type": "bearer", "user": serialize("User", user)}


@router.patch("/users/{user_id}/access")
async def update_user_access(
    user_id: str,
    body: dict = Body(...),
    actor=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    The only way to change a teammate's role/permissions/active status —
    generic /api/User writes are blocked (see serialization.PROTECTED_FIELDS
    + services/_shared/authorization.py) specifically so this endpoint's
    checks can't be bypassed by going through the CRUD router instead.
    """
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target.id == actor.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't change your own role or access")

    # A director may manage anyone in the firm, including a fellow director
    # (deactivate/demote a co-director) — INVITABLE governs who can be
    # *invited* as a new director-created account, which is deliberately
    # nobody; it isn't the same question as who an existing director may
    # manage.
    allowed_targets = set(INVITABLE.get(actor.role, set()))
    if actor.role == "director":
        allowed_targets |= {"director"}
    if target.role not in allowed_targets:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't manage this user")

    new_role = body.get("role", target.role)
    grantable = set(INVITABLE.get(actor.role, set()))
    if actor.role == "director":
        grantable |= {"director"}
    if new_role != target.role and new_role not in grantable:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your role can't grant '{new_role}'")

    deactivating = new_role != "client" and body.get("is_active") is False
    demoting_from_director = target.role == "director" and new_role != "director"
    if (demoting_from_director or (target.role == "director" and deactivating)):
        remaining = (
            await db.execute(
                select(func.count())
                .select_from(User)
                .where(
                    User.role == "director",
                    User.is_active.is_(True),
                    User.id != target.id,
                )
            )
        ).scalar_one()
        if remaining == 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "A firm must always have at least one active director"
            )

    if "role" in body:
        target.role = new_role
    if "permissions" in body:
        try:
            target.permissions = {} if target.role == "client" else normalize_matrix(body["permissions"])
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    if "is_active" in body:
        target.is_active = bool(body["is_active"])
    if "job_title" in body:
        target.job_title = body["job_title"]
    if "full_name" in body:
        target.full_name = body["full_name"]

    await db.commit()
    await db.refresh(target)
    return serialize("User", target)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    actor=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently removes a User row (as opposed to PATCH .../access's
    is_active toggle, which only blocks login/hides them from pickers).
    Records elsewhere that reference this person — task assignments, filing
    notes, invoice authorship, activity logs — store a plain email string
    rather than a foreign key (see models/definitions.py), so nothing else
    in the database is cascade-deleted; those records simply keep showing
    the now-defunct email, same as they would for any other stale
    assigned_to value.
    """
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target.id == actor.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't delete your own account")

    allowed_targets = set(INVITABLE.get(actor.role, set()))
    if actor.role == "director":
        allowed_targets |= {"director"}
    if target.role not in allowed_targets:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't manage this user")

    if target.role == "director":
        remaining = (
            await db.execute(
                select(func.count())
                .select_from(User)
                .where(User.role == "director", User.is_active.is_(True), User.id != target.id)
            )
        ).scalar_one()
        if remaining == 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "A firm must always have at least one active director"
            )

    # Real FK-backed rows (unlike the plain-string references above) — must
    # go first or the User delete below hits a foreign-key violation.
    for account in (
        await db.execute(select(ConnectedEmailAccount).where(ConnectedEmailAccount.user_id == target.id))
    ).scalars():
        await db.delete(account)
    for account in (
        await db.execute(select(ConnectedOneDriveAccount).where(ConnectedOneDriveAccount.user_id == target.id))
    ).scalars():
        await db.delete(account)

    await db.delete(target)
    await db.commit()
