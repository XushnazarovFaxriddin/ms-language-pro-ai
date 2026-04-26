"""Attempt lifecycle: start, get next item, submit, finish."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from languagepro_irt import update_theta_eap
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.adapters.data_engine.client import DataEngineClient
from exam_platform.models import AttemptResponse, Exam, ExamAttempt
from exam_platform.schemas import ItemView, StartAttemptResponse, SubmitResponseOut
from languagepro_common.errors import ConflictError, NotFoundError, ValidationError

ATTEMPT_TTL_HOURS = 4


async def start_attempt(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    user_id: UUID,
    blueprint_code: str,
    locale: str = "uz",
) -> StartAttemptResponse:
    exam = (
        await db.execute(select(Exam).where(Exam.blueprint_code == blueprint_code, Exam.is_active.is_(True)))
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
    return StartAttemptResponse(
        attempt_id=attempt_id,
        blueprint_snapshot=blueprint,
        current_section_index=0,
        current_item=next_item,
    )


async def _seen_item_ids(db: AsyncSession, attempt_id: UUID, skill: str | None = None) -> list[UUID]:
    q = select(AttemptResponse.item_id).where(AttemptResponse.attempt_id == attempt_id)
    if skill:
        q = q.where(AttemptResponse.skill == skill)
    return [row[0] for row in (await db.execute(q)).all()]


async def _next_item(
    db: AsyncSession, de: DataEngineClient, *, attempt_id: UUID, skill: str, theta: float
) -> ItemView | None:
    seen = await _seen_item_ids(db, attempt_id, skill)
    try:
        resp = await de.next_item(
            skill=skill, theta=theta, exclude_ids=seen, attempt_id=attempt_id
        )
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
        await db.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id, ExamAttempt.user_id == user_id))
    ).scalar_one_or_none()
    if attempt is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    if attempt.state != "in_progress":
        raise ConflictError(f"Attempt is {attempt.state}")

    # Determine skill from current section snapshot
    sections = attempt.blueprint_snapshot.get("sections", [])
    section = next(
        (s for s in sections if (s.get("skill") in attempt.theta_estimates)), sections[0] if sections else None
    )
    if section is None:
        raise ValidationError("Blueprint has no sections")
    skill = section["skill"]

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
            item_snapshot={},  # MVP; populate from data-engine for replay
            type=item_type,
            raw_answer=raw_answer,
            is_correct=is_correct,
            partial_credit=Decimal("1.0") if is_correct else (Decimal("0.0") if is_correct is False else None),
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
            a, b, c,
            was_correct=is_correct,
        )
        new_estimates = {**attempt.theta_estimates, skill: new_theta}
        new_se_dict = {**attempt.theta_se, skill: new_se}
        await db.execute(
            update(ExamAttempt)
            .where(ExamAttempt.id == attempt_id)
            .values(theta_estimates=new_estimates, theta_se=new_se_dict)
        )
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
        except Exception:
            pass

        next_item = await _next_item(db, de, attempt_id=attempt_id, skill=skill, theta=new_theta)

    await db.commit()

    section_complete = next_item is None and graded
    attempt_complete = section_complete  # MVP: only one section

    if attempt_complete:
        await db.execute(
            update(ExamAttempt)
            .where(ExamAttempt.id == attempt_id)
            .values(state="completed", finished_at=datetime.now(UTC))
        )
        await db.commit()

    return SubmitResponseOut(
        response_id=response_id,
        graded_synchronously=graded,
        is_correct=is_correct,
        next_item=next_item,
        section_complete=section_complete,
        attempt_complete=attempt_complete,
    )
