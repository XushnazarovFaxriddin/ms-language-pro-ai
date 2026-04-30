"""FastAPI app bootstrap helper.

Wires the **complete** production middleware stack for any of our services:
    request id → logging → CORS → security headers
    → CSRF → rate limit → idempotency
    → Sentry → error handlers
    → real /healthz + /readyz

Each service still owns its routers and lifespan (lifespan param accepts a
factory). Keeping this in the shared library guarantees the stack is identical
across auth-api, data-engine-api, exam-platform-api.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from languagepro_common.errors import register_error_handlers
from languagepro_common.logging import configure_logging, get_logger
from languagepro_common.middleware import RequestIdMiddleware
from languagepro_common.observability import (
    check_db,
    check_http,
    check_redis,
    init_sentry,
)
from languagepro_common.security import (
    CSRFMiddleware,
    IdempotencyMiddleware,
    RateLimitMiddleware,
)
from languagepro_common.settings import BaseAppSettings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """OWASP-recommended baseline headers; Caddy adds HSTS in prod."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers.setdefault("x-content-type-options", "nosniff")
        response.headers.setdefault("x-frame-options", "DENY")
        response.headers.setdefault("referrer-policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "permissions-policy",
            "microphone=(self), camera=(), geolocation=(), payment=()",
        )
        return response


def build_app(
    *,
    title: str,
    settings: BaseAppSettings,
    routers: list[Any],
    redis_factory: Callable[[], Awaitable[Any]] | None = None,
    db_engine_factory: Callable[[], Any] | None = None,
    deps_check_url: str | None = None,
    rate_limit_rules: list[tuple[str, int, int]] | None = None,
    csrf_skip_paths: set[str] | None = None,
    extra_lifespan: Callable[[FastAPI], Any] | None = None,
) -> FastAPI:
    configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
    log = get_logger(__name__)
    init_sentry(settings)

    redis_state: dict[str, Any] = {"client": None, "engine": None, "http_client": None}

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if redis_factory is not None:
            try:
                redis_state["client"] = await redis_factory()
            except Exception as exc:
                log.warning("redis_factory_failed", error=str(exc))
        if db_engine_factory is not None:
            redis_state["engine"] = db_engine_factory()
        log.info("service_started", service=settings.SERVICE_NAME, env=settings.PYTHON_ENV)

        if extra_lifespan is not None:
            cm = extra_lifespan(app)
            if hasattr(cm, "__aenter__"):
                async with cm:
                    yield
            else:
                yield
        else:
            yield

        client = redis_state.get("client")
        if client is not None:
            try:
                await client.aclose()
            except Exception:
                pass
        log.info("service_stopped", service=settings.SERVICE_NAME)

    app = FastAPI(
        title=title,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/v1/docs",
        redoc_url="/v1/redoc",
        openapi_url="/v1/openapi.json",
    )

    # Order matters: outermost first, innermost last.
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(.*\.)?(localhost|aiexam\.uz)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["x-request-id"],
    )

    register_error_handlers(app)

    for router in routers:
        app.include_router(router, prefix="/v1")

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok", "service": settings.SERVICE_NAME}

    @app.get("/readyz")
    async def readyz() -> JSONResponse:
        engine = redis_state.get("engine")
        client = redis_state.get("client")
        deps = redis_state.get("http_client")
        results: dict[str, bool] = {}
        if engine is not None:
            results["db"] = await check_db(engine)
        if client is not None:
            results["redis"] = await check_redis(client)
        if deps_check_url and deps is not None:
            results["data_engine"] = await check_http(deps, deps_check_url)
        ok = all(results.values()) if results else True
        return JSONResponse(
            status_code=200 if ok else 503,
            content={
                "status": "ready" if ok else "not_ready",
                "service": settings.SERVICE_NAME,
                "checks": results,
            },
        )

    # CSRF / rate limit / idempotency need a Redis client to exist; we install
    # them as **plain Starlette middlewares** with a deferred Redis lookup so the
    # service can still boot if Redis is unreachable at import time.

    # Note: order is reversed at runtime — last added runs first.
    if redis_factory is not None:
        # IdempotencyMiddleware: needs redis at request time
        class _LazyIdempotency(BaseHTTPMiddleware):
            async def dispatch(self, request: Request, call_next):
                client = redis_state.get("client")
                if client is None:
                    return await call_next(request)
                inner = IdempotencyMiddleware(self.app, redis=client)  # type: ignore[arg-type]
                return await inner.dispatch(request, call_next)

        class _LazyRateLimit(BaseHTTPMiddleware):
            async def dispatch(self, request: Request, call_next):
                client = redis_state.get("client")
                if client is None:
                    return await call_next(request)
                inner = RateLimitMiddleware(  # type: ignore[arg-type]
                    self.app, redis=client, rules=rate_limit_rules or []
                )
                return await inner.dispatch(request, call_next)

        app.add_middleware(_LazyIdempotency)
        app.add_middleware(_LazyRateLimit)

    app.add_middleware(
        CSRFMiddleware,
        skip_paths=csrf_skip_paths
        or {"/v1/login", "/v1/register", "/v1/refresh", "/v1/oauth/google/start", "/v1/oauth/google/callback"},
        require_in_dev=False,
    )

    return app
