"""Sentry + readiness helpers shared by every service.

Sentry is a no-op when `SENTRY_DSN` is empty (default in dev). The readiness
helpers do real DB + Redis pings.
"""

from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from languagepro_common.logging import get_logger
from languagepro_common.settings import BaseAppSettings

log = get_logger(__name__)


def init_sentry(settings: BaseAppSettings) -> None:
    """Initialise Sentry if DSN is set. No-op otherwise.

    The FastAPI integration captures unhandled exceptions, request data, and
    stitches in the request_id we set in the request middleware.
    """
    dsn = settings.SENTRY_DSN
    if not dsn:
        log.debug("sentry_skipped_no_dsn", service=settings.SERVICE_NAME)
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=settings.PYTHON_ENV,
            release=getattr(settings, "RELEASE_VERSION", None),
            send_default_pii=False,
            traces_sample_rate=0.0 if settings.is_dev else 0.05,
            profiles_sample_rate=0.0 if settings.is_dev else 0.05,
            integrations=[StarletteIntegration(), FastApiIntegration()],
        )
        sentry_sdk.set_tag("service", settings.SERVICE_NAME)
        log.info("sentry_initialised", service=settings.SERVICE_NAME)
    except ImportError:
        log.warning("sentry_sdk_not_installed_skipping")
    except Exception as exc:
        log.warning("sentry_init_failed", error=str(exc))


# ─────────────────────── Readiness ───────────────────────


async def check_db(engine: AsyncEngine, timeout_s: float = 2.0) -> bool:
    try:
        async with asyncio.timeout(timeout_s):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        log.warning("readiness_db_failed", error=str(exc))
        return False


async def check_redis(redis_client: Any, timeout_s: float = 1.0) -> bool:
    if redis_client is None:
        return True  # no-redis is acceptable
    try:
        async with asyncio.timeout(timeout_s):
            pong = await redis_client.ping()
        return bool(pong)
    except Exception as exc:
        log.warning("readiness_redis_failed", error=str(exc))
        return False


async def check_http(
    client: Any, url: str, timeout_s: float = 2.0
) -> bool:
    """Optional dependency check (e.g. exam-api → data-api)."""
    if client is None:
        return True
    try:
        async with asyncio.timeout(timeout_s):
            resp = await client.get(url)
        return 200 <= resp.status_code < 500
    except Exception as exc:
        log.warning("readiness_http_failed", url=url, error=str(exc))
        return False
