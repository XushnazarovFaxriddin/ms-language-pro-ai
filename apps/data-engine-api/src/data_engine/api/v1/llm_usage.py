"""LLM token usage dashboard endpoints — admin panel data source."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from languagepro_common.auth import CurrentUser
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles
from data_engine.db import get_session
from data_engine.models import LLMCall

router = APIRouter(tags=["analytics"])


def _period_to_delta(period: str) -> timedelta:
    return {"24h": timedelta(hours=24), "7d": timedelta(days=7), "30d": timedelta(days=30)}.get(
        period, timedelta(days=7)
    )


@router.get("/analytics/llm-usage/summary")
async def usage_summary(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    period: Literal["24h", "7d", "30d"] = "7d",
) -> dict:
    since = datetime.now(UTC) - _period_to_delta(period)
    row = (
        await db.execute(
            select(
                func.count().label("n"),
                func.coalesce(func.sum(LLMCall.cost_usd), Decimal(0)),
                func.coalesce(func.sum(LLMCall.tokens_in), 0),
                func.coalesce(func.sum(LLMCall.tokens_out), 0),
                func.coalesce(func.avg(LLMCall.latency_ms), 0),
            ).where(LLMCall.ts >= since)
        )
    ).one()
    return {
        "period": period,
        "total_calls": int(row[0]),
        "total_cost_usd": str(row[1]),
        "total_tokens_in": int(row[2]),
        "total_tokens_out": int(row[3]),
        "avg_latency_ms": int(row[4]),
    }


@router.get("/analytics/llm-usage/by-purpose")
async def usage_by_purpose(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    period: Literal["24h", "7d", "30d"] = "7d",
) -> list[dict]:
    since = datetime.now(UTC) - _period_to_delta(period)
    rows = (
        await db.execute(
            select(
                LLMCall.purpose,
                func.count(),
                func.coalesce(func.sum(LLMCall.tokens_in), 0),
                func.coalesce(func.sum(LLMCall.tokens_out), 0),
                func.coalesce(func.sum(LLMCall.cost_usd), Decimal(0)),
                func.coalesce(func.avg(LLMCall.latency_ms), 0),
            )
            .where(LLMCall.ts >= since)
            .group_by(LLMCall.purpose)
            .order_by(func.sum(LLMCall.cost_usd).desc())
        )
    ).all()
    return [
        {
            "purpose": r[0],
            "calls": int(r[1]),
            "tokens_in": int(r[2]),
            "tokens_out": int(r[3]),
            "cost_usd": str(r[4]),
            "avg_latency_ms": int(r[5]),
        }
        for r in rows
    ]


@router.get("/analytics/llm-usage/by-model")
async def usage_by_model(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    period: Literal["24h", "7d", "30d"] = "7d",
) -> list[dict]:
    since = datetime.now(UTC) - _period_to_delta(period)
    rows = (
        await db.execute(
            select(
                LLMCall.model,
                func.count(),
                func.coalesce(func.sum(LLMCall.cost_usd), Decimal(0)),
                func.coalesce(func.avg(LLMCall.latency_ms), 0),
            )
            .where(LLMCall.ts >= since)
            .group_by(LLMCall.model)
            .order_by(func.sum(LLMCall.cost_usd).desc())
        )
    ).all()
    return [
        {"model": r[0], "calls": int(r[1]), "cost_usd": str(r[2]), "avg_latency_ms": int(r[3])}
        for r in rows
    ]


@router.get("/analytics/llm-usage/timeseries")
async def usage_timeseries(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    period: Literal["24h", "7d", "30d"] = "7d",
    granularity: Literal["hour", "day"] = "day",
) -> list[dict]:
    since = datetime.now(UTC) - _period_to_delta(period)
    bucket = func.date_trunc(granularity, LLMCall.ts).label("bucket")
    rows = (
        await db.execute(
            select(
                bucket,
                LLMCall.purpose,
                func.count(),
                func.coalesce(func.sum(LLMCall.cost_usd), Decimal(0)),
            )
            .where(LLMCall.ts >= since)
            .group_by(bucket, LLMCall.purpose)
            .order_by(bucket)
        )
    ).all()
    return [
        {"bucket": r[0].isoformat(), "purpose": r[1], "calls": int(r[2]), "cost_usd": str(r[3])}
        for r in rows
    ]


@router.get("/analytics/llm-usage/calls")
async def list_calls(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    limit: int = Query(50, le=500),
    purpose: str | None = None,
) -> list[dict]:
    q = select(LLMCall).order_by(LLMCall.ts.desc()).limit(limit)
    if purpose:
        q = q.where(LLMCall.purpose == purpose)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "request_id": str(r.request_id),
            "ts": r.ts.isoformat(),
            "service": r.service,
            "purpose": r.purpose,
            "model": r.model,
            "tokens_in": r.tokens_in,
            "tokens_out": r.tokens_out,
            "cost_usd": str(r.cost_usd),
            "latency_ms": r.latency_ms,
            "status": r.status,
        }
        for r in rows
    ]
