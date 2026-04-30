"""Research and NLP evidence endpoints for Content Studio."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles
from data_engine.api.v1.items import _items_stmt, _quality_flags
from data_engine.db import get_session
from data_engine.models import (
    CefrLevel,
    Question,
    QuestionEmbedding,
    Skill,
    ValidationResult,
)
from data_engine.schemas.api import NLPOverviewOut, NLPRecentValidationOut

router = APIRouter(tags=["research"])


def _score(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@router.get("/research/nlp-overview", response_model=NLPOverviewOut)
async def nlp_overview(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
) -> NLPOverviewOut:
    item_rows = (await db.execute(_items_stmt(None, None, None))).all()
    total_items = len(item_rows)

    coverage_by_skill: Counter[str] = Counter()
    coverage_by_cefr: Counter[str] = Counter()
    flag_counts: Counter[str] = Counter()

    for question, skill_code, cefr_code in item_rows:
        coverage_by_skill[skill_code] += 1
        coverage_by_cefr[cefr_code] += 1
        flag_counts.update(_quality_flags(question))

    validation_rows = (
        await db.execute(
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
        )
    ).all()

    verdicts: Counter[str] = Counter()
    validated_question_ids = set()
    criteria_totals: defaultdict[str, float] = defaultdict(float)
    criteria_counts: Counter[str] = Counter()
    recent_validations: list[NLPRecentValidationOut] = []

    for validation, question, skill_code, cefr_code in validation_rows:
        verdicts[validation.verdict] += 1
        validated_question_ids.add(question.id)
        for criterion, value in (validation.criteria_scores or {}).items():
            score = _score(value)
            if score is None:
                continue
            criteria_totals[criterion] += score
            criteria_counts[criterion] += 1

        if len(recent_validations) < 8:
            recent_validations.append(
                NLPRecentValidationOut(
                    id=validation.id,
                    question_id=validation.question_id,
                    skill=skill_code,
                    cefr_level=cefr_code,
                    verdict=validation.verdict,
                    juror_model=validation.juror_model,
                    criteria_scores=validation.criteria_scores or {},
                    reasoning_excerpt=validation.reasoning[:360],
                    created_at=validation.created_at,
                )
            )

    semantic_embeddings = int(
        (await db.execute(select(func.count()).select_from(QuestionEmbedding))).scalar_one()
    )
    blocking_flags = {"missing_answer_key", "missing_prompt", "missing_provenance"}
    export_ready = 0
    for question, _, _ in item_rows:
        flags = _quality_flags(question)
        if question.status == "approved" and not blocking_flags.intersection(flags):
            export_ready += 1

    return NLPOverviewOut(
        total_items=total_items,
        validated_items=len(validated_question_ids),
        validation_results=len(validation_rows),
        semantic_embeddings=semantic_embeddings,
        verdicts=dict(verdicts),
        criteria_averages={
            criterion: round(criteria_totals[criterion] / criteria_counts[criterion], 2)
            for criterion in sorted(criteria_totals)
            if criteria_counts[criterion]
        },
        quality_gates={
            "clean_payload": total_items - flag_counts.get("missing_prompt", 0),
            "answer_key_verified": total_items - flag_counts.get("missing_answer_key", 0),
            "provenance_ready": total_items - flag_counts.get("missing_provenance", 0),
            "export_ready": export_ready,
            "needs_review": flag_counts.get("needs_review", 0),
            "empirical_calibration_needed": flag_counts.get("low_response_count", 0),
        },
        coverage_by_skill=dict(coverage_by_skill),
        coverage_by_cefr=dict(coverage_by_cefr),
        recent_validations=recent_validations,
    )
