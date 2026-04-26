"""Cookie helpers — apex-domain JWT + opaque refresh."""

from __future__ import annotations

from fastapi import Response

from auth_api.settings import settings

ACCESS_COOKIE = "__Host-lp_access"
REFRESH_COOKIE = "__Host-lp_refresh"
CSRF_COOKIE = "__Host-lp_csrf"


def _set_cookie(
    response: Response,
    *,
    name: str,
    value: str,
    max_age: int,
    path: str = "/",
    http_only: bool = True,
    same_site: str = "lax",
) -> None:
    # In dev (PYTHON_ENV=development), Secure=False so HTTP works on .localhost
    secure = not settings.is_dev
    response.set_cookie(
        name,
        value=value,
        max_age=max_age,
        path=path,
        domain=settings.APEX_COOKIE_DOMAIN,
        secure=secure,
        httponly=http_only,
        samesite=same_site,
    )


def set_session_cookies(
    response: Response, *, access_jwt: str, refresh_token: str, csrf_token: str
) -> None:
    _set_cookie(
        response,
        name=ACCESS_COOKIE,
        value=access_jwt,
        max_age=settings.AUTH_ACCESS_TOKEN_TTL_SECONDS,
        same_site="lax",
    )
    _set_cookie(
        response,
        name=REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS,
        path="/v1/refresh",  # tighten scope; routed via api/auth/v1/refresh
        same_site="strict",
    )
    _set_cookie(
        response,
        name=CSRF_COOKIE,
        value=csrf_token,
        max_age=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS,
        http_only=False,  # readable by JS
    )


def clear_session_cookies(response: Response) -> None:
    for name, path in (
        (ACCESS_COOKIE, "/"),
        (REFRESH_COOKIE, "/v1/refresh"),
        (CSRF_COOKIE, "/"),
    ):
        response.delete_cookie(name, path=path, domain=settings.APEX_COOKIE_DOMAIN)
