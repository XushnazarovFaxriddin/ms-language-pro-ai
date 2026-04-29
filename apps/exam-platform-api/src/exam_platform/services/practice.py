"""Practice mode state: SRS cards, drill attempts, and mastery updates."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from languagepro_common.errors import ConflictError, NotFoundError
from languagepro_common.logging import get_logger
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.models import AttemptResponse, DrillAttempt, SRSCard, UserMastery

log = get_logger(__name__)
from exam_platform.schemas import (
    DrillAttemptComplete,
    DrillAttemptCreate,
    DrillAttemptOut,
    DrillItemSubmit,
    MasteryOut,
    SRSCardOut,
    SRSGradeRequest,
)


async def get_srs_queue(
    db: AsyncSession,
    *,
    user_id: UUID,
    limit: int = 20,
) -> list[SRSCardOut]:
    rows = list(
        (
            await db.execute(
                select(SRSCard)
                .where(SRSCard.user_id == user_id, SRSCard.due_at <= datetime.now(UTC))
                .order_by(SRSCard.due_at.asc())
                .limit(limit)
            )
        ).scalars()
    )
    if not rows:
        # First-time user: backfill from any completed attempts they already have.
        # Idempotent — `seed_srs_from_attempt` skips items already seeded.
        from exam_platform.models import ExamAttempt

        any_card = (
            await db.execute(
                select(SRSCard.id).where(SRSCard.user_id == user_id).limit(1)
            )
        ).scalar_one_or_none()
        if any_card is None:
            attempts = (
                await db.execute(
                    select(ExamAttempt.id).where(
                        ExamAttempt.user_id == user_id,
                        ExamAttempt.state == "completed",
                    )
                )
            ).scalars().all()
            inserted_total = 0
            for att_id in attempts:
                inserted_total += await seed_srs_from_attempt(
                    db, user_id=user_id, attempt_id=att_id
                )
            if inserted_total > 0:
                await db.commit()
                rows = list(
                    (
                        await db.execute(
                            select(SRSCard)
                            .where(
                                SRSCard.user_id == user_id,
                                SRSCard.due_at <= datetime.now(UTC),
                            )
                            .order_by(SRSCard.due_at.asc())
                            .limit(limit)
                        )
                    ).scalars()
                )
    return [_srs_out(row) for row in rows]


async def grade_srs_card(
    db: AsyncSession,
    *,
    user_id: UUID,
    body: SRSGradeRequest,
) -> SRSCardOut:
    row = await _get_srs_card(db, user_id=user_id, card_id=body.card_id)
    stability, difficulty, due_at, lapses = _next_srs_state(row, body.grade)
    await db.execute(
        update(SRSCard)
        .where(SRSCard.id == row.id)
        .values(
            stability=Decimal(str(stability)),
            difficulty=Decimal(str(difficulty)),
            due_at=due_at,
            reps=row.reps + 1,
            lapses=lapses,
            last_grade=body.grade,
            updated_at=datetime.now(UTC),
        )
    )
    await db.commit()
    row = await _get_srs_card(db, user_id=user_id, card_id=body.card_id)
    return _srs_out(row)


async def start_drill_attempt(
    db: AsyncSession,
    *,
    user_id: UUID,
    drill_id: UUID,
    body: DrillAttemptCreate,
) -> DrillAttemptOut:
    attempt = DrillAttempt(
        user_id=user_id,
        drill_id=drill_id,
        items_total=body.items_total,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return _drill_attempt_out(attempt)


async def submit_drill_item(
    db: AsyncSession,
    *,
    user_id: UUID,
    drill_id: UUID,
    attempt_id: UUID,
    body: DrillItemSubmit,
) -> DrillAttemptOut:
    attempt = await _get_drill_attempt(
        db,
        user_id=user_id,
        drill_id=drill_id,
        attempt_id=attempt_id,
    )
    if attempt.completed_at is not None:
        raise ConflictError("Drill attempt is already completed")

    await db.execute(
        update(DrillAttempt)
        .where(DrillAttempt.id == attempt.id)
        .values(
            items_correct=DrillAttempt.items_correct + (1 if body.correct else 0),
            items_total=DrillAttempt.items_total + 1,
        )
    )
    for code in body.target_codes:
        await _adjust_mastery(db, user_id=user_id, code=code, correct=body.correct)
    await db.commit()
    attempt = await _get_drill_attempt(
        db,
        user_id=user_id,
        drill_id=drill_id,
        attempt_id=attempt_id,
    )
    return _drill_attempt_out(attempt)


async def complete_drill_attempt(
    db: AsyncSession,
    *,
    user_id: UUID,
    drill_id: UUID,
    attempt_id: UUID,
    body: DrillAttemptComplete,
) -> DrillAttemptOut:
    attempt = await _get_drill_attempt(
        db,
        user_id=user_id,
        drill_id=drill_id,
        attempt_id=attempt_id,
    )
    await db.execute(
        update(DrillAttempt)
        .where(DrillAttempt.id == attempt.id)
        .values(duration_ms=body.duration_ms, completed_at=datetime.now(UTC))
    )
    await db.commit()
    attempt = await _get_drill_attempt(
        db,
        user_id=user_id,
        drill_id=drill_id,
        attempt_id=attempt_id,
    )
    return _drill_attempt_out(attempt)


async def seed_srs_from_attempt(
    db: AsyncSession,
    *,
    user_id: UUID,
    attempt_id: UUID,
) -> int:
    """For each incorrect objective response, insert an SRS card (skip duplicates).

    Also nudges per-skill mastery downward for missed items. Idempotent:
    same call twice does NOT insert duplicates because we check existing
    (user_id, ref_type='question', ref_id=item_id) tuples first.
    """
    rows = (
        await db.execute(
            select(AttemptResponse).where(
                AttemptResponse.attempt_id == attempt_id,
                AttemptResponse.is_correct.is_(False),
            )
        )
    ).scalars().all()

    if not rows:
        return 0

    # Find which item_ids already have a card so we don't double-seed.
    item_ids = list({str(r.item_id) for r in rows})
    existing = (
        await db.execute(
            select(SRSCard.ref_id).where(
                SRSCard.user_id == user_id,
                SRSCard.ref_type == "question",
                SRSCard.ref_id.in_(item_ids),
            )
        )
    ).scalars().all()
    existing_set = set(existing)

    now = datetime.now(UTC)
    inserted = 0
    skill_misses: dict[str, int] = {}
    for r in rows:
        skill_misses[r.skill] = skill_misses.get(r.skill, 0) + 1
        ref_id = str(r.item_id)
        if ref_id in existing_set:
            continue
        existing_set.add(ref_id)
        payload = _build_srs_payload(r.item_snapshot, r.raw_answer, r.skill, r.type)
        await db.execute(
            insert(SRSCard).values(
                user_id=user_id,
                ref_type="question",
                ref_id=ref_id,
                payload=payload,
                stability=Decimal("1.0"),
                difficulty=Decimal("5.0"),
                due_at=now,  # available for review immediately
            )
        )
        inserted += 1

    # Nudge mastery downward for each skill the user missed.
    for skill, _miss_count in skill_misses.items():
        await _adjust_mastery(db, user_id=user_id, code=f"skill_{skill}", correct=False)

    log.info(
        "srs_seeded_from_attempt",
        attempt_id=str(attempt_id),
        inserted=inserted,
        skipped_existing=len(rows) - inserted,
    )
    return inserted


def _build_srs_payload(
    item_snapshot: dict[str, Any],
    raw_answer: dict[str, Any],
    skill: str,
    item_type: str,
) -> dict[str, Any]:
    """Build a self-contained payload for the SRS card."""
    snap = item_snapshot or {}
    p = snap.get("payload") or {}
    return {
        "skill": skill,
        "type": item_type,
        "prompt": p.get("prompt") or p.get("question") or p.get("passage", "")[:500],
        "options": p.get("options") or [],
        "correct_option_id": p.get("correct_option_id"),
        "correct_answer": p.get("correct_answer") or p.get("answer"),
        "user_answer": raw_answer or {},
        "cefr_level": snap.get("cefr_level") or p.get("cefr_level"),
    }


async def get_mastery(
    db: AsyncSession,
    *,
    user_id: UUID,
    limit: int = 100,
) -> list[MasteryOut]:
    rows = (
        await db.execute(
            select(UserMastery)
            .where(UserMastery.user_id == user_id)
            .order_by(UserMastery.mastery.asc(), UserMastery.last_practiced_at.desc())
            .limit(limit)
        )
    ).scalars()
    return [
        MasteryOut(
            code=row.code,
            mastery=float(row.mastery),
            last_practiced_at=row.last_practiced_at,
        )
        for row in rows
    ]


async def _get_srs_card(db: AsyncSession, *, user_id: UUID, card_id: UUID) -> SRSCard:
    row = (
        await db.execute(select(SRSCard).where(SRSCard.id == card_id, SRSCard.user_id == user_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"SRS card {card_id} not found")
    return row


async def _get_drill_attempt(
    db: AsyncSession,
    *,
    user_id: UUID,
    drill_id: UUID,
    attempt_id: UUID,
) -> DrillAttempt:
    row = (
        await db.execute(
            select(DrillAttempt).where(
                DrillAttempt.id == attempt_id,
                DrillAttempt.drill_id == drill_id,
                DrillAttempt.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Drill attempt {attempt_id} not found")
    return row


async def _adjust_mastery(
    db: AsyncSession,
    *,
    user_id: UUID,
    code: str,
    correct: bool,
) -> None:
    now = datetime.now(UTC)
    row = (
        await db.execute(
            select(UserMastery).where(UserMastery.user_id == user_id, UserMastery.code == code)
        )
    ).scalar_one_or_none()
    delta = Decimal("0.05") if correct else Decimal("-0.10")
    if row is None:
        db.add(
            UserMastery(
                user_id=user_id,
                code=code,
                mastery=max(Decimal("0.0"), delta),
                last_practiced_at=now,
            )
        )
        return
    mastery = max(Decimal("0.0"), min(Decimal("1.0"), row.mastery + delta))
    await db.execute(
        update(UserMastery)
        .where(UserMastery.user_id == user_id, UserMastery.code == code)
        .values(mastery=mastery, last_practiced_at=now)
    )


def _next_srs_state(
    row: SRSCard,
    grade: str,
) -> tuple[float, float, datetime, int]:
    stability = float(row.stability)
    difficulty = float(row.difficulty)
    lapses = row.lapses
    if grade == "again":
        stability = max(0.5, stability * 0.6)
        difficulty = min(10.0, difficulty + 0.5)
        lapses += 1
        delay = timedelta(minutes=5)
    elif grade == "hard":
        stability = max(0.5, stability * 1.2)
        difficulty = min(10.0, difficulty + 0.2)
        delay = timedelta(hours=6)
    elif grade == "easy":
        stability = min(365.0, stability * 3.0)
        difficulty = max(1.0, difficulty - 0.3)
        delay = timedelta(days=max(2.0, stability))
    else:
        stability = min(365.0, stability * 2.0)
        difficulty = max(1.0, difficulty - 0.1)
        delay = timedelta(days=max(1.0, stability))
    return round(stability, 3), round(difficulty, 3), datetime.now(UTC) + delay, lapses


def _srs_out(row: SRSCard) -> SRSCardOut:
    return SRSCardOut(
        id=row.id,
        ref_type=row.ref_type,
        ref_id=row.ref_id,
        payload=row.payload,
        stability=float(row.stability),
        difficulty=float(row.difficulty),
        due_at=row.due_at,
        reps=row.reps,
        lapses=row.lapses,
        last_grade=row.last_grade,
    )


def _drill_attempt_out(row: DrillAttempt) -> DrillAttemptOut:
    return DrillAttemptOut(
        id=row.id,
        drill_id=row.drill_id,
        items_correct=row.items_correct,
        items_total=row.items_total,
        duration_ms=row.duration_ms,
        started_at=row.started_at,
        completed_at=row.completed_at,
    )
