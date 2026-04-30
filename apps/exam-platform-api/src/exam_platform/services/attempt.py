"""Attempt lifecycle: start, get next item, submit, finish.

Multi-section progression
-------------------------
A blueprint has N sections (e.g. IELTS Full = 4: listening → reading → writing → speaking).
We progress section by section:

  - Each section has a `skill` and an `item_count` budget (or `stop_rule.max_items`).
  - On submission of the **last item** of the current section, we advance:
      section_index += 1, fetch the first item of the new section.
  - When `section_index == len(sections)` after submit → attempt completed.

Item counts are derived from already-stored `attempt_responses` (per attempt + section_index).
This keeps the source of truth in the DB and is reload-safe.

For non-objective items (writing essay, speaking audio) the response is still counted
toward the section budget; full async grading happens off-thread (see jobs/__init__.py).
"""

from __future__ import annotations

import base64
import binascii
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from languagepro_common.errors import ConflictError, NotFoundError, ValidationError
from languagepro_common.logging import get_logger
from languagepro_irt import update_theta_eap
from sqlalchemy import func, insert, select, update
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
AUDIO_INLINE_MAX_BYTES = 15 * 1024 * 1024
DEMO_AUDIO_URLS = {
    "https://demo.aiexam.uz/audio/listening/library_dialog.mp3": (
        "/audio/listening/library_dialog.m4a"
    ),
    "https://demo.aiexam.uz/audio/listening/lecture_climate.mp3": (
        "/audio/listening/lecture_climate.m4a"
    ),
}
log = get_logger(__name__)


# ───────────────────────── helpers ─────────────────────────


def _section_budget(section: dict[str, Any]) -> int:
    """How many items the student must answer in this section before it auto-finishes."""
    sr = section.get("stop_rule") or {}
    if isinstance(sr, dict):
        if "max_items" in sr:
            return int(sr["max_items"])
    if "item_count" in section:
        return int(section["item_count"])
    return 5  # safe default


def _sections(attempt: ExamAttempt) -> list[dict[str, Any]]:
    sections = attempt.blueprint_snapshot.get("sections", [])
    if not sections:
        raise ValidationError("Blueprint has no sections")
    return sections


def _section_at(attempt: ExamAttempt, index: int) -> dict[str, Any]:
    sections = _sections(attempt)
    if index < 0 or index >= len(sections):
        raise ValidationError(f"Invalid section index {index}")
    return sections[index]


def _active_section(attempt: ExamAttempt) -> dict[str, Any]:
    return _section_at(attempt, int(attempt.current_section_index or 0))


def item_from_snapshot(snapshot: dict[str, Any] | None) -> ItemView | None:
    if not snapshot:
        return None
    return _normalise_item_audio(ItemView.model_validate(snapshot))


def _item_snapshot(item: ItemView | None) -> dict[str, Any] | None:
    if item is None:
        return None
    return item.model_dump(mode="json")


def _normalise_item_audio(item: ItemView) -> ItemView:
    """Map known-dead demo audio URLs to local static audio assets."""
    payload = dict(item.payload or {})
    audio_url = payload.get("audio_url")
    if isinstance(audio_url, str) and audio_url in DEMO_AUDIO_URLS:
        payload["audio_url"] = DEMO_AUDIO_URLS[audio_url]
    return item.model_copy(update={"payload": payload})


def _decode_audio_base64(audio_base64: str) -> tuple[str, bytes]:
    """Validate browser-recorded audio submitted inline for the MVP exam runner."""
    payload = audio_base64
    if "," in payload and payload.lstrip().lower().startswith("data:"):
        payload = payload.split(",", 1)[1]
    try:
        audio_bytes = base64.b64decode(payload, validate=True)
    except binascii.Error as exc:
        raise ValidationError("audio_base64 is not valid base64") from exc
    if not audio_bytes:
        raise ValidationError("audio_base64 must not be empty")
    if len(audio_bytes) > AUDIO_INLINE_MAX_BYTES:
        raise ValidationError("audio_base64 exceeds the 15MB inline upload limit")
    return payload, audio_bytes


async def _count_responses_in_section(
    db: AsyncSession, attempt_id: UUID, section_index: int
) -> int:
    return int(
        (
            await db.execute(
                select(func.count(AttemptResponse.id)).where(
                    AttemptResponse.attempt_id == attempt_id,
                    AttemptResponse.section_index == section_index,
                )
            )
        ).scalar_one()
    )


