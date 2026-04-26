"""FastAPI dependencies: S2S verification + user JWT."""

from __future__ import annotations

from typing import Annotated

from fastapi import Header

from data_engine.settings import settings
from languagepro_common.auth import verify_s2s_token
from languagepro_common.errors import UnauthorizedError


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
