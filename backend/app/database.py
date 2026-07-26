from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

# Single-tenant: Go-Get's own database. Every table (users, the firm's own
# settings row, clients, leads, invoices, ...) lives here.
engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """Metadata for the single application database."""


async def get_db():
    async with SessionLocal() as session:
        yield session
