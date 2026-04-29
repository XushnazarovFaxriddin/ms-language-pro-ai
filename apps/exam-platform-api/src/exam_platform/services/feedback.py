"""Layered feedback generation and retrieval."""

from __future__ import annotations

import base64
import re
from collections import Counter, defaultdict
from decimal import Decimal
from math import floor
from typing import Any
from uuid import UUID

from languagepro_common.errors import NotFoundError, ValidationError
from languagepro_common.logging import get_logger
from languagepro_llm import LLMRequest, LLMRouter
from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.models import (
    AttemptResponse,
    ExamAttempt,
    FeedbackArtifact,
    LLMScoringRun,
    ScoringResult,
)
from exam_platform.schemas import (
    AnalyseWritingRequest,
    AttemptOverview,
    FeedbackArtifactOut,
    FeedbackOverviewRequest,
    SentenceAnnotations,
    SpeakingScore,
    WordUpgrades,
    WritingScore,
)

DEFAULT_ERROR_CODES = [
    "grammar.subject_verb_agreement",
    "grammar.article_missing",
    "grammar.partitive_of",
    "grammar.verb_tense",
    "lexis.collocation",
    "lexis.word_choice",
    "cohesion.reference",
    "style.academic_register",
]

GENERIC_WORD_CEFR: dict[str, str] = {
    "bad": "A1",
    "big": "A1",
    "get": "A1",
    "good": "A1",
    "important": "A2",
    "many": "A1",
    "people": "A1",
    "really": "A2",
    "thing": "A1",
    "very": "A1",
}

IELTS_SKILLS = ("listening", "reading", "writing", "speaking")
log = get_logger(__name__)


async def get_attempt_artifacts(
    db: AsyncSession,
    *,
    user_id: UUID,
    attempt_id: UUID,
    layer: str | None = None,
) -> list[FeedbackArtifactOut]:
    attempt = await _get_attempt_for_user(db, user_id=user_id, attempt_id=attempt_id)
    stmt = select(FeedbackArtifact).where(FeedbackArtifact.attempt_id == attempt.id)
    if layer:
        stmt = stmt.where(FeedbackArtifact.layer == layer)
    stmt = stmt.order_by(FeedbackArtifact.created_at.asc())
    rows = (await db.execute(stmt)).scalars().all()
    if layer in (None, "overview") and any(row.layer == "overview" for row in rows):
        rows = await _normalise_overview_rows(db, attempt, rows)
    return [_artifact_out(row) for row in rows]


async def compute_attempt_bands(
    db: AsyncSession,
    attempt_id: UUID,
) -> dict[str, float | None]:
    return await _attempt_bands(db, attempt_id)


async def get_response_artifacts(
    db: AsyncSession,
    *,
    user_id: UUID,
    response_id: UUID,
    layer: str | None = None,
) -> list[FeedbackArtifactOut]:
    response, _ = await _get_response_for_user(db, user_id=user_id, response_id=response_id)
    stmt = select(FeedbackArtifact).where(FeedbackArtifact.response_id == response.id)
    if layer:
        stmt = stmt.where(FeedbackArtifact.layer == layer)
    stmt = stmt.order_by(FeedbackArtifact.created_at.asc())
    return [_artifact_out(row) for row in (await db.execute(stmt)).scalars().all()]


