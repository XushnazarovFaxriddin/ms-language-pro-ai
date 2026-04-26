"""DB-backed CostLogger sink. Inserts each LLM call into analytics.llm_calls."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

from data_engine.models import LLMCall


class DbCostLoggerSink:
    """Implements languagepro_llm.CostLoggerSink protocol."""

    def __init__(self, session_factory: async_sessionmaker, service_name: str):
        self._sf = session_factory
        self._service = service_name

    async def record(
        self,
        *,
        request_id: UUID,
        purpose: str,
        provider: str,
        model: str,
        tokens_in: int,
        tokens_out: int,
        cost_usd: Decimal,
        latency_ms: int,
        cache_hit: bool = False,
        status: str = "success",
        prompt_version_id: str | None = None,
        user_id: UUID | None = None,
        attempt_id: UUID | None = None,
        question_id: UUID | None = None,
        error_class: str | None = None,
        **_: Any,
    ) -> None:
        async with self._sf() as s:
            await s.execute(
                insert(LLMCall).values(
                    request_id=request_id,
                    service=self._service,
                    purpose=purpose,
                    provider=provider,
                    model=model,
                    prompt_version_id=prompt_version_id,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost_usd=cost_usd,
                    latency_ms=latency_ms,
                    cache_hit=cache_hit,
                    status=status,
                    error_class=error_class,
                    user_id=user_id,
                    attempt_id=attempt_id,
                    question_id=question_id,
                )
            )
            await s.commit()
