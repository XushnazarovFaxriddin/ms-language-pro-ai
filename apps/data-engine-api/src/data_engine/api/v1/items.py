"""S2S endpoints: /items/next, /items/{id}, /items/{id}/key, /items/{id}/response."""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles, require_s2s
from data_engine.db import get_session
from data_engine.models import CefrLevel, Question, Skill, ValidationResult
from data_engine.schemas.api import (
    AnswerKeyOut,
    AutoJuryItemDecision,
    AutoJuryReviewOut,
    ItemAdminOut,
    ItemBankSummaryOut,
    ItemOut,
    ItemPayload,
    NextItemOut,
    ResponseEventIn,
)
from data_engine.services.items import get_answer_key, select_next_item

router = APIRouter(tags=["items"])


@router.get("/items/next", response_model=NextItemOut)
async def next_item(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("items:next"))],
    skill: Annotated[str, Query()],
    theta: Annotated[float, Query()] = 0.0,
    exclude_ids: Annotated[list[UUID] | None, Query(alias="exclude_ids[]")] = None,
    attempt_id: UUID | None = None,
) -> NextItemOut:
    item = await select_next_item(db, theta=theta, skill=skill, exclude_ids=exclude_ids or [])
    if item is None:
        raise NotFoundError(f"No approved items available for skill={skill}")
    return NextItemOut(
        item=ItemOut(
            id=item.id,
            type=item.type,
            skill=item.skill_code,
            cefr_level=item.cefr_code,
            payload=ItemPayload.model_validate(item.payload),
            estimated_seconds=item.estimated_seconds,
        ),
        selection_metadata={"a": item.a, "b": item.b, "c": item.c, "theta": theta},
    )


@router.get("/items/{item_id}/key", response_model=AnswerKeyOut)
async def item_key(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("items:key"))],
) -> AnswerKeyOut:
    key = await get_answer_key(db, item_id)
    if key is None:
        raise NotFoundError(f"Item {item_id} not found")
    return AnswerKeyOut(
        correct_option_id=key.get("correct_option_id"),
        rationale=str(key.get("distractor_rationale", "")),
        raw=key,
    )


@router.post("/items/{item_id}/response", status_code=204)
async def record_response(
    item_id: UUID,
    body: ResponseEventIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("responses:write"))],
) -> None:
    """Empirical response captured for IRT recalibration.

    Phase 1: write to analytics.item_response_data (added in next migration).
    Stub for now — increments n_responses.
    """
    from sqlalchemy import update

    from data_engine.models import Question

    await db.execute(
        update(Question)
        .where(Question.id == item_id)
        .values(n_responses=Question.n_responses + 1)
    )
    await db.commit()


# -------- Admin endpoints --------

def _as_float(value: Any, fallback: float = 0.0) -> float:
    if value is None:
        return fallback
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _as_optional_float(value: Any) -> float | None:
    if value is None:
        return None
    return _as_float(value)


def _expects_answer_key(question_type: str) -> bool:
    objective_markers = (
        "mcq",
        "choice",
        "matching",
        "gap",
        "fill",
        "true_false",
        "short_answer",
        "listening",
        "reading",
    )
    normalized = question_type.lower()
    return any(marker in normalized for marker in objective_markers)


def _quality_flags(q: Question) -> list[str]:
    payload = q.payload or {}
    answer_key = q.answer_key or {}
    flags: list[str] = []

    if not (payload.get("prompt") or payload.get("passage") or payload.get("audio_url")):
        flags.append("missing_prompt")
    if _expects_answer_key(q.type) and not (
        answer_key.get("correct_option_id")
        or answer_key.get("correct_answer")
        or answer_key.get("answers")
        or answer_key.get("raw")
    ):
        flags.append("missing_answer_key")
    if q.source_license == "ai_generated" and not (q.generated_by_model and q.prompt_version_id):
        flags.append("missing_provenance")
    if q.status in {"draft", "in_review", "review", "pending"}:
        flags.append("needs_review")
    if q.n_responses < 30:
        flags.append("low_response_count")

    return flags


