"""Personalised roadmap generation and retrieval."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from languagepro_common.errors import NotFoundError, ValidationError
from languagepro_llm import LLMRequest, LLMRouter
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.models import AttemptResponse, ExamAttempt, Roadmap, ScoringResult
from exam_platform.schemas import (
    RoadmapOut,
    RoadmapPlan,
    RoadmapRegenerateRequest,
    TodayRoadmapOut,
)


async def get_active_roadmap(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> RoadmapOut:
    roadmap = (
        await db.execute(
            select(Roadmap)
            .where(Roadmap.user_id == user_id, Roadmap.status == "active")
            .order_by(Roadmap.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if roadmap is None:
        raise NotFoundError("Active roadmap not found")
    return _roadmap_out(roadmap)


async def get_today_roadmap(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> TodayRoadmapOut:
    roadmap = await get_active_roadmap(db, user_id=user_id)
    first_milestone = roadmap.plan.milestones[0] if roadmap.plan.milestones else None
    return TodayRoadmapOut(
        roadmap_id=roadmap.id,
        items=first_milestone.items if first_milestone else [],
    )


async def regenerate_roadmap(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    body: RoadmapRegenerateRequest,
) -> RoadmapOut:
    anchor_attempt = (
        await db.execute(
            select(ExamAttempt)
            .where(ExamAttempt.user_id == user_id)
            .order_by(ExamAttempt.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if anchor_attempt is None:
        raise NotFoundError("Cannot generate roadmap without at least one attempt")

    current_band = await _current_band_estimate(db, anchor_attempt.id)
    variables = {
        "bands": {
            "overall": current_band,
            "listening": None,
            "reading": None,
            "writing": None,
            "speaking": None,
        },
        "criterion_scores": {},
        "top_error_codes": [],
        "vocabulary_metrics": {},
        "target_band": body.target_band,
        "target_date": body.target_date.isoformat(),
        "weekly_hours": body.weekly_hours,
        "focus_skill": body.focus_skill,
        "user_locale": anchor_attempt.locale,
        "drill_catalogue": [],
        "weeks_until_target": body.weeks_until_target,
    }
    resp = await router.complete(
        LLMRequest(
            purpose="feedback",
            prompt_id="feedback/roadmap_generate",
            variables=variables,
            user_id=user_id,
            attempt_id=anchor_attempt.id,
        )
    )
    if resp.parsed is None:
        raise ValidationError("Roadmap response did not match schema")
    plan = RoadmapPlan.model_validate(resp.parsed)

    await db.execute(
        update(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.status == "active")
        .values(status="superseded")
    )
    roadmap = Roadmap(
        user_id=user_id,
        anchor_attempt_id=anchor_attempt.id,
        target_band=Decimal(str(body.target_band)),
        target_date=body.target_date,
        weekly_hours=body.weekly_hours,
        current_band_estimate=Decimal(str(current_band)) if current_band is not None else None,
        predicted_band_at_target=_prediction(current_band, body.target_band),
        plan=plan.model_dump(mode="json"),
        status="active",
    )
    db.add(roadmap)
    await db.commit()
    await db.refresh(roadmap)
    return _roadmap_out(roadmap)


async def _current_band_estimate(db: AsyncSession, attempt_id: UUID) -> float | None:
    rows = (
        (
            await db.execute(
                select(ScoringResult.band)
                .join(AttemptResponse, ScoringResult.response_id == AttemptResponse.id)
                .where(AttemptResponse.attempt_id == attempt_id, ScoringResult.band.is_not(None))
            )
        )
        .scalars()
        .all()
    )
    if rows:
        bands = [float(v) for v in rows if v is not None]
        return round(sum(bands) / len(bands), 1) if bands else None
    attempt = (
        await db.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    ).scalar_one_or_none()
    if attempt is None or not attempt.theta_estimates:
        return None
    theta_avg = sum(float(v) for v in attempt.theta_estimates.values()) / len(
        attempt.theta_estimates
    )
    return round(max(0.0, min(9.0, 5.5 + theta_avg)), 1)


def _prediction(current_band: float | None, target_band: float) -> dict[str, Any]:
    baseline = current_band if current_band is not None else max(4.0, target_band - 1.0)
    p50 = min(target_band, baseline + 0.5)
    return {
        "p10": round(max(0.0, p50 - 0.5), 1),
        "p50": round(p50, 1),
        "p90": round(min(9.0, p50 + 0.5), 1),
    }


def _roadmap_out(row: Roadmap) -> RoadmapOut:
    return RoadmapOut(
        id=row.id,
        anchor_attempt_id=row.anchor_attempt_id,
        target_band=float(row.target_band),
        target_date=row.target_date,
        weekly_hours=row.weekly_hours,
        current_band_estimate=(
            float(row.current_band_estimate) if row.current_band_estimate is not None else None
        ),
        predicted_band_at_target=row.predicted_band_at_target,
        plan=RoadmapPlan.model_validate(row.plan),
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
