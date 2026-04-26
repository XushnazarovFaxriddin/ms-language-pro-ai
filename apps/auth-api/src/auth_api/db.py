from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from languagepro_common.db import make_engine, make_session_factory
from auth_api.settings import settings

engine = make_engine(settings.DATABASE_URL, echo=settings.is_dev)
SessionLocal: async_sessionmaker[AsyncSession] = make_session_factory(engine)


async def get_session() -> AsyncSession:
    """FastAPI dependency."""
    async with SessionLocal() as session:
        yield session
