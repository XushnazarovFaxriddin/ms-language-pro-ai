"""FastAPI dependencies: S2S verification + browser user JWT."""

from __future__ import annotations

from typing import Annotated

from fastapi import Cookie, Depends, Header, Request
from languagepro_common.auth import (
    AUTH_COOKIE_ACCESS,
    CurrentUser,
    Role,
    make_get_current_user,
    verify_s2s_token,
)
from languagepro_common.errors import ForbiddenError, UnauthorizedError

from data_engine.settings import settings

_get_user = make_get_current_user(
    secret=settings.AUTH_JWT_SECRET,
    algorithm=settings.AUTH_JWT_ALGORITHM,
    issuer=settings.AUTH_JWT_ISSUER,
    audience=settings.AUTH_JWT_AUDIENCE,
)


async def get_current_user(
    request: Request,
    access_token: Annotated[str | None, Cookie(alias=AUTH_COOKIE_ACCESS)] = None,
) -> CurrentUser:
    return await _get_user(request, access_token)


def require_roles(*allowed: Role):
    async def _dep(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if not set(user.roles).intersection(allowed):
            raise ForbiddenError("Insufficient role")
        return user

    return _dep


def require_s2s(*scopes: str):
    async def _dep(
        authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    ) -> dict:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise UnauthorizedError("Missing S2S token")
        token = authorization[7:]
        return verify_s2s_token(
            token,
            secret=settings.S2S_SHARED_SECRET,
            expected_issuer="exam-platform",
            expected_audience="data-engine",
            required_scopes=list(scopes),
        )

    return _dep
