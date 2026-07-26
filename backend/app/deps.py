from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import MODELS
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

User = MODELS["User"]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    email = decode_access_token(credentials.credentials)
    if email is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User inactive or not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.role not in ("admin", "director"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user
