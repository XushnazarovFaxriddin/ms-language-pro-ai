"""data-engine-api FastAPI app — production middleware stack via shared factory."""

from __future__ import annotations

from languagepro_common import build_app
from redis.asyncio import Redis

from data_engine.api.v1 import (
    blueprints,
    calibration,
    exports,
    generation,
    items,
    llm_usage,
    practice_catalogue,
    practice_content,
    research,
)
from data_engine.db import engine
from data_engine.settings import settings


async def _redis_factory() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


app = build_app(
    title="LanguagePro AI — Data Engine API",
    settings=settings,
    routers=[
        items.router,
        blueprints.router,
        generation.router,
        llm_usage.router,
        practice_content.router,
        practice_catalogue.router,
        exports.router,
        research.router,
        calibration.router,
    ],
    redis_factory=_redis_factory,
    db_engine_factory=lambda: engine,
    rate_limit_rules=[
        ("/v1/generation/jobs", 10, 60),
        ("/v1/items/next", 600, 60),  # S2S hot path
        ("/v1/research/calibration/trigger", 1, 600),  # heavy job; once per 10min
    ],
    csrf_skip_paths={
        # S2S endpoints use Bearer auth, not cookies — middleware skips them
        # automatically (sees Authorization: Bearer header). Listed for clarity:
    },
)


@app.get("/v1/info")
async def info() -> dict:
    return {
        "service": settings.SERVICE_NAME,
        "version": "1.0.0",
        "llm_default_model": settings.LLM_PROFILE_GENERATE_QUESTION,
        "openai_base_url": settings.OPENAI_BASE_URL,
    }
