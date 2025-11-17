from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from ..config import get_settings


settings = get_settings()


class Base(DeclarativeBase):
    """Base class for ORM models."""


def build_engine() -> AsyncEngine:
    return create_async_engine(settings.database_url, echo=False, future=True)


engine = build_engine()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    from . import models  # noqa: F401  # ensure metadata is registered

    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
