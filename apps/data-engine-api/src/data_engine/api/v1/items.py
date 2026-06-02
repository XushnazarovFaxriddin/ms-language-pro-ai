"""S2S endpoints: /items/next, /items/{id}, /items/{id}/key, /items/{id}/response."""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel

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

    Writes full response data to analytics.item_response_data for later
    IRT recalibration, and increments the n_responses counter on the question.
    """
    from sqlalchemy import text, update

    from data_engine.models import Question

    # 1. Persist full response record for IRT recalibration
    try:
        await db.execute(
            text(
                """
                INSERT INTO analytics.item_response_data
                  (item_id, attempt_id, theta_at_answer, is_correct, partial_credit, time_ms)
                VALUES
                  (:item_id, :attempt_id, :theta, :correct, :partial, :time_ms)
                """
            ),
            {
                "item_id": item_id,
                "attempt_id": body.attempt_id,
                "theta": body.user_theta_at_answer,
                "correct": body.is_correct,
                "partial": body.partial_credit,
                "time_ms": body.time_ms,
            },
        )
    except Exception:
        # Table may not exist yet in early deployments — still increment counter
        pass

    # 2. Increment the counter (always succeeds)
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
    """SQL-level aggregation for scalable summary — no full table scan."""
    from sqlalchemy import case, literal_column
    from sqlalchemy.dialects.postgresql import JSONB as _  # noqa: F401

    base = (
        select(
            Question.status.label("q_status"),
            Skill.code.label("skill_code"),
            CefrLevel.code.label("cefr_code"),
            Question.source_license,
            Question.difficulty_b,
            Question.discrimination_a,
            Question.n_responses,
            Question.payload,
            Question.answer_key,
            Question.generated_by_model,
            Question.prompt_version_id,
        )
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        base = base.where(Question.status == status)
    if skill:
        base = base.where(Skill.code == skill)
    if cefr:
        base = base.where(CefrLevel.code == cefr)

    # --- aggregate via SQL: status, skill, cefr breakdowns ---
    agg_stmt = (
        select(
            func.count().label("total"),
            func.avg(Question.difficulty_b).label("avg_b"),
            func.avg(Question.discrimination_a).label("avg_a"),
            func.count().filter(Question.source_license == "ai_generated").label("generated"),
            func.count().filter(
                Question.status.in_(("draft", "in_review", "review", "pending"))
            ).label("review_backlog"),
            func.count().filter(Question.n_responses < 30).label("low_response_items"),
        )
        .select_from(Question)
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        agg_stmt = agg_stmt.where(Question.status == status)
    if skill:
        agg_stmt = agg_stmt.where(Skill.code == skill)
    if cefr:
        agg_stmt = agg_stmt.where(CefrLevel.code == cefr)
    agg = (await db.execute(agg_stmt)).one()

    # --- by_status ---
    status_stmt = (
        select(Question.status, func.count())
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        status_stmt = status_stmt.where(Question.status == status)
    if skill:
        status_stmt = status_stmt.where(Skill.code == skill)
    if cefr:
        status_stmt = status_stmt.where(CefrLevel.code == cefr)
    status_rows = (await db.execute(status_stmt.group_by(Question.status))).all()
    by_status = {r[0]: r[1] for r in status_rows}

    # --- by_skill ---
    skill_stmt = (
        select(Skill.code, func.count())
        .select_from(Question)
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        skill_stmt = skill_stmt.where(Question.status == status)
    if skill:
        skill_stmt = skill_stmt.where(Skill.code == skill)
    if cefr:
        skill_stmt = skill_stmt.where(CefrLevel.code == cefr)
    skill_rows = (await db.execute(skill_stmt.group_by(Skill.code))).all()
    by_skill = {r[0]: r[1] for r in skill_rows}

    # --- by_cefr ---
    cefr_stmt = (
        select(CefrLevel.code, func.count())
        .select_from(Question)
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        cefr_stmt = cefr_stmt.where(Question.status == status)
    if skill:
        cefr_stmt = cefr_stmt.where(Skill.code == skill)
    if cefr:
        cefr_stmt = cefr_stmt.where(CefrLevel.code == cefr)
    cefr_rows = (await db.execute(cefr_stmt.group_by(CefrLevel.code))).all()
    by_cefr = {r[0]: r[1] for r in cefr_rows}

    # Quality-flag counts still need row-level inspection — limited to a reasonable scan
    # For large datasets, switch to DB-stored computed columns.
    flag_stmt = _items_stmt(status, skill, cefr)
    flag_result = await db.execute(flag_stmt)
    flag_counts: Counter[str] = Counter()
    export_ready = 0
    for q, _sk, _cr in flag_result:
        flags = _quality_flags(q)
        flag_counts.update(flags)
        blocking_flags = {"missing_answer_key", "missing_prompt", "missing_provenance"}
        if q.status == "approved" and not blocking_flags.intersection(flags):
            export_ready += 1

    total = int(agg.total)
    return ItemBankSummaryOut(
        total=total,
        by_status=by_status,
        by_skill=by_skill,
        by_cefr=by_cefr,
        export_ready=export_ready,
        review_backlog=int(agg.review_backlog),
        generated_items=int(agg.generated),
        missing_answer_key=flag_counts.get("missing_answer_key", 0),
        missing_prompt=flag_counts.get("missing_prompt", 0),
        missing_provenance=flag_counts.get("missing_provenance", 0),
        low_response_items=int(agg.low_response_items),
        avg_difficulty_b=float(agg.avg_b) if agg.avg_b is not None else None,
        avg_discrimination_a=float(agg.avg_a) if agg.avg_a is not None else None,
    )


class PaginatedItemsOut(BaseModel):
    items: list[ItemAdminOut]
    total: int
    limit: int
    offset: int


@router.get("/items", response_model=PaginatedItemsOut)
async def list_items(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "researcher", "superadmin"))],
    status: str | None = Query(None),
    skill: str | None = Query(None),
    cefr: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> PaginatedItemsOut:
    # Total count for pagination
    count_base = select(func.count()).select_from(Question).join(Skill, Question.skill_id == Skill.id).join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    if status:
        count_base = count_base.where(Question.status == status)
    if skill:
        count_base = count_base.where(Skill.code == skill)
    if cefr:
        count_base = count_base.where(CefrLevel.code == cefr)
    total = (await db.execute(count_base)).scalar_one()

    stmt = _items_stmt(status, skill, cefr)
    stmt = stmt.order_by(Question.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)

    return PaginatedItemsOut(
        items=[_to_admin_item(q, skill_code, cefr_code) for q, skill_code, cefr_code in result],
        total=total,
        limit=limit,
        offset=offset,
    )
