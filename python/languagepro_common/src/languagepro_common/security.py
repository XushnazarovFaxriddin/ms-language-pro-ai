"""Production-grade security middleware: CSRF, rate-limit, idempotency.

Each middleware is opt-in and configurable. All three are pure-Redis (no extra
infra dependency). Designed to plug into FastAPI via `app.add_middleware(...)`.

Usage:
    from languagepro_common.security import (
        CSRFMiddleware, RateLimitMiddleware, IdempotencyMiddleware,
    )
    redis = await aioredis.from_url(settings.REDIS_URL)
    app.add_middleware(CSRFMiddleware, csrf_cookie="lp_csrf",
                       skip_paths={"/v1/login","/v1/register","/v1/refresh"})
    app.add_middleware(RateLimitMiddleware, redis=redis,
                       rules=[("/v1/login", 5, 60), ("/v1/register", 3, 3600)])
    app.add_middleware(IdempotencyMiddleware, redis=redis, ttl_seconds=86400)
"""

from __future__ import annotations

import hashlib
import json
import time
from collections.abc import Awaitable, Callable
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

# Lazy import — redis is heavy; only required if these middlewares are used.
RedisLike = Any  # `redis.asyncio.Redis` duck-typed


# ───────────────────────── CSRF ─────────────────────────


class CSRFMiddleware(BaseHTTPMiddleware):
    """Double-submit CSRF: header `X-CSRF-Token` must equal `<csrf_cookie>`.

    Only enforced on mutating methods (POST/PATCH/PUT/DELETE).
    Skip auth endpoints used to **establish** the CSRF cookie itself.
    """

    SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})

    def __init__(
        self,
        app: ASGIApp,
        *,
        csrf_cookie: str = "lp_csrf",
        header_name: str = "X-CSRF-Token",
        skip_paths: set[str] | None = None,
        skip_prefixes: tuple[str, ...] = ("/v1/webhooks/",),
        require_in_dev: bool = False,
    ) -> None:
        super().__init__(app)
        self._cookie = csrf_cookie
        self._header = header_name
        self._skip_paths = skip_paths or {"/v1/login", "/v1/register", "/v1/refresh"}
        self._skip_prefixes = skip_prefixes
        self._require_in_dev = require_in_dev

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method in self.SAFE_METHODS:
            return await call_next(request)

        path = request.url.path
        if path in self._skip_paths or any(path.startswith(p) for p in self._skip_prefixes):
            return await call_next(request)

        # S2S calls carry a Bearer JWT, not a cookie — skip CSRF for them.
        if request.headers.get("authorization", "").lower().startswith("bearer "):
            return await call_next(request)

        cookie_token = request.cookies.get(self._cookie)
        header_token = request.headers.get(self._header)
        if not cookie_token or not header_token or cookie_token != header_token:
            return JSONResponse(
                status_code=403,
                media_type="application/problem+json",
                content={
                    "type": "https://api.aiexam.uz/errors/csrf",
                    "title": "CSRF token missing or invalid",
                    "status": 403,
                    "detail": "Provide X-CSRF-Token matching the lp_csrf cookie.",
                    "instance": path,
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
        return await call_next(request)


# ───────────────────────── Rate limit ─────────────────────────


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token-bucket-ish per-IP and per-user limit, Redis-backed.

    rules: list of (path_prefix, max_requests, window_seconds)
    Default: 120 req/minute per IP for any other endpoint.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        redis: RedisLike,
        rules: list[tuple[str, int, int]] | None = None,
        default_per_minute: int = 120,
    ) -> None:
        super().__init__(app)
        self._redis = redis
        self._rules = rules or []
        self._default = default_per_minute
        self._default_window = 60

    def _client_key(self, request: Request) -> str:
        # Prefer authenticated user id if available (set by auth dep upstream).
        user_id = request.headers.get("x-user-id")
        if user_id:
            return f"u:{user_id}"
        client = request.client
        return f"ip:{client.host if client else 'unknown'}"

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        path = request.url.path
        method = request.method
        # Find first matching rule
        max_req, window = self._default, self._default_window
        scope = "default"
        for prefix, mr, w in self._rules:
            if path.startswith(prefix):
                max_req, window, scope = mr, w, prefix
                break

        bucket = f"rl:{scope}:{method}:{self._client_key(request)}"
        try:
            n = await self._redis.incr(bucket)
            if n == 1:
                await self._redis.expire(bucket, window)
        except Exception:
            # Fail-open if Redis is down — better to lose protection than refuse traffic.
            return await call_next(request)

        if n > max_req:
            ttl = await self._redis.ttl(bucket)
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(max(1, ttl))},
                media_type="application/problem+json",
                content={
                    "type": "https://api.aiexam.uz/errors/rate-limit",
                    "title": "Too many requests",
                    "status": 429,
                    "detail": f"Limit {max_req} per {window}s exceeded.",
                    "instance": path,
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
        return await call_next(request)


# ───────────────────────── Idempotency ─────────────────────────


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """Replay-safe POST mutations.

    If the client sends `Idempotency-Key: <key>`, the server stores
    `(method, path, user_id, key) -> {status, headers, body}` in Redis for `ttl_seconds`.
    A retry with the same tuple replays the original response without re-running the handler.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        redis: RedisLike,
        ttl_seconds: int = 86_400,
        only_methods: frozenset[str] = frozenset({"POST", "PATCH", "PUT", "DELETE"}),
    ) -> None:
        super().__init__(app)
        self._redis = redis
        self._ttl = ttl_seconds
        self._only = only_methods

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method not in self._only:
            return await call_next(request)
        key = request.headers.get("idempotency-key")
        if not key:
            return await call_next(request)

        user_id = request.headers.get("x-user-id") or "anon"
        bucket = f"idem:{request.method}:{request.url.path}:{user_id}:{key}"
        try:
            cached = await self._redis.get(bucket)
        except Exception:
            return await call_next(request)
        if cached:
            try:
                data = json.loads(cached)
                return Response(
                    content=data["body"],
                    status_code=data["status"],
                    headers={**data.get("headers", {}), "x-idempotent-replay": "true"},
                    media_type=data.get("media_type", "application/json"),
                )
            except Exception:
                pass  # corrupt cache, regenerate

        response = await call_next(request)
        # Buffer the response body so we can both store it and return it.
        body = b""
        async for chunk in response.body_iterator:  # type: ignore[attr-defined]
            body += chunk
        try:
            await self._redis.set(
                bucket,
                json.dumps(
                    {
                        "status": response.status_code,
                        "body": body.decode("utf-8", errors="replace"),
                        "headers": {
                            k: v
                            for k, v in response.headers.items()
                            if k.lower() in {"content-type", "x-request-id"}
                        },
                        "media_type": response.media_type,
                    }
                ),
                ex=self._ttl,
            )
        except Exception:
            pass

        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )


# ───────────────────────── Helpers ─────────────────────────


def stable_hash(*parts: Any) -> str:
    """Deterministic short hash for cache keys."""
    h = hashlib.sha256()
    for p in parts:
        h.update(str(p).encode())
    return h.hexdigest()[:32]


def now_ms() -> int:
    return int(time.time() * 1000)
