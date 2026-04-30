"""auth-api FastAPI app — production middleware stack via shared factory."""

from __future__ import annotations

from languagepro_common import build_app
from redis.asyncio import Redis

from auth_api.api.v1 import auth as auth_router
from auth_api.api.v1 import me as me_router
from auth_api.db import engine
from auth_api.settings import settings


async def _redis_factory() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


app = build_app(
    title="LanguagePro AI — Auth API",
    settings=settings,
    routers=[auth_router.router, me_router.router],
    redis_factory=_redis_factory,
    db_engine_factory=lambda: engine,
    rate_limit_rules=[
        ("/v1/login", 5, 60),
        ("/v1/register", 3, 3600),
        ("/v1/refresh", 30, 60),
        ("/v1/me/change-password", 5, 300),
    ],
    csrf_skip_paths={
        "/v1/login",
        "/v1/register",
        "/v1/refresh",
        "/v1/logout",
        "/v1/oauth/google/start",
        "/v1/oauth/google/callback",
    },
)