def _avg_criteria_score(validations: Sequence[ValidationResult]) -> float | None:
    scores: list[float] = []
    for validation in validations:
        for value in (validation.criteria_scores or {}).values():
            if isinstance(value, bool):
                continue
            if isinstance(value, int | float):
                scores.append(float(value))
                continue
            try:
                scores.append(float(value))
            except (TypeError, ValueError):
                continue
    if not scores:
        return None
    return round(sum(scores) / len(scores), 2)


def _auto_jury_decision(
    q: Question,
    validations: Sequence[ValidationResult],
) -> AutoJuryItemDecision:
    if not validations:
        return AutoJuryItemDecision(
            question_id=q.id,
            decision="skipped",
            reason="no_jury_results",
            approve_votes=0,
            reject_votes=0,
            borderline_votes=0,
        )

    approve_votes = sum(v.verdict == "approve" for v in validations)
    reject_votes = sum(v.verdict == "reject" for v in validations)
    borderline_votes = sum(v.verdict == "borderline" for v in validations)
    avg_score = _avg_criteria_score(validations)
    flags = set(_quality_flags(q))
    blocking_flags = {"missing_prompt", "missing_answer_key"}

    if flags.intersection(blocking_flags):
        return AutoJuryItemDecision(
            question_id=q.id,
            decision="rejected",
            reason="blocking_quality_flags",
            approve_votes=approve_votes,
            reject_votes=reject_votes,
            borderline_votes=borderline_votes,
            avg_criteria_score=avg_score,
        )
    if approve_votes >= 2 and (avg_score is None or avg_score >= 4.0):
        return AutoJuryItemDecision(
            question_id=q.id,
            decision="approved",
            reason="jury_majority_approve",
            approve_votes=approve_votes,
            reject_votes=reject_votes,
            borderline_votes=borderline_votes,
            avg_criteria_score=avg_score,
        )
    return AutoJuryItemDecision(
        question_id=q.id,
        decision="rejected",
        reason="jury_quality_gate_failed",
        approve_votes=approve_votes,
        reject_votes=reject_votes,
        borderline_votes=borderline_votes,
        avg_criteria_score=avg_score,
    )


