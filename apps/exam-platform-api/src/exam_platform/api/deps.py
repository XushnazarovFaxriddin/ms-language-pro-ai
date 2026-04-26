"""FastAPI deps: current user from JWT cookie."""

from __future__ import annotations

from typing import Annotated

from fastapi import Cookie

from exam_platform.adapters.data_engine.client import DataEngineClient
from exam_platform.settings import settings
from languagepro_common.auth import CurrentUser, make_get_current_user

_get_user = make_get_current_user(
    secret=settings.AUTH_JWT_SECRET,
    algorithm=settings.AUTH_JWT_ALGORITHM,
    issuer=settings.AUTH_JWT_ISSUER,
    audience=settings.AUTH_JWT_AUDIENCE,
)


# Re-export so route files can `Depends(get_current_user)` directly.
async def get_current_user(
    request,
    access_token: Annotated[str | None, Cookie(alias="__Host-lp_access")] = None,
) -> CurrentUser:
    return await _get_user(request, access_token)


def get_data_engine_client() -> DataEngineClient:
    return DataEngineClient()
