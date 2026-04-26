"""Attempt lifecycle: start, get next item, submit, finish."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from languagepro_common.errors import ConflictError, NotFoundError, ValidationError
from languagepro_common.logging import get_logger
from languagepro_irt import update_theta_eap
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.adapters.data_engine.client import DataEngineClient
from exam_platform.models import AttemptResponse, Exam, ExamAttempt
from exam_platform.schemas import (
    ItemView,
    NextItemResponse,
    StartAttemptResponse,
    SubmitResponseOut,
)

ATTEMPT_TTL_HOURS = 4
log = get_logger(__name__)


async def start_attempt(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    user_id: UUID,
    blueprint_code: str,
    locale: str = "uz",
) -> StartAttemptResponse:
    exam = (
        await db.execute(
            select(Exam).where(
                Exam.blueprint_code == blueprint_code,
                Exam.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if exam is None:
        raise NotFoundError(f"Exam blueprint {blueprint_code} not found")

    blueprint = await de.get_blueprint(blueprint_code)

    attempt_id = uuid4()
    sections = blueprint.get("sections", [])
    skill0 = sections[0]["skill"] if sections else "reading"

    await db.execute(
        insert(ExamAttempt).values(
            id=attempt_id,
            user_id=user_id,
            exam_id=exam.id,
            blueprint_snapshot=blueprint,
            state="in_progress",
            theta_estimates={s["skill"]: 0.0 for s in sections},
            theta_se={s["skill"]: 1.0 for s in sections},
            locale=locale,
            expires_at=datetime.now(UTC) + timedelta(hours=ATTEMPT_TTL_HOURS),
        )
    )
    await db.commit()

    next_item = await _next_item(db, de, attempt_id=attempt_id, skill=skill0, theta=0.0)
    await _persist_current_item(db, attempt_id=attempt_id, item=next_item)
    await db.commit()
    return StartAttemptResponse(
        attempt_id=attempt_id,
        blueprint_snapshot=blueprint,
        current_section_index=0,
        current_item=next_item,
    )


def item_from_snapshot(snapshot: dict[str, Any] | None) -> ItemView | None:
    if not snapshot:
        return None
    return ItemView.model_validate(snapshot)


def _item_snapshot(item: ItemView | None) -> dict[str, Any] | None:
    if item is None:
        return None
    return item.model_dump(mode="json")


async def _persist_current_item(
    db: AsyncSession,
    *,
    attempt_id: UUID,
    item: ItemView | None,
    section_index: int = 0,
) -> None:
    await db.execute(
        update(ExamAttempt)
        .where(ExamAttempt.id == attempt_id)
        .values(
            current_section_index=section_index,
            current_item_snapshot=_item_snapshot(item),
            current_item_issued_at=datetime.now(UTC) if item is not None else None,
        )
    )


async def _seen_item_ids(
    db: AsyncSession, attempt_id: UUID, skill: str | None = None
) -> list[UUID]:
    q = select(AttemptResponse.item_id).where(AttemptResponse.attempt_id == attempt_id)
    if skill:
        q = q.where(AttemptResponse.skill == skill)
    return [row[0] for row in (await db.execute(q)).all()]


async def _next_item(
    db: AsyncSession, de: DataEngineClient, *, attempt_id: UUID, skill: str, theta: float
) -> ItemView | None:
    seen = await _seen_item_ids(db, attempt_id, skill)
    try:
        resp = await de.next_item(skill=skill, theta=theta, exclude_ids=seen, attempt_id=attempt_id)
    except Exception:
        return None
    item = resp.get("item")
    if not item:
        return None
    return ItemView(
        id=UUID(item["id"]),
        type=item["type"],
        skill=item["skill"],
        cefr_level=item["cefr_level"],
        payload=item["payload"],
        estimated_seconds=item["estimated_seconds"],
    )


def _active_section(attempt: ExamAttempt) -> dict[str, Any]:
    sections = attempt.blueprint_snapshot.get("sections", [])
    if not sections:
        raise ValidationError("Blueprint has no sections")
    index = int(attempt.current_section_index or 0)
    if index < 0 or index >= len(sections):
        index = 0
    return sections[index]


async def next_item_for_attempt(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    user_id: UUID,
    attempt_id: UUID,
) -> NextItemResponse:
    attempt = (
        await db.execute(
            select(ExamAttempt).where(ExamAttempt.id == attempt_id, ExamAttempt.user_id == user_id)
        )
    ).scalar_one_or_none()
    if attempt is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    if attempt.state != "in_progress":
        raise ConflictError(f"Attempt is {attempt.state}")

    current = item_from_snapshot(attempt.current_item_snapshot)
    if current is not None:
        return NextItemResponse(
            current_section_index=attempt.current_section_index,
            current_item=current,
        )

    section = _active_section(attempt)
    skill = section["skill"]
    theta = float(attempt.theta_estimates.get(skill, 0.0))
    next_item = await _next_item(db, de, attempt_id=attempt_id, skill=skill, theta=theta)
    await _persist_current_item(
        db,
        attempt_id=attempt_id,
        item=next_item,
        section_index=int(attempt.current_section_index or 0),
    )
    await db.commit()
    return NextItemResponse(
        current_section_index=int(attempt.current_section_index or 0),
        current_item=next_item,
    )


async def submit_response(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    user_id: UUID,
    attempt_id: UUID,
    item_id: UUID,
    item_type: str,
    mcq_choice_id: str | None,
    text_answer: str | None,
    audio_s3_key: str | None,
    time_ms: int,
) -> SubmitResponseOut:
    attempt = (
        await db.execute(
            select(ExamAttempt).where(
                ExamAttempt.id == attempt_id,
                ExamAttempt.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if attempt is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    if attempt.state != "in_progress":
        raise ConflictError(f"Attempt is {attempt.state}")

    section = _active_section(attempt)
    skill = section["skill"]
    current_item = item_from_snapshot(attempt.current_item_snapshot)
    if current_item is not None and current_item.id != item_id:
        raise ConflictError("Submitted item is not the current item")

    # Sync grading for objective items
    is_correct: bool | None = None
    raw_answer: dict[str, Any] = {}
    graded = False
    if item_type == "mcq_single":
        if not mcq_choice_id:
            raise ValidationError("mcq_choice_id required for mcq_single")
        key = await de.get_answer_key(item_id)
        is_correct = mcq_choice_id == key.get("correct_option_id")
        raw_answer = {"mcq_choice_id": mcq_choice_id}
        graded = True
    elif text_answer is not None:
        raw_answer = {"text_answer": text_answer}
    elif audio_s3_key is not None:
        raw_answer = {"audio_s3_key": audio_s3_key}
    else:
        raise ValidationError("No answer provided")

    response_id = uuid4()
    theta_now = float(attempt.theta_estimates.get(skill, 0.0))
    await db.execute(
        insert(AttemptResponse).values(
            id=response_id,
            attempt_id=attempt_id,
            section_index=0,  # MVP: single section
            item_id=item_id,
            item_snapshot=attempt.current_item_snapshot or {},
            type=item_type,
            raw_answer=raw_answer,
            is_correct=is_correct,
            partial_credit=(
                Decimal("1.0") if is_correct else (Decimal("0.0") if is_correct is False else None)
            ),
            theta_at_answer=Decimal(str(theta_now)),
            skill=skill,
            time_ms=time_ms,
        )
    )

    # Theta update for objective items
    next_item: ItemView | None = None
    if graded and is_correct is not None:
        # Default item params (MVP — fetch real ones from selection_metadata in Phase 2)
        a, b, c = 1.0, 0.0, 0.25 if item_type == "mcq_single" else 0.0
        new_theta, new_se = update_theta_eap(
            theta_now,
            float(attempt.theta_se.get(skill, 1.0)),
            a,
            b,
            c,
            was_correct=is_correct,
        )
        new_estimates = {**attempt.theta_estimates, skill: new_theta}
        new_se_dict = {**attempt.theta_se, skill: new_se}
        # Empirical response → data-engine (best-effort)
        try:
            await de.post_response(
                item_id,
                {
                    "attempt_id": str(attempt_id),
                    "user_theta_at_answer": theta_now,
                    "is_correct": is_correct,
                    "time_ms": time_ms,
                },
            )
        except Exception as exc:
            log.warning(
                "data_engine_response_capture_failed",
                attempt_id=str(attempt_id),
                item_id=str(item_id),
                error=str(exc),
            )

        next_item = await _next_item(db, de, attempt_id=attempt_id, skill=skill, theta=new_theta)

        attempt_values: dict[str, Any] = {
            "theta_estimates": new_estimates,
            "theta_se": new_se_dict,
            "current_item_snapshot": _item_snapshot(next_item),
            "current_item_issued_at": datetime.now(UTC) if next_item is not None else None,
        }
        if next_item is None:
            attempt_values.update(state="completed", finished_at=datetime.now(UTC))
        await db.execute(
            update(ExamAttempt).where(ExamAttempt.id == attempt_id).values(**attempt_values)
        )
    elif not graded:
        await _persist_current_item(db, attempt_id=attempt_id, item=None, section_index=0)

    await db.commit()

    section_complete = next_item is None and graded
    attempt_complete = section_complete  # MVP: only one section

    return SubmitResponseOut(
        response_id=response_id,
        graded_synchronously=graded,
        is_correct=is_correct,
        next_item=next_item,
        section_complete=section_complete,
        attempt_complete=attempt_complete,
    )