def _to_admin_item(q: Question, skill_code: str, cefr_code: str) -> ItemAdminOut:
    return ItemAdminOut(
        id=q.id,
        type=q.type,
        skill=skill_code,
        cefr_level=cefr_code,
        payload=ItemPayload.model_validate(q.payload or {}),
        estimated_seconds=q.estimated_seconds,
        status=q.status,
        bank_id=q.bank_id,
        ielts_band_target=_as_optional_float(q.ielts_band_target),
        difficulty_b=_as_float(q.difficulty_b),
        discrimination_a=_as_float(q.discrimination_a),
        guessing_c=_as_float(q.guessing_c),
        n_responses=q.n_responses,
        source_license=q.source_license,
        generated_by_model=q.generated_by_model,
        prompt_version_id=q.prompt_version_id,
        generation_run_id=q.generation_run_id,
        quality_flags=_quality_flags(q),
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


@router.post("/items/review/auto-jury", response_model=AutoJuryReviewOut)
async def auto_jury_review(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> AutoJuryReviewOut:
    questions = (
        await db.execute(
            select(Question)
            .where(Question.status.in_(("in_review", "review", "pending")))
            .order_by(Question.created_at.asc())
        )
    ).scalars().all()
    question_ids = [q.id for q in questions]
    if not question_ids:
        return AutoJuryReviewOut(reviewed=0, approved=0, rejected=0, skipped=0, decisions=[])

    validation_rows = (
        await db.execute(
            select(ValidationResult)
            .where(ValidationResult.question_id.in_(question_ids))
            .order_by(ValidationResult.created_at.asc())
        )
    ).scalars().all()
    validations_by_question: dict[UUID, list[ValidationResult]] = {}
    for row in validation_rows:
        validations_by_question.setdefault(row.question_id, []).append(row)

    decisions = [
        _auto_jury_decision(q, validations_by_question.get(q.id, []))
        for q in questions
    ]
    for decision in decisions:
        if decision.decision == "skipped":
            continue
        await db.execute(
            update(Question)
            .where(Question.id == decision.question_id)
            .values(status=decision.decision, updated_at=func.now())
        )
    await db.commit()

    approved = sum(d.decision == "approved" for d in decisions)
    rejected = sum(d.decision == "rejected" for d in decisions)
    skipped = sum(d.decision == "skipped" for d in decisions)
    return AutoJuryReviewOut(
        reviewed=approved + rejected,
        approved=approved,
        rejected=rejected,
        skipped=skipped,
        decisions=decisions,
    )


def _items_stmt(status: str | None, skill: str | None, cefr: str | None):
    stmt = (
        select(Question, Skill.code.label("skill_code"), CefrLevel.code.label("cefr_code"))
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        stmt = stmt.where(Question.status == status)
    if skill:
        stmt = stmt.where(Skill.code == skill)
    if cefr:
        stmt = stmt.where(CefrLevel.code == cefr)
    return stmt


async def _set_item_status(
    db: AsyncSession,
    item_id: UUID,
    status: str,
) -> ItemAdminOut:
    await db.execute(
        update(Question).where(Question.id == item_id).values(status=status, updated_at=func.now())
    )
    result = await db.execute(_items_stmt(None, None, None).where(Question.id == item_id))
    row = result.one_or_none()
    if row is None:
        raise NotFoundError(f"Item {item_id} not found")
    await db.commit()
    question, skill_code, cefr_code = row
    return _to_admin_item(question, skill_code, cefr_code)


@router.post("/items/{item_id}/approve", response_model=ItemAdminOut)
async def approve_item(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> ItemAdminOut:
    return await _set_item_status(db, item_id, "approved")


@router.post("/items/{item_id}/reject", response_model=ItemAdminOut)
async def reject_item(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> ItemAdminOut:
    return await _set_item_status(db, item_id, "rejected")


@router.get("/items/summary", response_model=ItemBankSummaryOut)
async def item_bank_summary(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    status: str | None = Query(None),
    skill: str | None = Query(None),
    cefr: str | None = Query(None),
) -> ItemBankSummaryOut:
    result = await db.execute(_items_stmt(status, skill, cefr))
    rows = result.all()

    by_status: Counter[str] = Counter()
    by_skill: Counter[str] = Counter()
    by_cefr: Counter[str] = Counter()
    flag_counts: Counter[str] = Counter()
    difficulty_sum = 0.0
    discrimination_sum = 0.0
    export_ready = 0
    generated_items = 0

    for q, skill_code, cefr_code in rows:
        flags = _quality_flags(q)
        by_status[q.status] += 1
        by_skill[skill_code] += 1
        by_cefr[cefr_code] += 1
        flag_counts.update(flags)
        difficulty_sum += _as_float(q.difficulty_b)
        discrimination_sum += _as_float(q.discrimination_a)
        if q.source_license == "ai_generated":
            generated_items += 1
        blocking_flags = {"missing_answer_key", "missing_prompt", "missing_provenance"}
        if q.status == "approved" and not blocking_flags.intersection(flags):
            export_ready += 1

    total = len(rows)
    review_states = ("draft", "in_review", "review", "pending")
    return ItemBankSummaryOut(
        total=total,
        by_status=dict(by_status),
        by_skill=dict(by_skill),
        by_cefr=dict(by_cefr),
        export_ready=export_ready,
        review_backlog=sum(by_status.get(s, 0) for s in review_states),
        generated_items=generated_items,
        missing_answer_key=flag_counts.get("missing_answer_key", 0),
        missing_prompt=flag_counts.get("missing_prompt", 0),
        missing_provenance=flag_counts.get("missing_provenance", 0),
        low_response_items=flag_counts.get("low_response_count", 0),
        avg_difficulty_b=(difficulty_sum / total) if total else None,
        avg_discrimination_a=(discrimination_sum / total) if total else None,
    )


@router.get("/items", response_model=list[ItemAdminOut])
async def list_items(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    status: str | None = Query(None),
    skill: str | None = Query(None),
    cefr: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[ItemAdminOut]:
    stmt = _items_stmt(status, skill, cefr)
    stmt = stmt.order_by(Question.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)

    return [_to_admin_item(q, skill_code, cefr_code) for q, skill_code, cefr_code in result]
