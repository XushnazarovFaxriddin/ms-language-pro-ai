"""HTTP client for data-engine-api with S2S JWT signing."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import httpx

from exam_platform.settings import settings
from languagepro_common.auth import mint_s2s_token


class DataEngineClient:
    """Minimal client. One instance per request is fine; tokens are short-lived."""

    def __init__(self, base_url: str | None = None):
        self._base = (base_url or settings.DATA_ENGINE_API_URL).rstrip("/")

    def _token(self, *scopes: str) -> str:
        return mint_s2s_token(
            secret=settings.S2S_SHARED_SECRET,
            issuer="exam-platform",
            audience="data-engine",
            scope=list(scopes),
            ttl_seconds=settings.S2S_TOKEN_TTL_SECONDS,
        )

    async def _get(self, path: str, *, scopes: list[str], params: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.get(
                f"{self._base}{path}",
                params=params,
                headers={"Authorization": f"Bearer {self._token(*scopes)}"},
            )
            r.raise_for_status()
            return r.json()

    async def _post(self, path: str, *, scopes: list[str], json: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(
                f"{self._base}{path}",
                json=json,
                headers={"Authorization": f"Bearer {self._token(*scopes)}"},
            )
            r.raise_for_status()
            if r.status_code == 204:
                return {}
            return r.json()

    # ----------------------------------------------------------- API methods
    async def get_blueprint(self, code: str) -> dict[str, Any]:
        return await self._get(f"/v1/exams/blueprints/{code}", scopes=["blueprints:read"])

    async def next_item(
        self,
        *,
        skill: str,
        theta: float = 0.0,
        exclude_ids: list[UUID] | None = None,
        attempt_id: UUID | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"skill": skill, "theta": theta}
        if exclude_ids:
            params["exclude_ids[]"] = [str(i) for i in exclude_ids]
        if attempt_id:
            params["attempt_id"] = str(attempt_id)
        return await self._get("/v1/items/next", scopes=["items:next"], params=params)

    async def get_answer_key(self, item_id: UUID) -> dict[str, Any]:
        return await self._get(f"/v1/items/{item_id}/key", scopes=["items:key"])

    async def post_response(self, item_id: UUID, payload: dict[str, Any]) -> None:
        await self._post(
            f"/v1/items/{item_id}/response",
            scopes=["responses:write"],
            json=payload,
        )
