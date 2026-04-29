"""IRT calibration + DIF + IRR research endpoints (admin / superadmin)."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles
from data_engine.db import get_session
from data_engine.services.calibration import (
    cohens_kappa,
    run_dif_analysis,
    run_recalibration,
)

router = APIRouter(tags=["research"])


@router.post("/research/calibration/run")
async def trigger_recalibration(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    min_responses: int = 30,
) -> dict[str, Any]:
    """Run an IRT recalibration synchronously.

    Rate-limited to 1 call per 10 minutes by the gateway middleware.
    For nightly background runs, see `arq` cron in jobs/__init__.py.
    """
    return await run_recalibration(db, min_responses=min_responses)


@router.get("/research/calibration/runs")
async def list_runs(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    limit: int = 20,
) -> list[dict[str, Any]]:
    rows = list(
        await db.execute(
            text(
                """
                SELECT id, started_at, finished_at, method,
                       n_items_recalibrated, n_responses_used, status, summary
                FROM data_engine.calibration_runs
                ORDER BY started_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
    )
    return [
        {
            "id": str(r.id),
            "started_at": r.started_at.isoformat(),
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            "method": r.method,
            "n_items_recalibrated": r.n_items_recalibrated,
            "n_responses_used": r.n_responses_used,
            "status": r.status,
            "summary": r.summary,
        }
        for r in rows
    ]


@router.get("/research/calibration/items/{item_id}/history")
async def item_history(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> list[dict[str, Any]]:
    rows = list(
        await db.execute(
            text(
                """
                SELECT created_at, a, b, c, n_responses, infit, outfit, calibration_run_id
                FROM data_engine.item_parameter_history
                WHERE question_id = :qid
                ORDER BY created_at DESC
                """
            ),
            {"qid": item_id},
        )
    )
    if not rows:
        raise NotFoundError(f"No calibration history for item {item_id}")
    return [
        {
            "created_at": r.created_at.isoformat(),
            "a": float(r.a),
            "b": float(r.b),
            "c": float(r.c),
            "n_responses": r.n_responses,
            "infit": float(r.infit) if r.infit is not None else None,
            "outfit": float(r.outfit) if r.outfit is not None else None,
            "calibration_run_id": str(r.calibration_run_id),
        }
        for r in rows
    ]


@router.post("/research/dif/run")
async def trigger_dif(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    group_a: str = "uz",
    group_b: str = "ru",
) -> dict[str, Any]:
    return await run_dif_analysis(db, group_a=group_a, group_b=group_b)


@router.get("/research/dif/findings")
async def list_dif(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    limit: int = 50,
) -> list[dict[str, Any]]:
    rows = list(
        await db.execute(
            text(
                """
                SELECT question_id, group_a, group_b, method, effect_size, p_value,
                       flagged, created_at
                FROM data_engine.dif_findings
                WHERE flagged = true
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
    )
    return [
        {
            "question_id": str(r.question_id),
            "group_a": r.group_a,
            "group_b": r.group_b,
            "method": r.method,
            "effect_size": float(r.effect_size),
            "p_value": float(r.p_value),
            "flagged": r.flagged,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


# ───────────────────────── IRR ─────────────────────────


class IRRComputeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rater_a: list[float] = Field(min_length=2)
    rater_b: list[float] = Field(min_length=2)


@router.post("/research/irr/compute")
async def compute_irr(
    body: IRRComputeIn,
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> dict[str, Any]:
    """Compute Cohen's quadratic-weighted κ + Pearson r + MAE.

    Used by the IRR study workflow: paste two columns of bands (LLM vs human),
    receive κ / r / MAE for the dissertation Table 5.1.
    """
    return cohens_kappa(body.rater_a, body.rater_b)
