"""Research-grade CSV exports for Content Studio."""

from __future__ import annotations

import csv
import json
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from io import StringIO
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query, Response
from languagepro_common.auth import CurrentUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles
from data_engine.api.v1.items import _items_stmt, _quality_flags
from data_engine.db import get_session
from data_engine.models import CefrLevel, GenerationJob, LLMCall, Question, Skill, ValidationResult

router = APIRouter(tags=["exports"])


def _period_to_delta(period: str) -> timedelta:
    return {"24h": timedelta(hours=24), "7d": timedelta(days=7), "30d": timedelta(days=30)}.get(
        period, timedelta(days=7)
    )


def _json_cell(value: Any) -> str:
    if value is None:
        return ""
    return json.dumps(value, ensure_ascii=False, default=str, sort_keys=True)


def _scalar(value: Any) -> str | int | float:
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _csv_response(filename: str, headers: list[str], rows: Iterable[dict[str, Any]]) -> Response:
    stream = StringIO()
    writer = csv.DictWriter(stream, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({key: _scalar(row.get(key)) for key in headers})

    return Response(
        content=stream.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _prompt_excerpt(payload: dict[str, Any], limit: int = 180) -> str:
    text = str(payload.get("prompt") or payload.get("passage") or payload.get("audio_url") or "")
    return text[:limit]


@router.get("/exports/questions.csv")
async def export_questions_csv(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    status: str | None = Query(None),
    skill: str | None = Query(None),
    cefr: str | None = Query(None),
    limit: int = Query(5000, ge=1, le=50000),
) -> Response:
    stmt = _items_stmt(status, skill, cefr).order_by(Question.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).all()
    headers = [
        "id",
        "bank_id",
        "type",
        "status",
        "skill",
        "cefr_level",
        "ielts_band_target",
        "estimated_seconds",
        "difficulty_b",
        "discrimination_a",
        "guessing_c",
        "n_responses",
        "source_license",
        "generated_by_model",
        "prompt_version_id",
        "generation_run_id",
        "prompt_excerpt",
        "has_answer_key",
        "quality_flags",
        "created_at",
        "updated_at",
    ]
    return _csv_response(
        "content-studio-questions.csv",
        headers,
        (
            {
                "id": str(q.id),
                "bank_id": str(q.bank_id),
                "type": q.type,
                "status": q.status,
                "skill": skill_code,
                "cefr_level": cefr_code,
                "ielts_band_target": q.ielts_band_target,
                "estimated_seconds": q.estimated_seconds,
                "difficulty_b": q.difficulty_b,
                "discrimination_a": q.discrimination_a,
                "guessing_c": q.guessing_c,
                "n_responses": q.n_responses,
                "source_license": q.source_license,
                "generated_by_model": q.generated_by_model,
                "prompt_version_id": q.prompt_version_id,
                "generation_run_id": str(q.generation_run_id) if q.generation_run_id else "",
                "prompt_excerpt": _prompt_excerpt(q.payload or {}),
                "has_answer_key": bool(q.answer_key),
                "quality_flags": "|".join(_quality_flags(q)),
                "created_at": q.created_at,
                "updated_at": q.updated_at,
            }
            for q, skill_code, cefr_code in rows
        ),
    )


@router.get("/exports/validation-results.csv")
async def export_validation_results_csv(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    limit: int = Query(10000, ge=1, le=50000),
) -> Response:
    stmt = (
        select(
            ValidationResult,
            Question,
            Skill.code.label("skill_code"),
            CefrLevel.code.label("cefr_code"),
        )
        .join(Question, ValidationResult.question_id == Question.id)
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
        .order_by(ValidationResult.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    headers = [
        "id",
        "question_id",
        "skill",
        "cefr_level",
        "question_status",
        "juror_model",
        "verdict",
        "criteria_scores",
        "reasoning",
        "created_at",
    ]
    return _csv_response(
        "content-studio-validation-results.csv",
        headers,
        (
            {
                "id": str(v.id),
                "question_id": str(v.question_id),
                "skill": skill_code,
                "cefr_level": cefr_code,
                "question_status": q.status,
                "juror_model": v.juror_model,
                "verdict": v.verdict,
                "criteria_scores": _json_cell(v.criteria_scores),
                "reasoning": v.reasoning,
                "created_at": v.created_at,
            }
            for v, q, skill_code, cefr_code in rows
        ),
    )


@router.get("/exports/generation-jobs.csv")
async def export_generation_jobs_csv(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    limit: int = Query(5000, ge=1, le=50000),
) -> Response:
    rows = (
        await db.execute(
            select(GenerationJob).order_by(GenerationJob.created_at.desc()).limit(limit)
        )
    ).scalars()
    headers = [
        "id",
        "owner_user_id",
        "status",
        "params",
        "totals",
        "started_at",
        "finished_at",
        "created_at",
    ]
    return _csv_response(
        "content-studio-generation-jobs.csv",
        headers,
        (
            {
                "id": str(job.id),
                "owner_user_id": str(job.owner_user_id) if job.owner_user_id else "",
                "status": job.status,
                "params": _json_cell(job.params),
                "totals": _json_cell(job.totals),
                "started_at": job.started_at,
                "finished_at": job.finished_at,
                "created_at": job.created_at,
            }
            for job in rows
        ),
    )


@router.get("/exports/llm-calls.csv")
async def export_llm_calls_csv(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    period: Literal["24h", "7d", "30d"] = "7d",
    limit: int = Query(10000, ge=1, le=50000),
) -> Response:
    since = datetime.now(UTC) - _period_to_delta(period)
    rows = (
        await db.execute(
            select(LLMCall).where(LLMCall.ts >= since).order_by(LLMCall.ts.desc()).limit(limit)
        )
    ).scalars()
    headers = [
        "request_id",
        "ts",
        "service",
        "purpose",
        "provider",
        "model",
        "prompt_version_id",
        "tokens_in",
        "tokens_out",
        "cost_usd",
        "latency_ms",
        "cache_hit",
        "status",
        "error_class",
        "user_id",
        "attempt_id",
        "question_id",
    ]
    return _csv_response(
        "content-studio-llm-calls.csv",
        headers,
        (
            {
                "request_id": str(call.request_id),
                "ts": call.ts,
                "service": call.service,
                "purpose": call.purpose,
                "provider": call.provider,
                "model": call.model,
                "prompt_version_id": call.prompt_version_id,
                "tokens_in": call.tokens_in,
                "tokens_out": call.tokens_out,
                "cost_usd": call.cost_usd,
                "latency_ms": call.latency_ms,
                "cache_hit": call.cache_hit,
                "status": call.status,
                "error_class": call.error_class,
                "user_id": str(call.user_id) if call.user_id else "",
                "attempt_id": str(call.attempt_id) if call.attempt_id else "",
                "question_id": str(call.question_id) if call.question_id else "",
            }
            for call in rows
        ),
    )