async def _seen_item_ids_in_section(
    db: AsyncSession, attempt_id: UUID, section_index: int
) -> list[UUID]:
    rows = (
        await db.execute(
            select(AttemptResponse.item_id).where(
                AttemptResponse.attempt_id == attempt_id,
                AttemptResponse.section_index == section_index,
            )
        )
    ).all()
    return [r[0] for r in rows]


async def _persist_current_item(
    db: AsyncSession,
    *,
    attempt_id: UUID,
    item: ItemView | None,
    section_index: int,
    state: str | None = None,
    finished_at: datetime | None = None,
) -> None:
    values: dict[str, Any] = {
        "current_section_index": section_index,
        "current_item_snapshot": _item_snapshot(item),
        "current_item_issued_at": datetime.now(UTC) if item is not None else None,
    }
    if state is not None:
        values["state"] = state
    if finished_at is not None:
        values["finished_at"] = finished_at
    await db.execute(update(ExamAttempt).where(ExamAttempt.id == attempt_id).values(**values))


async def _next_item_from_de(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    attempt_id: UUID,
    section_index: int,
    skill: str,
    theta: float,
) -> ItemView | None:
    seen = await _seen_item_ids_in_section(db, attempt_id, section_index)
    try:
        resp = await de.next_item(
            skill=skill, theta=theta, exclude_ids=seen, attempt_id=attempt_id
        )
    except Exception as exc:
        log.warning(
            "data_engine_next_item_failed",
            attempt_id=str(attempt_id),
            skill=skill,
            section_index=section_index,
            error=str(exc),
        )
        return None
    item = resp.get("item")
    if not item:
        return None
    return _normalise_item_audio(ItemView(
        id=UUID(item["id"]),
        type=item["type"],
        skill=item["skill"],
        cefr_level=item["cefr_level"],
        payload=item["payload"],
        estimated_seconds=item["estimated_seconds"],
    ))


async def _advance_to_next_skill_with_items(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    attempt_id: UUID,
    sections: list[dict[str, Any]],
    theta_estimates: dict[str, float],
    start_index: int,
) -> tuple[int, ItemView | None]:
    """Walk sections starting at start_index until we find a skill with at least one item.

    Returns (new_section_index, first_item). If no remaining section has items,
    returns (len(sections), None) — the caller treats this as attempt complete.
    """
    idx = start_index
    while idx < len(sections):
        s = sections[idx]
        skill = s["skill"]
        theta = float(theta_estimates.get(skill, 0.0))
        item = await _next_item_from_de(
            db, de, attempt_id=attempt_id, section_index=idx, skill=skill, theta=theta
        )
        if item is not None:
            return idx, item
        # No items for this skill — skip it (e.g. writing/speaking not seeded yet).
        log.info(
            "section_skipped_no_items",
            attempt_id=str(attempt_id),
            section_index=idx,
            skill=skill,
        )
        idx += 1
    return len(sections), None


# ───────────────────────── public API ─────────────────────────


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
    sections = blueprint.get("sections", [])
    if not sections:
        raise ValidationError("Blueprint has no sections")

    attempt_id = uuid4()
    theta_estimates = {s["skill"]: 0.0 for s in sections}
    theta_se = {s["skill"]: 1.0 for s in sections}

    await db.execute(
        insert(ExamAttempt).values(
            id=attempt_id,
            user_id=user_id,
            exam_id=exam.id,
            blueprint_snapshot=blueprint,
            state="in_progress",
            current_section_index=0,
            theta_estimates=theta_estimates,
            theta_se=theta_se,
            locale=locale,
            expires_at=datetime.now(UTC) + timedelta(hours=ATTEMPT_TTL_HOURS),
        )
    )
    await db.commit()

    new_index, first_item = await _advance_to_next_skill_with_items(
        db,
        de,
        attempt_id=attempt_id,
        sections=sections,
        theta_estimates=theta_estimates,
        start_index=0,
    )

    if first_item is None:
        # No items in any skill — mark complete immediately so UI doesn't loop.
        await _persist_current_item(
            db,
            attempt_id=attempt_id,
            item=None,
            section_index=len(sections),
            state="completed",
            finished_at=datetime.now(UTC),
        )
        await db.commit()
        return StartAttemptResponse(
            attempt_id=attempt_id,
            blueprint_snapshot=blueprint,
            current_section_index=len(sections),
            current_item=None,
        )

    await _persist_current_item(
        db, attempt_id=attempt_id, item=first_item, section_index=new_index
    )
    await db.commit()
    return StartAttemptResponse(
        attempt_id=attempt_id,
        blueprint_snapshot=blueprint,
        current_section_index=new_index,
        current_item=first_item,
    )


