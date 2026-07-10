"""Personalised roadmap generation and retrieval."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from languagepro_common.errors import NotFoundError
from languagepro_common.logging import get_logger
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
from exam_platform.services import feedback as feedback_svc

IELTS_SKILLS = ("listening", "reading", "writing", "speaking")
log = get_logger(__name__)


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
            .where(ExamAttempt.user_id == user_id, ExamAttempt.state == "completed")
            .order_by(ExamAttempt.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    # If no completed attempt exists, use fallback bands and skip LLM call
    if anchor_attempt is None:
        current_bands: dict[str, float | None] = {
            **dict.fromkeys(IELTS_SKILLS),
            "overall": max(4.0, body.target_band - 1.5),
        }
        current_band = current_bands.get("overall")
        plan = _fallback_plan(body, current_bands)
        anchor_id = None
    else:
        current_bands = await _current_bands_estimate(db, anchor_attempt.id)
        current_band = current_bands.get("overall")
        anchor_id = anchor_attempt.id
        variables = {
            "bands": current_bands,
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
        plan = _roadmap_plan_from_response(
            resp.parsed,
            body=body,
            current_bands=current_bands,
        )

    await db.execute(
        update(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.status == "active")
        .values(status="superseded")
    )
    roadmap = Roadmap(
        user_id=user_id,
        anchor_attempt_id=anchor_id,
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


async def _current_bands_estimate(db: AsyncSession, attempt_id: UUID) -> dict[str, float | None]:
    bands = await feedback_svc.compute_attempt_bands(db, attempt_id)
    if bands.get("overall") is not None:
        return bands

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
        row_bands = [float(v) for v in rows if v is not None]
        overall = round(sum(row_bands) / len(row_bands), 1) if row_bands else None
        return {**dict.fromkeys(IELTS_SKILLS), "overall": overall}

    attempt = (
        await db.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    ).scalar_one_or_none()
    if attempt is None or not attempt.theta_estimates:
        return {**dict.fromkeys(IELTS_SKILLS), "overall": None}

    theta_avg = sum(float(v) for v in attempt.theta_estimates.values()) / len(
        attempt.theta_estimates
    )
    overall = round(max(0.0, min(9.0, 5.5 + theta_avg)), 1)
    return {**dict.fromkeys(IELTS_SKILLS), "overall": overall}


def _prediction(current_band: float | None, target_band: float) -> dict[str, Any]:
    baseline = current_band if current_band is not None else max(4.0, target_band - 1.0)
    p50 = min(target_band, baseline + 0.5)
    return {
        "p10": round(max(0.0, p50 - 0.5), 1),
        "p50": round(p50, 1),
        "p90": round(min(9.0, p50 + 0.5), 1),
    }


def _roadmap_plan_from_response(
    parsed: Any,
    *,
    body: RoadmapRegenerateRequest,
    current_bands: dict[str, float | None],
) -> RoadmapPlan:
    if parsed is None:
        log.warning("roadmap_llm_empty_response_using_fallback")
        return _fallback_plan(body, current_bands)

    try:
        return RoadmapPlan.model_validate(_normalise_plan_payload(parsed))
    except Exception as exc:
        log.warning("roadmap_llm_invalid_response_using_fallback", error=str(exc))
        return _fallback_plan(body, current_bands)


def _normalise_plan_payload(parsed: Any) -> Any:
    if not isinstance(parsed, dict):
        return parsed
    payload = dict(parsed)
    spaced = payload.get("spaced_repetition")
    if isinstance(spaced, dict):
        payload["spaced_repetition"] = {**spaced, "algorithm": "fsrs"}
    return payload


def _fallback_plan(
    body: RoadmapRegenerateRequest,
    current_bands: dict[str, float | None],
) -> RoadmapPlan:
    current = current_bands.get("overall")
    current_text = f"{current:.1f}" if current is not None else "aniqlanmagan"
    weeks = min(body.weeks_until_target, 12)
    daily_minutes = max(20, round((body.weekly_hours * 60) / 7))
    drill_minutes = max(15, daily_minutes - 10)
    milestones = []
    for week in range(1, weeks + 1):
        is_last = week == weeks
        mock_minutes = 60 if is_last else max(20, daily_minutes // 2)
        milestones.append(
            {
                "week": week,
                "theme": f"{body.focus_skill.title()} focus week {week}",
                "skill_focus": [body.focus_skill],
                "expected_band_lift": round(min(0.5, 0.1 + week * 0.03), 1),
                "items": [
                    {
                        "type": "drill",
                        "ref": f"{body.focus_skill}:foundation",
                        "minutes": drill_minutes,
                        "frequency": "daily",
                    },
                    {
                        "type": "vocabulary",
                        "ref": f"{body.focus_skill}:target-vocabulary",
                        "minutes": 10,
                        "frequency": "daily",
                    },
                    {
                        "type": "mock",
                        "ref": "ielts-mini-mock" if not is_last else "ielts-final-mock",
                        "minutes": mock_minutes,
                        "frequency": "weekly",
                    },
                ],
            }
        )

    return RoadmapPlan.model_validate(
        {
            "milestones": milestones,
            "daily_targets": {
                "vocabulary_cards": min(60, max(15, body.weekly_hours * 3)),
                "drill_minutes": drill_minutes,
                "mock_questions": 5 if body.weekly_hours < 6 else 10,
            },
            "spaced_repetition": {
                "algorithm": "fsrs",
                "queue_size": min(120, max(30, body.weekly_hours * 8)),
                "stability_target": "7 days",
            },
            "unmet_codes": [],
            "narrative_uz": (
                f"Hozirgi umumiy band taxmini {current_text}; maqsad {body.target_band:.1f}. "
                f"Reja {body.focus_skill} skillini markazga qo'yib, har hafta barqaror "
                "drill, vocabulary va mini-mock mashqlarini beradi. Natijani yaxshilash "
                "uchun har kuni qisqa, lekin uzluksiz mashq qilish tavsiya etiladi."
            ),
            "narrative_en": (
                f"Your current overall band estimate is {current_text}; the target is "
                f"{body.target_band:.1f}. This plan focuses on {body.focus_skill} with "
                "steady weekly drills, vocabulary work, and mini-mock practice. The best "
                "next step is short, consistent daily practice."
            ),
        }
    )


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
