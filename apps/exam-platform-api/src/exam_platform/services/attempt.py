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

# Item types graded by single-choice answer key lookup
SINGLE_CHOICE_TYPES = {
    "mcq_single",
    "true_false_ng",
    "yes_no_ng",
    "matching_information",
    "matching_features",
    "matching_headings",
    "matching_sentence_endings",
}

# Item types that accept a typed text answer matched against one or more acceptable variants
TEXT_COMPLETION_TYPES = {
    "sentence_completion",
    "summary_completion",
    "note_completion",
    "table_completion",
    "short_answer",
}

# All objective item types (graded synchronously)
OBJECTIVE_TYPES = SINGLE_CHOICE_TYPES | TEXT_COMPLETION_TYPES | {"mcq_multi"}

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


def _check_expiry(attempt: ExamAttempt) -> None:
    """Raise ConflictError if the attempt has expired."""
    if attempt.expires_at and datetime.now(UTC) > attempt.expires_at:
        raise ConflictError(
            "Attempt has expired. The time limit for this exam has passed."
        )


async def _check_duplicate_response(
    db: AsyncSession, attempt_id: UUID, item_id: UUID
) -> None:
    """Prevent submitting the same item twice within an attempt (idempotency guard)."""
    existing = (
        await db.execute(
            select(AttemptResponse.id).where(
                AttemptResponse.attempt_id == attempt_id,
                AttemptResponse.item_id == item_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ConflictError(
            f"Response for item {item_id} already submitted in this attempt"
        )


def _grade_text_completion(
    given_text: str | None, answer_key: dict,
) -> bool:
    """Grade completion-type items by matching typed text against acceptable answers.

    The answer key may have:
      - correct_option_id: single correct text
      - acceptable_answers: list of alternative correct texts
    All matching is case-insensitive and whitespace-trimmed.
    """
    if not given_text or not given_text.strip():
        return False
    normalised = given_text.strip().lower()
    # Primary correct answer
    primary = str(answer_key.get("correct_option_id", "")).strip().lower()
    if primary and normalised == primary:
        return True
    # Check list of acceptable alternatives
    alternatives = answer_key.get("acceptable_answers", [])
    if isinstance(alternatives, list):
        for alt in alternatives:
            if isinstance(alt, str) and normalised == alt.strip().lower():
                return True
    return False


def _grade_multi_choice(
    given_ids: str | None, answer_key: dict,
) -> tuple[bool, float]:
    """Grade multi-select MCQ items. Returns (fully_correct, partial_credit)."""
    if not given_ids:
        return False, 0.0
    selected = {s.strip().lower() for s in given_ids.split(",") if s.strip()}
    correct_raw = answer_key.get("correct_option_ids", [])
    if not correct_raw:
        # Fallback: single correct_option_id
        single = str(answer_key.get("correct_option_id", "")).strip().lower()
        return (bool(single) and selected == {single}), (1.0 if selected == {single} else 0.0)
    correct = {str(c).strip().lower() for c in correct_raw if c}
    if not correct:
        return False, 0.0
    hits = selected & correct
    if selected == correct:
        return True, 1.0
    if hits:
        return False, round(len(hits) / len(correct), 3)
    return False, 0.0


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

    # ── Auto-abandon expired attempts: prevent stale in-progress from blocking ──
    await db.execute(
        update(ExamAttempt)
        .where(
            ExamAttempt.user_id == user_id,
            ExamAttempt.state == "in_progress",
            ExamAttempt.expires_at < datetime.now(UTC),
        )
        .values(state="abandoned", finished_at=datetime.now(UTC))
    )
    await db.commit()

    # ── Concurrent attempt guard: prevent multiple in-progress attempts ──
    existing_in_progress = (
        await db.execute(
            select(func.count(ExamAttempt.id)).where(
                ExamAttempt.user_id == user_id,
                ExamAttempt.state == "in_progress",
            )
        )
    ).scalar_one()
    if int(existing_in_progress) > 0:
        raise ConflictError(
            "You already have an exam in progress. Please finish or abandon it "
            "before starting a new one."
        )

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
    _check_expiry(attempt)

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
    _check_expiry(attempt)

    # ── Idempotency guard: prevent duplicate submissions ──
    await _check_duplicate_response(db, attempt_id, item_id)

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
    partial: Decimal | None = None
    raw_answer: dict[str, Any] = {}
    objective = item_type in OBJECTIVE_TYPES

    if item_type in SINGLE_CHOICE_TYPES:
        # Single-choice grading via answer_key.correct_option_id
        if not mcq_choice_id:
            raise ValidationError(f"mcq_choice_id required for {item_type}")
        key = await de.get_answer_key(item_id)
        expected = str(key.get("correct_option_id", "")).strip().lower()
        given = str(mcq_choice_id).strip().lower()
        is_correct = bool(expected) and given == expected
        raw_answer = {"mcq_choice_id": mcq_choice_id}
    elif item_type == "mcq_multi":
        # Multi-select MCQ with partial credit
        if not mcq_choice_id:
            raise ValidationError(f"mcq_choice_id required for {item_type}")
        key = await de.get_answer_key(item_id)
        is_correct, pc = _grade_multi_choice(mcq_choice_id, key)
        partial = Decimal(str(pc))
        raw_answer = {"mcq_choice_id": mcq_choice_id}
    elif item_type in TEXT_COMPLETION_TYPES:
        # Text completion: typed answer matched against acceptable variants
        answer_text = text_answer if text_answer is not None else mcq_choice_id
        if not answer_text or not str(answer_text).strip():
            raise ValidationError(f"An answer is required for {item_type}")
        key = await de.get_answer_key(item_id)
        is_correct = _grade_text_completion(str(answer_text), key)
        raw_answer = {"text_answer": str(answer_text)} if text_answer else {"mcq_choice_id": mcq_choice_id}
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

    # Compute partial credit for non-multi types (multi already set above)
    if partial is None:
        partial = (
            Decimal("1.0")
            if is_correct
            else (Decimal("0.0") if is_correct is False else None)
        )

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
            partial_credit=partial,
            theta_at_answer=Decimal(str(theta_now)),
            skill=skill,
            time_ms=time_ms,
        )
    )

    # IRT theta update for objective items
    if objective and is_correct is not None:
        # Try to read per-item IRT parameters from the item snapshot
        item_payload = (attempt.current_item_snapshot or {}).get("payload", {})
        a = float(item_payload.get("irt_a", 1.0))
        b = float(item_payload.get("irt_b", 0.0))
        c_default = 0.25 if item_type == "mcq_single" else 0.0
        c = float(item_payload.get("irt_c", c_default))
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