async def next_item_for_attempt(
    db: AsyncSession,
    de: DataEngineClient,
    *,
    user_id: UUID,
    attempt_id: UUID,
) -> NextItemResponse:
    attempt = (
        await db.execute(
            select(ExamAttempt).where(
                ExamAttempt.id == attempt_id, ExamAttempt.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if attempt is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    if attempt.state != "in_progress":
        raise ConflictError(f"Attempt is {attempt.state}")

    current = item_from_snapshot(attempt.current_item_snapshot)
    if current is not None:
        return NextItemResponse(
            current_section_index=int(attempt.current_section_index or 0),
            current_item=current,
        )

    # No cached current item — try to fetch the next one for the current section.
    sections = _sections(attempt)
    section_idx = int(attempt.current_section_index or 0)
    if section_idx >= len(sections):
        return NextItemResponse(
            current_section_index=section_idx, current_item=None
        )

    section = sections[section_idx]
    skill = section["skill"]
    theta = float(attempt.theta_estimates.get(skill, 0.0))
    next_item = await _next_item_from_de(
        db, de, attempt_id=attempt_id, section_index=section_idx, skill=skill, theta=theta
    )
    await _persist_current_item(
        db, attempt_id=attempt_id, item=next_item, section_index=section_idx
    )
    await db.commit()
    return NextItemResponse(current_section_index=section_idx, current_item=next_item)


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
    audio_base64: str | None,
    audio_format: str,
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

    sections = _sections(attempt)
    section_idx = int(attempt.current_section_index or 0)
    section = _section_at(attempt, section_idx)
    skill = section["skill"]
    budget = _section_budget(section)

    current_item = item_from_snapshot(attempt.current_item_snapshot)
    if current_item is not None and current_item.id != item_id:
        raise ConflictError("Submitted item is not the current item")

    # ── Grade objective items synchronously; defer writing/speaking to async ──
    is_correct: bool | None = None
    raw_answer: dict[str, Any] = {}
    # All these item types reduce to a single-choice grading via answer_key.correct_option_id
    objective = item_type in {
        "mcq_single",
        "mcq_multi",
        "true_false_ng",
        "yes_no_ng",
        "matching_information",
        "matching_features",
        "matching_headings",
        "matching_sentence_endings",
        "sentence_completion",
        "summary_completion",
        "note_completion",
        "table_completion",
        "short_answer",
    }

    if objective:
        if not mcq_choice_id:
            raise ValidationError(f"mcq_choice_id required for {item_type}")
        key = await de.get_answer_key(item_id)
        # Tolerant matching for completion-style items: case + whitespace
        expected = str(key.get("correct_option_id", "")).strip().lower()
        given = str(mcq_choice_id).strip().lower()
        is_correct = bool(expected) and given == expected
        raw_answer = {"mcq_choice_id": mcq_choice_id}
    elif text_answer is not None:
        raw_answer = {"text_answer": text_answer}
    elif audio_base64 is not None:
        normalized_audio, audio_bytes = _decode_audio_base64(audio_base64)
        raw_answer = {
            "audio_base64": normalized_audio,
            "audio_format": audio_format,
            "audio_bytes": len(audio_bytes),
        }
        if audio_s3_key:
            raw_answer["audio_s3_key"] = audio_s3_key
    elif audio_s3_key is not None:
        raw_answer = {"audio_s3_key": audio_s3_key, "audio_format": audio_format}
    else:
        raise ValidationError("No answer provided")

    response_id = uuid4()
    theta_now = float(attempt.theta_estimates.get(skill, 0.0))
    new_theta = theta_now
    new_se = float(attempt.theta_se.get(skill, 1.0))

    await db.execute(
        insert(AttemptResponse).values(
            id=response_id,
            attempt_id=attempt_id,
            section_index=section_idx,
            item_id=item_id,
            item_snapshot=attempt.current_item_snapshot or {},
            type=item_type,
            raw_answer=raw_answer,
            is_correct=is_correct,
            partial_credit=(
                Decimal("1.0")
                if is_correct
                else (Decimal("0.0") if is_correct is False else None)
            ),
            theta_at_answer=Decimal(str(theta_now)),
            skill=skill,
            time_ms=time_ms,
        )
    )

    # IRT theta update for objective items
    if objective and is_correct is not None:
        a, b, c = 1.0, 0.0, 0.25 if item_type == "mcq_single" else 0.0
        new_theta, new_se = update_theta_eap(
            theta_now,
            float(attempt.theta_se.get(skill, 1.0)),
            a,
            b,
            c,
            was_correct=is_correct,
        )
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

    new_estimates = {**attempt.theta_estimates, skill: new_theta}
    new_se_dict = {**attempt.theta_se, skill: new_se}

    # ── Section progression ──
    answered_in_section = await _count_responses_in_section(db, attempt_id, section_idx)
    section_complete = answered_in_section >= budget

    next_item: ItemView | None = None
    next_section_index = section_idx
    attempt_complete = False
    new_state: str | None = None
    finished_at: datetime | None = None

    if section_complete:
        # Try the next section
        new_idx, candidate = await _advance_to_next_skill_with_items(
            db,
            de,
            attempt_id=attempt_id,
            sections=sections,
            theta_estimates=new_estimates,
            start_index=section_idx + 1,
        )
        if candidate is None:
            attempt_complete = True
            new_state = "completed"
            finished_at = datetime.now(UTC)
            next_section_index = len(sections)
            next_item = None
        else:
            next_section_index = new_idx
            next_item = candidate
    else:
        # Same section, fetch next item for current skill
        next_item = await _next_item_from_de(
            db,
            de,
            attempt_id=attempt_id,
            section_index=section_idx,
            skill=skill,
            theta=new_theta,
        )
        next_section_index = section_idx
        # Edge case: bank exhausted before budget reached → end this section gracefully
        if next_item is None:
            new_idx, candidate = await _advance_to_next_skill_with_items(
                db,
                de,
                attempt_id=attempt_id,
                sections=sections,
                theta_estimates=new_estimates,
                start_index=section_idx + 1,
            )
            section_complete = True
            if candidate is None:
                attempt_complete = True
                new_state = "completed"
                finished_at = datetime.now(UTC)
                next_section_index = len(sections)
                next_item = None
            else:
                next_section_index = new_idx
                next_item = candidate

    await db.execute(
        update(ExamAttempt)
        .where(ExamAttempt.id == attempt_id)
        .values(
            theta_estimates=new_estimates,
            theta_se=new_se_dict,
            current_section_index=next_section_index,
            current_item_snapshot=_item_snapshot(next_item),
            current_item_issued_at=datetime.now(UTC) if next_item is not None else None,
            **({"state": new_state} if new_state else {}),
            **({"finished_at": finished_at} if finished_at else {}),
        )
    )
    await db.commit()

    if attempt_complete:
        try:
            from exam_platform.services.feedback import ensure_attempt_completion_feedback

            await ensure_attempt_completion_feedback(
                db,
                user_id=user_id,
                attempt_id=attempt_id,
            )
        except Exception as exc:
            log.warning(
                "attempt_completion_feedback_failed",
                attempt_id=str(attempt_id),
                error=str(exc),
            )
        try:
            from exam_platform.services.practice import seed_srs_from_attempt

            await seed_srs_from_attempt(db, user_id=user_id, attempt_id=attempt_id)
            await db.commit()
        except Exception as exc:
            log.warning(
                "srs_seed_failed",
                attempt_id=str(attempt_id),
                error=str(exc),
            )

    return SubmitResponseOut(
        response_id=response_id,
        graded_synchronously=objective,
        is_correct=is_correct,
        next_item=next_item,
        section_complete=section_complete,
        attempt_complete=attempt_complete,
        next_section_index=(next_section_index if not attempt_complete else None),
        next_skill=(next_item.skill if next_item is not None else None),
    )
