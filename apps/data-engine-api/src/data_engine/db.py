from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from languagepro_common.db import Base, make_engine, make_session_factory
from data_engine.settings import settings

engine = make_engine(settings.DATABASE_URL, echo=settings.is_dev)
SessionLocal: async_sessionmaker[AsyncSession] = make_session_factory(engine)

__all__ = ["Base", "SessionLocal", "engine", "get_session"]


async def get_session() -> AsyncSession:
    async with SessionLocal() as s:
        yield s
