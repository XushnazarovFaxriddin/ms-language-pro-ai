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
