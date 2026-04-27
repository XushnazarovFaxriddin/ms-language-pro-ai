"""Layered feedback generation and retrieval."""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any
from uuid import UUID

from languagepro_common.errors import NotFoundError, ValidationError
from languagepro_llm import LLMRequest, LLMRouter
from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.models import AttemptResponse, ExamAttempt, FeedbackArtifact
from exam_platform.schemas import (
    AnalyseWritingRequest,
    AttemptOverview,
    FeedbackArtifactOut,
    FeedbackOverviewRequest,
    SentenceAnnotations,
    WordUpgrades,
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
    return [_artifact_out(row) for row in (await db.execute(stmt)).scalars().all()]


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
        stmt = (
            select(FeedbackArtifact)
            .where(
                FeedbackArtifact.attempt_id == attempt_id,
                FeedbackArtifact.layer.in_(["band", "criterion", "overview"]),
            )
            .order_by(FeedbackArtifact.created_at.asc())
        )
        results.append(
            (attempt_id, [_artifact_out(row) for row in (await db.execute(stmt)).scalars().all()])
        )
    return results


async def generate_attempt_overview(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    attempt_id: UUID,
    body: FeedbackOverviewRequest,
) -> FeedbackArtifactOut:
    attempt = await _get_attempt_for_user(db, user_id=user_id, attempt_id=attempt_id)
    bands = await _attempt_bands(db, attempt.id)
    top_error_codes = await _top_error_codes(db, attempt.id)
    vocabulary_metrics = await _vocabulary_metrics(db, attempt.id)

    overview_resp = await router.complete(
        LLMRequest(
            purpose="feedback",
            prompt_id="feedback/overview",
            variables={
                "bands": bands,
                "top_error_codes": top_error_codes,
                "vocabulary_metrics": vocabulary_metrics,
                "target_band": body.target_band,
                "user_locale": attempt.locale,
            },
            user_id=user_id,
            attempt_id=attempt.id,
        )
    )
    if overview_resp.parsed is None:
        raise ValidationError("Feedback overview response did not match schema")
    overview = AttemptOverview.model_validate(overview_resp.parsed)

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
                payload=overview.model_dump(mode="json"),
                source="llm",
                model=overview_resp.model,
                prompt_version_id=overview_resp.prompt_version_id,
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
    from exam_platform.models import ScoringResult

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
        skill: round(sum(values) / len(values), 1) if values else None
        for skill, values in by_skill.items()
    }
    all_bands = [band for band in bands.values() if band is not None]
    bands["overall"] = round(sum(all_bands) / len(all_bands), 1) if all_bands else None
    return bands


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
