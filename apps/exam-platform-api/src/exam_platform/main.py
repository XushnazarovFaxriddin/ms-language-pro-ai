"""exam-platform-api FastAPI app — production middleware stack via shared factory."""

from __future__ import annotations

from languagepro_common import build_app
from redis.asyncio import Redis

from exam_platform.api.v1 import (
    anti_cheat,
    attempts,
    certificates,
    conversation,
    exams,
    feedback,
    practice,
    roadmap,
)
from exam_platform.db import engine
from exam_platform.settings import settings


async def _redis_factory() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


app = build_app(
    title="LanguagePro AI — Exam Platform API",
    settings=settings,
    routers=[
        exams.router,
        attempts.router,
        feedback.router,
        roadmap.router,
        practice.router,
        conversation.router,
        anti_cheat.router,
        certificates.router,
    ],
    redis_factory=_redis_factory,
    db_engine_factory=lambda: engine,
    rate_limit_rules=[
        ("/v1/attempts", 60, 60),
        ("/v1/conversation", 30, 60),
        ("/v1/anti-cheat", 600, 60),
    ],
)


@app.get("/v1/info")
async def info() -> dict:
    return {
        "service": settings.SERVICE_NAME,
        "version": "1.0.0",
        "data_engine_url": settings.DATA_ENGINE_API_URL,
    }


@app.get("/health")
async def health() -> dict:
    """Production health check — verifies DB and Redis connectivity."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession

    checks: dict[str, str] = {}

    # Check DB
    try:
        from exam_platform.db import async_session_factory

        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = f"error: {exc}"

    # Check Redis
    try:
        redis = await _redis_factory()
        await redis.ping()
        checks["redis"] = "ok"
        await redis.aclose()
    except Exception as exc:
        checks["redis"] = f"error: {exc}"

    healthy = all(v == "ok" for v in checks.values())
    from fastapi.responses import JSONResponse

    return JSONResponse(
        content={"status": "healthy" if healthy else "unhealthy", "checks": checks},
        status_code=200 if healthy else 503,
    )
