"""DB-backed LLM cost logger for exam-platform calls."""

from __future__ import annotations

from typing import Any

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from exam_platform.models import LLMCall


class DbCostLoggerSink:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        service_name: str,
    ):
        self._session_factory = session_factory
        self._service_name = service_name

    async def record(self, **kwargs: Any) -> None:
        request_id = kwargs["request_id"]
        purpose = kwargs["purpose"]
        provider = kwargs["provider"]
        model = kwargs["model"]
        tokens_in = kwargs["tokens_in"]
        tokens_out = kwargs["tokens_out"]
        cost_usd = kwargs["cost_usd"]
        latency_ms = kwargs["latency_ms"]
        prompt_version_id = kwargs.get("prompt_version_id")
        async with self._session_factory() as session:
            await session.execute(
                insert(LLMCall).values(
                    request_id=request_id,
                    service=self._service_name,
                    purpose=purpose,
                    provider=provider,
                    model=model,
                    prompt_version_id=prompt_version_id,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost_usd=cost_usd,
                    latency_ms=latency_ms,
                    cache_hit=kwargs.get("cache_hit", False),
                    status=kwargs.get("status", "success"),
                    error_class=kwargs.get("error_class"),
                    user_id=kwargs.get("user_id"),
                    attempt_id=kwargs.get("attempt_id"),
                    question_id=kwargs.get("question_id"),
                )
            )
            await session.commit()
