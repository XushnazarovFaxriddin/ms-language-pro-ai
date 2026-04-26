"""Cookie helpers — apex-domain JWT + opaque refresh."""

from __future__ import annotations

from typing import Literal

from fastapi import Response
from languagepro_common.auth import AUTH_COOKIE_ACCESS, AUTH_COOKIE_CSRF, AUTH_COOKIE_REFRESH

from auth_api.settings import settings

ACCESS_COOKIE = AUTH_COOKIE_ACCESS
REFRESH_COOKIE = AUTH_COOKIE_REFRESH
CSRF_COOKIE = AUTH_COOKIE_CSRF


def _set_cookie(
    response: Response,
    *,
    name: str,
    value: str,
    max_age: int,
    path: str = "/",
    http_only: bool = True,
    same_site: Literal["lax", "strict", "none"] = "lax",
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
        path=settings.AUTH_REFRESH_COOKIE_PATH,
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
        (REFRESH_COOKIE, settings.AUTH_REFRESH_COOKIE_PATH),
        (CSRF_COOKIE, "/"),
    ):
        response.delete_cookie(name, path=path, domain=settings.APEX_COOKIE_DOMAIN)