async def get_recent_attempt_feedback(
    db: AsyncSession,
    *,
    user_id: UUID,
    limit: int = 5,
) -> list[tuple[UUID, list[FeedbackArtifactOut]]]:
    attempt_ids = (
        (
            await db.execute(
                select(ExamAttempt.id)
                .where(ExamAttempt.user_id == user_id)
                .order_by(ExamAttempt.started_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    results: list[tuple[UUID, list[FeedbackArtifactOut]]] = []
    for attempt_id in attempt_ids:
        artifacts = await get_attempt_artifacts(db, user_id=user_id, attempt_id=attempt_id)
        results.append(
            (
                attempt_id,
                [
                    artifact
                    for artifact in artifacts
                    if artifact.layer in {"band", "criterion", "overview"}
                ],
            )
        )
    return results


async def ensure_attempt_completion_feedback(
    db: AsyncSession,
    *,
    user_id: UUID,
    attempt_id: UUID,
) -> list[FeedbackArtifactOut]:
    """Create deterministic completion feedback for a finished attempt.

    The LLM scoring pipeline can later replace or enrich these artifacts, but the
    student should always see a complete IELTS result immediately after the last
    section is submitted. This keeps the E2E exam usable when Redis/LLM workers
    are not running in local/dev environments.
    """
    attempt = await _get_attempt_for_user(db, user_id=user_id, attempt_id=attempt_id)
    if attempt.state != "completed":
        return await get_attempt_artifacts(db, user_id=user_id, attempt_id=attempt_id)

    responses = (
        (
            await db.execute(
                select(AttemptResponse)
                .where(AttemptResponse.attempt_id == attempt.id)
                .order_by(AttemptResponse.section_index.asc(), AttemptResponse.answered_at.asc())
            )
        )
        .scalars()
        .all()
    )
    if not responses:
        return await get_attempt_artifacts(db, user_id=user_id, attempt_id=attempt_id)

    for response in responses:
        band, criteria, feedback_uz, feedback_en = _score_response_heuristically(response)
        await _upsert_scoring_result(
            db,
            response_id=response.id,
            band=band,
            criteria=criteria,
            feedback_uz=feedback_uz,
            feedback_en=feedback_en,
        )

    bands = await _attempt_bands(db, attempt.id)
    overview_payload = _build_completion_overview(attempt, responses, bands)
    overview_payload["scoring_sources"] = await _scoring_source_summary(db, attempt.id)

    await db.execute(
        delete(FeedbackArtifact).where(
            FeedbackArtifact.attempt_id == attempt.id,
            FeedbackArtifact.response_id.is_(None),
            FeedbackArtifact.layer == "overview",
            FeedbackArtifact.source == "system",
        )
    )
    await db.execute(
        insert(FeedbackArtifact).values(
            attempt_id=attempt.id,
            response_id=None,
            layer="overview",
            skill="overall",
            payload=overview_payload,
            source="system",
            model=None,
            prompt_version_id=None,
        )
    )
    await db.commit()
    return await get_attempt_artifacts(db, user_id=user_id, attempt_id=attempt.id)


async def generate_attempt_overview(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    attempt_id: UUID,
    body: FeedbackOverviewRequest,
) -> FeedbackArtifactOut:
    attempt = await _get_attempt_for_user(db, user_id=user_id, attempt_id=attempt_id)
    responses = (
        (
            await db.execute(
                select(AttemptResponse)
                .where(AttemptResponse.attempt_id == attempt.id)
                .order_by(AttemptResponse.section_index.asc(), AttemptResponse.answered_at.asc())
            )
        )
        .scalars()
        .all()
    )
    await _ensure_llm_scoring_for_attempt(
        db,
        router,
        user_id,
        attempt,
        list(responses),
        target_band=body.target_band,
    )

    bands = await _attempt_bands(db, attempt.id)
    top_error_codes = await _top_error_codes(db, attempt.id)
    vocabulary_metrics = await _vocabulary_metrics(db, attempt.id)
    base_payload = _build_completion_overview(attempt, list(responses), bands)
    base_payload["scoring_sources"] = await _scoring_source_summary(db, attempt.id)
    source = "llm"
    model: str | None = None
    prompt_version_id: str | None = None
    try:
        overview_resp = await router.complete(
            LLMRequest(
                purpose="feedback",
                prompt_id="feedback/overview",
                variables={
                    "bands": bands,
                    "top_error_codes": top_error_codes,
                    "vocabulary_metrics": vocabulary_metrics,
                    "response_summary": _attempt_response_summary(list(responses)),
                    "target_band": body.target_band,
                    "user_locale": attempt.locale,
                },
                user_id=user_id,
                attempt_id=attempt.id,
            )
        )
        if overview_resp.parsed is None:
            raise ValidationError("Feedback overview response did not match schema")
        llm_payload = AttemptOverview.model_validate(overview_resp.parsed).model_dump(
            mode="json"
        )
        overview_payload = _merge_overview_payload(base_payload, llm_payload, source="llm")
        model = overview_resp.model
        prompt_version_id = overview_resp.prompt_version_id
    except Exception as exc:
        # Be honest with the student: instead of silently swapping in a
        # deterministic fallback (which produces optimistic bands the LLM
        # would not have given), surface the failure so the UI can show a
        # clear retry. We still write a record so subsequent reads return
        # the deterministic snapshot — but we re-raise to signal "not real".
        log.exception(
            "feedback_overview_llm_failed",
            attempt_id=str(attempt.id),
            error=str(exc),
        )
        raise ValidationError(
            f"AI grading is temporarily unavailable: {exc!s}"[:240]
        ) from exc

    await db.execute(
        delete(FeedbackArtifact).where(
            FeedbackArtifact.attempt_id == attempt.id,
            FeedbackArtifact.response_id.is_(None),
            FeedbackArtifact.layer == "overview",
        )
    )
    artifact_id = (
        await db.execute(
            insert(FeedbackArtifact)
            .values(
                attempt_id=attempt.id,
                response_id=None,
                layer="overview",
                skill="overall",
                payload=overview_payload,
                source=source,
                model=model,
                prompt_version_id=prompt_version_id,
            )
            .returning(FeedbackArtifact.id)
        )
    ).scalar_one()
    await db.commit()
    row = (
        await db.execute(select(FeedbackArtifact).where(FeedbackArtifact.id == artifact_id))
    ).scalar_one()
    return _artifact_out(row)


async def analyse_writing_response(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    response_id: UUID,
    body: AnalyseWritingRequest,
) -> list[FeedbackArtifactOut]:
    response, attempt = await _get_response_for_user(
        db,
        user_id=user_id,
        response_id=response_id,
    )
    if response.skill != "writing" and not response.type.startswith("writing_"):
        raise ValidationError("Writing feedback can only be generated for writing responses")

    essay = response.raw_answer.get("text_answer")
    if not isinstance(essay, str) or not essay.strip():
        raise ValidationError("Response does not contain a writing text answer")

    target_cefr = body.target_cefr or target_cefr_for_band(body.target_band)
    issue_codes = body.error_taxonomy_codes or DEFAULT_ERROR_CODES
    detected_issues = body.detected_issues or _detect_basic_sentence_issues(essay)
    word_stats = body.word_stats or _build_word_stats(essay)

    sentence_resp = await router.complete(
        LLMRequest(
            purpose="score_writing",
            prompt_id="score_writing/sentence_annotate",
            variables={
                "essay": essay,
                "detected_issues": detected_issues,
                "error_taxonomy_codes": issue_codes,
            },
            user_id=user_id,
            attempt_id=attempt.id,
        )
    )
    if sentence_resp.parsed is None:
        raise ValidationError("Sentence annotation response did not match schema")
    sentence_annotations = SentenceAnnotations.model_validate(sentence_resp.parsed)

    word_resp = await router.complete(
        LLMRequest(
            purpose="score_writing",
            prompt_id="score_writing/word_upgrade",
            variables={
                "essay": essay,
                "word_stats": word_stats,
                "target_band": body.target_band,
                "target_cefr": target_cefr,
            },
            user_id=user_id,
            attempt_id=attempt.id,
        )
    )
    if word_resp.parsed is None:
        raise ValidationError("Word upgrade response did not match schema")
    word_upgrades = WordUpgrades.model_validate(word_resp.parsed)

    await db.execute(
        delete(FeedbackArtifact).where(
            FeedbackArtifact.response_id == response.id,
            FeedbackArtifact.layer.in_(["sentence", "word"]),
        )
    )
    await db.execute(
        insert(FeedbackArtifact),
        [
            {
                "attempt_id": attempt.id,
                "response_id": response.id,
                "layer": "sentence",
                "skill": response.skill,
                "payload": sentence_annotations.model_dump(mode="json"),
                "source": "llm",
                "model": sentence_resp.model,
                "prompt_version_id": sentence_resp.prompt_version_id,
            },
            {
                "attempt_id": attempt.id,
                "response_id": response.id,
                "layer": "word",
                "skill": response.skill,
                "payload": word_upgrades.model_dump(mode="json"),
                "source": "llm",
                "model": word_resp.model,
                "prompt_version_id": word_resp.prompt_version_id,
            },
        ],
    )
    await db.commit()
    return await get_response_artifacts(db, user_id=user_id, response_id=response.id)


async def _ensure_llm_scoring_for_attempt(
    db: AsyncSession,
    router: LLMRouter,
    user_id: UUID,
    attempt: ExamAttempt,
    responses: list[AttemptResponse],
    *,
    target_band: float | None = None,
) -> None:
    """Upgrade writing/speaking fallback scores to LLM scores when possible."""
    scored_any = False
    for response in responses:
        if not _needs_llm_scoring(response):
            continue
        if await _has_final_llm_score(db, response.id):
            continue

        try:
            if response.skill == "writing" or response.type.startswith("writing_"):
                await _score_writing_with_llm(
                    db,
                    router,
                    user_id=user_id,
                    attempt=attempt,
                    response=response,
                    target_band=target_band,
                )
                scored_any = True
            elif response.skill == "speaking" or response.type.startswith("speaking_"):
                await _score_speaking_with_llm(
                    db,
                    router,
                    user_id=user_id,
                    attempt=attempt,
                    response=response,
                    target_band=target_band,
                )
                scored_any = True
        except Exception as exc:
            log.warning(
                "llm_response_scoring_failed",
                attempt_id=str(attempt.id),
                response_id=str(response.id),
                skill=response.skill,
                error=str(exc),
            )

    if scored_any:
        await db.commit()


def _needs_llm_scoring(response: AttemptResponse) -> bool:
    return (
        response.skill in {"writing", "speaking"}
        or response.type.startswith("writing_")
        or response.type.startswith("speaking_")
    )


async def _has_final_llm_score(db: AsyncSession, response_id: UUID) -> bool:
    row = (
        await db.execute(
            select(ScoringResult.source, ScoringResult.band).where(
                ScoringResult.response_id == response_id
            )
        )
    ).one_or_none()
    if row is None:
        return False
    source, band = row
    return source == "llm" and band is not None


async def _score_writing_with_llm(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    attempt: ExamAttempt,
    response: AttemptResponse,
    target_band: float | None,
) -> None:
    raw_answer = response.raw_answer or {}
    essay = raw_answer.get("text_answer")
    if not isinstance(essay, str) or not essay.strip():
        raise ValidationError("Writing response does not contain text")

    item_payload = _response_payload(response)
    llm_response = await router.complete(
        LLMRequest(
            purpose="score_writing",
            prompt_id="score_writing/ielts",
            variables={
                "task_type": _writing_task_type(response),
                "task_prompt": item_payload.get("prompt") or response.type,
                "essay": essay,
                "rubric": _writing_rubric_summary(),
                "target_band": target_band or 7.0,
            },
            user_id=user_id,
            attempt_id=attempt.id,
        )
    )
    if llm_response.parsed is None:
        raise ValidationError("Writing score response did not match schema")
    score = WritingScore.model_validate(llm_response.parsed)
    criteria = {
        "task_response": _round_band(score.task_response),
        "coherence_cohesion": _round_band(score.coherence_cohesion),
        "lexical_resource": _round_band(score.lexical_resource),
        "grammatical_range_accuracy": _round_band(score.grammatical_range_accuracy),
        "evidence_quotes": score.evidence_quotes,
        "confidence": score.confidence,
        "method": "llm_ielts_writing",
    }
    await _upsert_scoring_result(
        db,
        response_id=response.id,
        band=_round_band(score.overall_band),
        criteria=criteria,
        feedback_uz=score.feedback_uz,
        feedback_en=score.feedback_en,
        source="llm",
    )
    await _insert_llm_scoring_run(
        db,
        response_id=response.id,
        rubric_ref="ielts_writing_v1",
        model=llm_response.model,
        prompt_version_id=llm_response.prompt_version_id,
        raw_response=score.model_dump(mode="json"),
        criteria_scores=criteria,
        overall_band=_round_band(score.overall_band),
        confidence=score.confidence,
        cost_usd=llm_response.cost_usd,
        latency_ms=llm_response.latency_ms,
    )


async def _score_speaking_with_llm(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    attempt: ExamAttempt,
    response: AttemptResponse,
    target_band: float | None,
) -> None:
    raw_answer = response.raw_answer or {}
    audio_b64 = raw_answer.get("audio_base64")
    if not isinstance(audio_b64, str) or not audio_b64.strip():
        raise ValidationError("Speaking response does not contain audio")
    audio_bytes = base64.b64decode(audio_b64, validate=True)
    audio_format = _audio_format_for_llm(str(raw_answer.get("audio_format") or "webm"))
    if audio_format is None:
        raise ValidationError("Speaking audio must be wav or mp3 for LLM scoring")
    item_payload = _response_payload(response)

    llm_response = await router.complete(
        LLMRequest(
            purpose="score_speaking",
            prompt_id="score_speaking/ielts",
            variables={
                "speaking_part": _speaking_part(response),
                "task_prompt": item_payload.get("prompt") or response.type,
                "rubric": _speaking_rubric_summary(),
                "target_band": target_band or 7.0,
                "audio_metadata": {
                    "duration_seconds": round(float(response.time_ms or 0) / 1000.0, 1),
                    "sample_rate": 0,
                    "bytes": len(audio_bytes),
                },
            },
            audio_input=audio_bytes,
            audio_format=audio_format,
            user_id=user_id,
            attempt_id=attempt.id,
        )
    )
    if llm_response.parsed is None:
        raise ValidationError("Speaking score response did not match schema")
    score = SpeakingScore.model_validate(llm_response.parsed)
    criteria = {
        "fluency_coherence": _round_band(score.fluency_coherence),
        "lexical_resource": _round_band(score.lexical_resource),
        "grammatical_range_accuracy": _round_band(score.grammatical_range_accuracy),
        "pronunciation": _round_band(score.pronunciation),
        "transcript": score.transcript,
        "audio_metadata": score.audio_metadata.model_dump(mode="json"),
        "confidence": score.confidence,
        "method": "llm_ielts_speaking",
    }
    await _upsert_scoring_result(
        db,
        response_id=response.id,
        band=_round_band(score.overall_band),
        criteria=criteria,
        feedback_uz=score.feedback_uz,
        feedback_en=score.feedback_en,
        source="llm",
    )
    await _insert_llm_scoring_run(
        db,
        response_id=response.id,
        rubric_ref="ielts_speaking_v1",
        model=llm_response.model,
        prompt_version_id=llm_response.prompt_version_id,
        raw_response=score.model_dump(mode="json"),
        criteria_scores=criteria,
        overall_band=_round_band(score.overall_band),
        confidence=score.confidence,
        cost_usd=llm_response.cost_usd,
        latency_ms=llm_response.latency_ms,
    )


async def _insert_llm_scoring_run(
    db: AsyncSession,
    *,
    response_id: UUID,
    rubric_ref: str,
    model: str,
    prompt_version_id: str | None,
    raw_response: dict[str, Any],
    criteria_scores: dict[str, Any],
    overall_band: float,
    confidence: float,
    cost_usd: Decimal,
    latency_ms: int,
) -> None:
    await db.execute(
        insert(LLMScoringRun).values(
            response_id=response_id,
            rubric_ref=rubric_ref,
            model=model,
            prompt_version_id=prompt_version_id,
            raw_response=raw_response,
            criteria_scores=criteria_scores,
            overall_band=Decimal(str(overall_band)),
            confidence=Decimal(str(confidence)),
            cost_cents=int(cost_usd * Decimal("100")),
            latency_ms=latency_ms,
        )
    )


def _writing_task_type(response: AttemptResponse) -> str:
    task_type = _response_payload(response).get("task_type")
    if task_type in {"task1_academic", "task1_general", "task2"}:
        return str(task_type)
    if "task1_general" in response.type:
        return "task1_general"
    if "task1" in response.type:
        return "task1_academic"
    return "task2"


def _speaking_part(response: AttemptResponse) -> int:
    part = _response_payload(response).get("part")
    if part in {1, 2, 3}:
        return int(part)
    match = re.search(r"part[_-]?([123])", response.type)
    return int(match.group(1)) if match else 2


def _audio_format_for_llm(raw_format: str) -> str | None:
    value = raw_format.split(";")[0].split("/")[-1].lower()
    if value in {"mpeg", "mpga"}:
        return "mp3"
    if value in {"wav", "mp3"}:
        return value
    return None


def _writing_rubric_summary() -> dict[str, Any]:
    return {
        "criteria": [
            "task_response_or_achievement",
            "coherence_and_cohesion",
            "lexical_resource",
            "grammatical_range_and_accuracy",
        ],
        "scale": "IELTS public band scale from 0 to 9 in 0.5 increments",
        "instruction": "Use official IELTS Writing band-descriptor logic, summarized.",
    }


def _speaking_rubric_summary() -> dict[str, Any]:
    return {
        "criteria": [
            "fluency_and_coherence",
            "lexical_resource",
            "grammatical_range_and_accuracy",
            "pronunciation",
        ],
        "scale": "IELTS public band scale from 0 to 9 in 0.5 increments",
        "instruction": "Use official IELTS Speaking band-descriptor logic, summarized.",
    }


async def _upsert_scoring_result(
    db: AsyncSession,
    *,
    response_id: UUID,
    band: float,
    criteria: dict[str, Any],
    feedback_uz: str,
    feedback_en: str,
    source: str = "hybrid",
) -> None:
    existing_id = (
        await db.execute(select(ScoringResult.id).where(ScoringResult.response_id == response_id))
    ).scalar_one_or_none()
    values = {
        "source": source,
        "band": Decimal(str(band)),
        "criteria": criteria,
        "feedback_uz": feedback_uz,
        "feedback_en": feedback_en,
    }
    if existing_id is None:
        await db.execute(insert(ScoringResult).values(response_id=response_id, **values))
    else:
        await db.execute(
            update(ScoringResult).where(ScoringResult.id == existing_id).values(**values)
        )


def _score_response_heuristically(
    response: AttemptResponse,
) -> tuple[float, dict[str, Any], str, str]:
    if response.is_correct is not None:
        accuracy = 1.0 if response.is_correct else 0.0
        band = _round_band(4.5 + (3.5 * accuracy))
        criteria = {"accuracy": accuracy, "method": "objective_sync"}
        feedback_uz = (
            "Javob to'g'ri. Shu turdagi savollarda aniqlikni saqlang."
            if response.is_correct
            else "Javob noto'g'ri. Savol kalit so'zlari va distractorlarni qayta tahlil qiling."
        )
        feedback_en = (
            "Correct answer. Keep this level of accuracy for similar items."
            if response.is_correct
            else "Incorrect answer. Review the keywords and distractors in this item type."
        )
        return band, criteria, feedback_uz, feedback_en

    if response.skill == "writing" or response.type.startswith("writing_"):
        return _score_writing_heuristically(response)

    if response.skill == "speaking" or response.type.startswith("speaking_"):
        return _score_speaking_heuristically(response)

    band = _round_band(5.0)
    return (
        band,
        {"method": "completion_fallback"},
        "Javob qabul qilindi. Batafsil baholash keyingi scoring bosqichida boyitiladi.",
        "Answer accepted. Detailed scoring will be enriched by the scoring pipeline.",
    )


def _score_writing_heuristically(
    response: AttemptResponse,
) -> tuple[float, dict[str, Any], str, str]:
    """Pre-LLM placeholder. Punitive on short/empty answers so the student is
    never misled into thinking a near-blank essay scored 5+. Real grading
    overwrites this when the LLM call succeeds.
    """
    text = response.raw_answer.get("text_answer", "")
    essay = text if isinstance(text, str) else ""
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", essay)
    word_count = len(words)
    payload = _response_payload(response)
    minimum = int(payload.get("word_limit_min") or 250)

    # Hard caps based on length completeness.
    if word_count == 0:
        cap = 0.0
    elif word_count < 40:
        cap = 2.5
    elif word_count < minimum * 0.4:
        cap = 4.0
    elif word_count < minimum * 0.8:
        cap = 5.0
    else:
        cap = 6.5

    length_ratio = min(word_count / max(1, minimum), 1.0)
    task_response = _round_band(min(cap, 3.0 + length_ratio * 3.0))
    coherence = _round_band(min(cap, 3.5 + (0.5 if "\n" in essay.strip() else 0.0) + length_ratio * 1.5))
    lexical_pool = len({w.lower() for w in words})
    lexical = _round_band(min(cap, 3.5 + min(lexical_pool / 120, 1.0) * 2.0))
    sentence_count = len(_sentence_ranges(essay))
    grammar = _round_band(min(cap, 3.5 + min(sentence_count / 8, 1.0) * 2.0))
    band = _round_band((task_response + coherence + lexical + grammar) / 4)
    criteria = {
        "task_response": task_response,
        "coherence_cohesion": coherence,
        "lexical_resource": lexical,
        "grammatical_range_accuracy": grammar,
        "word_count": word_count,
        "method": "heuristic_fallback",
        "is_estimate": True,
    }
    if word_count == 0:
        feedback_uz = "Insho topshirilmadi (matn bo'sh). AI baholash haqiqiy band bera olmaydi."
        feedback_en = "No essay was submitted (empty text). AI grading cannot produce a real band."
    elif word_count < minimum * 0.5:
        feedback_uz = (
            f"Insho juda qisqa ({word_count}/{minimum} so'z) — bu band cheklangan. "
            "To'liq baholash uchun talab qilingan uzunlikda yozing."
        )
        feedback_en = (
            f"Essay is well below the minimum length ({word_count}/{minimum} words), "
            "which caps your band. Write the full required length for a real grade."
        )
    else:
        feedback_uz = (
            f"Bu — vaqtinchalik baholash ({word_count} so'z). To'liq AI tahlili uchun "
            "yuqoridagi 'AI tahlilini boshlash' tugmasini bosing."
        )
        feedback_en = (
            f"This is a placeholder estimate ({word_count} words). Trigger the full AI "
            "analysis above for the real, evidence-backed band."
        )
    return band, criteria, feedback_uz, feedback_en


def _score_speaking_heuristically(
    response: AttemptResponse,
) -> tuple[float, dict[str, Any], str, str]:
    payload = _response_payload(response)
    target_seconds = float(payload.get("speaking_seconds") or 120)
    duration_seconds = max(float(response.time_ms or 0) / 1000.0, 0.0)
    duration_ratio = min(duration_seconds / max(target_seconds, 1.0), 1.0)
    audio_bytes = int(response.raw_answer.get("audio_bytes") or 0)

    if audio_bytes <= 0 or duration_seconds < 1.0:
        cap = 0.0
    elif duration_seconds < 15:
        cap = 3.0
    elif duration_seconds < target_seconds * 0.4:
        cap = 4.5
    elif duration_seconds < target_seconds * 0.8:
        cap = 5.5
    else:
        cap = 6.5

    fluency = _round_band(min(cap, 3.0 + duration_ratio * 2.5))
    pronunciation = _round_band(min(cap, 3.5 + (0.5 if audio_bytes > 0 else 0.0)))
    lexical = _round_band(min(cap, 3.5 + duration_ratio * 2.0))
    grammar = _round_band(min(cap, 3.5 + duration_ratio * 2.0))
    band = _round_band((fluency + pronunciation + lexical + grammar) / 4)
    criteria = {
        "fluency_coherence": fluency,
        "lexical_resource": lexical,
        "grammatical_range_accuracy": grammar,
        "pronunciation": pronunciation,
        "duration_seconds": round(duration_seconds, 1),
        "audio_bytes": audio_bytes,
        "method": "heuristic_fallback",
        "is_estimate": True,
    }
    if audio_bytes <= 0:
        feedback_uz = "Speaking audio yozib olinmagan. AI baholash haqiqiy band bera olmaydi."
        feedback_en = "No speaking audio was recorded. AI grading cannot produce a real band."
    elif duration_seconds < 15:
        feedback_uz = (
            f"Javob juda qisqa ({round(duration_seconds, 1)}s). To'liq baholash uchun "
            "kamida 60 soniya gapiring."
        )
        feedback_en = (
            f"Response is very short ({round(duration_seconds, 1)}s). Speak for at least "
            "60 seconds for a meaningful band."
        )
    else:
        feedback_uz = (
            f"Bu — vaqtinchalik baholash ({round(duration_seconds, 1)}s audio). "
            "To'liq AI tahlili tez orada tayyor bo'ladi."
        )
        feedback_en = (
            f"This is a placeholder estimate ({round(duration_seconds, 1)}s audio). "
            "Full AI analysis will be ready shortly."
        )
    return band, criteria, feedback_uz, feedback_en


def _build_completion_overview(
    attempt: ExamAttempt,
    responses: list[AttemptResponse],
    bands: dict[str, float | None],
) -> dict[str, Any]:
    responses_by_skill: dict[str, list[AttemptResponse]] = defaultdict(list)
    for response in responses:
        responses_by_skill[response.skill].append(response)

    sections: list[dict[str, Any]] = []
    for section in attempt.blueprint_snapshot.get("sections", []):
        skill = str(section.get("skill"))
        skill_responses = responses_by_skill.get(skill, [])
        objective = [r for r in skill_responses if r.is_correct is not None]
        correct = sum(1 for r in objective if r.is_correct)
        sections.append(
            {
                "skill": skill,
                "name_uz": section.get("name_uz"),
                "name_en": section.get("name_en"),
                "answered": len(skill_responses),
                "objective_correct": correct,
                "objective_total": len(objective),
                "band": bands.get(skill),
            }
        )

    skill_bands = {
        skill: bands.get(skill)
        for skill in IELTS_SKILLS
        if bands.get(skill) is not None
    }
    weakest_skill = min(
        skill_bands,
        key=lambda key: float(skill_bands[key] or 0.0),
        default="writing",
    )
    overall = bands.get("overall")
    overall_text = f"{overall:.1f}" if overall is not None else "N/A"

    return {
        "bands": bands,
        "sections": sections,
        "narrative_uz": (
            f"Imtihon yakunlandi. Umumiy IELTS band taxmini: {overall_text}. "
            "Listening, Reading, Writing va Speaking javoblari saqlandi va dastlabki "
            "baholashdan o'tdi."
        ),
        "narrative_en": (
            f"Exam completed. Estimated overall IELTS band: {overall_text}. Listening, "
            "Reading, Writing, and Speaking answers were stored and received an initial score."
        ),
        "biggest_opportunity_code": f"{weakest_skill}.foundation",
        "next_step_ref": f"roadmap:{weakest_skill}:7-day-focus",
        "source_note": "System fallback based on stored responses; LLM overview can enrich it.",
    }


def _merge_overview_payload(
    base_payload: dict[str, Any],
    llm_payload: dict[str, Any],
    *,
    source: str,
) -> dict[str, Any]:
    payload = {**base_payload, **llm_payload}
    payload["bands"] = base_payload["bands"]
    payload["sections"] = base_payload["sections"]
    payload["scoring_sources"] = base_payload.get("scoring_sources", {})
    if source == "llm":
        payload["source_note"] = (
            "LLM-generated narrative and recommendations based on stored scores, "
            "response summaries, and feedback artifacts."
        )
    else:
        payload["source_note"] = base_payload["source_note"]
    return payload


def _attempt_response_summary(responses: list[AttemptResponse]) -> list[dict[str, Any]]:
    summary: list[dict[str, Any]] = []
    for response in responses:
        item_payload = _response_payload(response)
        raw_answer = response.raw_answer or {}
        text_answer = raw_answer.get("text_answer")
        summary.append(
            {
                "skill": response.skill,
                "type": response.type,
                "is_correct": response.is_correct,
                "time_ms": response.time_ms,
                "prompt": item_payload.get("prompt"),
                "text_excerpt": text_answer[:700] if isinstance(text_answer, str) else None,
                "audio_duration_seconds": (
                    round(float(response.time_ms or 0) / 1000.0, 1)
                    if response.skill == "speaking"
                    else None
                ),
            }
        )
    return summary


async def _normalise_overview_rows(
    db: AsyncSession,
    attempt: ExamAttempt,
    rows: list[FeedbackArtifact],
) -> list[FeedbackArtifact]:
    overview_rows = [row for row in rows if row.layer == "overview"]
    if not overview_rows:
        return rows

    responses = (
        (
            await db.execute(
                select(AttemptResponse)
                .where(AttemptResponse.attempt_id == attempt.id)
                .order_by(AttemptResponse.section_index.asc(), AttemptResponse.answered_at.asc())
            )
        )
        .scalars()
        .all()
    )
    bands = await _attempt_bands(db, attempt.id)
    base_payload = _build_completion_overview(attempt, list(responses), bands)
    base_payload["scoring_sources"] = await _scoring_source_summary(db, attempt.id)
    changed = False

    for row in overview_rows:
        payload = dict(row.payload or {})
        merged = _merge_overview_payload(base_payload, payload, source=row.source)
        if merged != payload:
            row.payload = merged
            await db.execute(
                update(FeedbackArtifact)
                .where(FeedbackArtifact.id == row.id)
                .values(payload=merged)
            )
            changed = True

    if not changed:
        return rows

    await db.commit()
    wanted_ids = {row.id for row in rows}
    refreshed = (
        await db.execute(
            select(FeedbackArtifact)
            .where(FeedbackArtifact.id.in_(wanted_ids))
            .order_by(FeedbackArtifact.created_at.asc())
        )
    ).scalars().all()
    return refreshed


def _response_payload(response: AttemptResponse) -> dict[str, Any]:
    snapshot = response.item_snapshot or {}
    payload = snapshot.get("payload")
    return payload if isinstance(payload, dict) else {}


def _round_band(value: float) -> float:
    rounded = floor((value * 2.0) + 0.5) / 2.0
    return max(0.0, min(9.0, rounded))


def target_cefr_for_band(target_band: float) -> str:
    if target_band >= 8.0:
        return "C2"
    if target_band >= 7.0:
        return "C1"
    if target_band >= 6.0:
        return "B2"
    if target_band >= 5.0:
        return "B1"
    return "A2"


async def _get_attempt_for_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    attempt_id: UUID,
) -> ExamAttempt:
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
    return attempt


async def _get_response_for_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    response_id: UUID,
) -> tuple[AttemptResponse, ExamAttempt]:
    row = (
        await db.execute(
            select(AttemptResponse, ExamAttempt)
            .join(ExamAttempt, AttemptResponse.attempt_id == ExamAttempt.id)
            .where(AttemptResponse.id == response_id, ExamAttempt.user_id == user_id)
        )
    ).one_or_none()
    if row is None:
        raise NotFoundError(f"Response {response_id} not found")
    return row[0], row[1]


def _artifact_out(row: FeedbackArtifact) -> FeedbackArtifactOut:
    return FeedbackArtifactOut(
        id=row.id,
        attempt_id=row.attempt_id,
        response_id=row.response_id,
        layer=row.layer,
        skill=row.skill,
        payload=row.payload,
        source=row.source,
        model=row.model,
        prompt_version_id=row.prompt_version_id,
        created_at=row.created_at,
    )


async def _attempt_bands(db: AsyncSession, attempt_id: UUID) -> dict[str, float | None]:
    rows = (
        await db.execute(
            select(AttemptResponse.skill, ScoringResult.band)
            .join(ScoringResult, ScoringResult.response_id == AttemptResponse.id)
            .where(AttemptResponse.attempt_id == attempt_id, ScoringResult.band.is_not(None))
        )
    ).all()
    by_skill: dict[str, list[float]] = defaultdict(list)
    for skill, band in rows:
        if band is not None:
            by_skill[str(skill)].append(float(band))
    bands: dict[str, float | None] = {
        skill: _round_band(sum(by_skill[skill]) / len(by_skill[skill]))
        if by_skill.get(skill)
        else None
        for skill in IELTS_SKILLS
    }
    all_bands = [
        band for skill, band in bands.items() if skill in IELTS_SKILLS and band is not None
    ]
    bands["overall"] = _round_band(sum(all_bands) / len(all_bands)) if all_bands else None
    return bands


async def _scoring_source_summary(db: AsyncSession, attempt_id: UUID) -> dict[str, Any]:
    rows = (
        await db.execute(
            select(AttemptResponse.skill, ScoringResult.source, ScoringResult.criteria)
            .join(ScoringResult, ScoringResult.response_id == AttemptResponse.id)
            .where(AttemptResponse.attempt_id == attempt_id)
        )
    ).all()
    summary: dict[str, Any] = {
        skill: {"llm": 0, "objective": 0, "fallback": 0, "other": 0, "methods": []}
        for skill in IELTS_SKILLS
    }
    for skill, source, criteria in rows:
        key = str(skill)
        entry = summary.setdefault(
            key,
            {"llm": 0, "objective": 0, "fallback": 0, "other": 0, "methods": []},
        )
        method = criteria.get("method") if isinstance(criteria, dict) else None
        bucket = _scoring_source_bucket(str(source), method)
        entry[bucket] += 1
        if isinstance(method, str) and method not in entry["methods"]:
            entry["methods"].append(method)
    return summary


def _scoring_source_bucket(source: str, method: Any) -> str:
    if source == "llm":
        return "llm"
    if method == "objective_sync":
        return "objective"
    if isinstance(method, str) and "fallback" in method:
        return "fallback"
    return "other"


async def _top_error_codes(db: AsyncSession, attempt_id: UUID) -> list[dict[str, Any]]:
    artifacts = (
        (
            await db.execute(
                select(FeedbackArtifact)
                .where(
                    FeedbackArtifact.attempt_id == attempt_id,
                    FeedbackArtifact.layer.in_(["sentence", "phoneme"]),
                )
                .order_by(FeedbackArtifact.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    counts: Counter[str] = Counter()
    for artifact in artifacts:
        counts.update(_extract_codes(artifact.payload))
    return [{"code": code, "count": count} for code, count in counts.most_common(5)]


def _extract_codes(value: Any) -> list[str]:
    if isinstance(value, dict):
        codes = [value["code"]] if isinstance(value.get("code"), str) else []
        for child in value.values():
            codes.extend(_extract_codes(child))
        return codes
    if isinstance(value, list):
        found: list[str] = []
        for child in value:
            found.extend(_extract_codes(child))
        return found
    return []


async def _vocabulary_metrics(db: AsyncSession, attempt_id: UUID) -> dict[str, Any]:
    artifacts = (
        (
            await db.execute(
                select(FeedbackArtifact).where(
                    FeedbackArtifact.attempt_id == attempt_id,
                    FeedbackArtifact.layer == "word",
                )
            )
        )
        .scalars()
        .all()
    )
    upgrade_count = 0
    for artifact in artifacts:
        items = artifact.payload.get("items") if isinstance(artifact.payload, dict) else None
        if isinstance(items, list):
            upgrade_count += len(items)
    return {"word_upgrade_count": upgrade_count}


def _sentence_ranges(text: str) -> list[tuple[int, int, str]]:
    ranges: list[tuple[int, int, str]] = []
    for match in re.finditer(r"[^.!?\n]+(?:[.!?]+|$)", text):
        sentence = match.group(0).strip()
        if not sentence:
            continue
        leading_ws = len(match.group(0)) - len(match.group(0).lstrip())
        start = match.start() + leading_ws
        ranges.append((start, match.end(), sentence))
    return ranges or [(0, len(text), text)]


def _detect_basic_sentence_issues(text: str) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for index, (start, end, sentence) in enumerate(_sentence_ranges(text)):
        lowered = sentence.lower()
        if "many of people" in lowered:
            issues.append(
                {
                    "sentence_index": index,
                    "char_range": [start, end],
                    "rule_id": "heuristic_many_of_people",
                    "suggestion": "Use 'many people' instead of 'many of people'.",
                }
            )
        if " in city" in lowered or lowered.endswith(" in city"):
            issues.append(
                {
                    "sentence_index": index,
                    "char_range": [start, end],
                    "rule_id": "heuristic_article_missing",
                    "suggestion": "Use 'in the city' or plural 'in cities'.",
                }
            )
    return issues


def _build_word_stats(text: str) -> list[dict[str, Any]]:
    sentence_ranges = _sentence_ranges(text)
    tokens_by_word: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sentence_index, (sentence_start, _, sentence) in enumerate(sentence_ranges):
        for match in re.finditer(r"[A-Za-z][A-Za-z'-]*", sentence):
            word = match.group(0).lower()
            abs_start = sentence_start + match.start()
            abs_end = sentence_start + match.end()
            tokens_by_word[word].append(
                {
                    "sentence_index": sentence_index,
                    "char_range": [abs_start, abs_end],
                    "context": sentence,
                }
            )

    counts = Counter({word: len(items) for word, items in tokens_by_word.items()})
    candidates = [
        word for word, count in counts.most_common() if count >= 2 or word in GENERIC_WORD_CEFR
    ]
    return [
        {
            "word": word,
            "count": counts[word],
            "cefr": GENERIC_WORD_CEFR.get(word, "B1"),
            "contexts": [item["context"] for item in tokens_by_word[word][:3]],
            "occurrences": [
                {
                    "sentence_index": item["sentence_index"],
                    "char_range": item["char_range"],
                }
                for item in tokens_by_word[word]
            ],
        }
        for word in candidates[:30]
    ]
