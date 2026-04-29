"""Async AI conversation partner backend."""

from __future__ import annotations

import base64
import binascii
from uuid import UUID

from languagepro_common.errors import ConflictError, NotFoundError, ValidationError
from languagepro_common.logging import get_logger
from languagepro_llm import LLMRequest, LLMRouter
from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.models import ConversationSession, ConversationTurnRecord
from exam_platform.schemas import (
    ConversationSessionCreate,
    ConversationSessionOut,
    ConversationTurn,
    ConversationTurnCreate,
    ConversationTurnOut,
)

log = get_logger(__name__)
SUPPORTED_LLM_AUDIO_FORMATS = {"wav", "mp3"}


async def start_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    body: ConversationSessionCreate,
) -> ConversationSessionOut:
    session = ConversationSession(
        user_id=user_id,
        topic_id=body.topic_id,
        topic=body.topic,
        cefr_level=body.cefr_level,
        mode=body.mode,
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _session_out(session)


async def end_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    session_id: UUID,
) -> ConversationSessionOut:
    session = await _get_session(db, user_id=user_id, session_id=session_id)
    await db.execute(
        update(ConversationSession)
        .where(ConversationSession.id == session.id)
        .values(status="completed", ended_at=func.now())
    )
    await db.commit()
    session = await _get_session(db, user_id=user_id, session_id=session_id)
    return _session_out(session)


async def add_turn(
    db: AsyncSession,
    router: LLMRouter,
    *,
    user_id: UUID,
    session_id: UUID,
    body: ConversationTurnCreate,
) -> ConversationTurnOut:
    session = await _get_session(db, user_id=user_id, session_id=session_id)
    if session.status != "active":
        raise ConflictError(f"Conversation session is {session.status}")

    try:
        audio_bytes = base64.b64decode(body.audio_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValidationError("audio_base64 is not valid base64") from exc
    if not audio_bytes:
        raise ValidationError("audio_base64 must not be empty")

    prior_turns = [
        {
            "user_transcript": row.user_transcript,
            "agent_response_text": row.agent_response_text,
        }
        for row in (
            await db.execute(
                select(ConversationTurnRecord)
                .where(ConversationTurnRecord.session_id == session.id)
                .order_by(ConversationTurnRecord.turn_index.asc())
            )
        ).scalars()
    ]
    turn_index = len(prior_turns)

    audio_format = _normalise_audio_format(body.audio_format)
    raw_response: dict | None = None
    model: str | None = None
    prompt_version_id: str | None = None
    if audio_format in SUPPORTED_LLM_AUDIO_FORMATS:
        try:
            resp = await router.complete(
                LLMRequest(
                    purpose="conversation_turn",
                    prompt_id="conversation_turn/turn",
                    variables={
                        "topic": session.topic,
                        "prior_turns": prior_turns,
                        "user_locale": body.user_locale,
                        "cefr_level": session.cefr_level,
                    },
                    audio_input=audio_bytes,
                    audio_format=audio_format,
                    user_id=user_id,
                )
            )
            if resp.parsed is None:
                raise ValidationError("Conversation turn response did not match schema")
            feedback = ConversationTurn.model_validate(resp.parsed)
            raw_response = resp.parsed
            model = resp.model
            prompt_version_id = resp.prompt_version_id
        except Exception as exc:
            log.warning(
                "conversation_turn_llm_failed_using_fallback",
                session_id=str(session.id),
                turn_index=turn_index,
                audio_format=audio_format,
                error=str(exc),
            )
            feedback = _fallback_turn(session.topic, session.cefr_level, turn_index, audio_bytes)
            raw_response = feedback.model_dump(mode="json") | {
                "fallback_reason": str(exc),
            }
            model = "system-fallback"
    else:
        log.warning(
            "conversation_turn_unsupported_audio_format_using_fallback",
            session_id=str(session.id),
            turn_index=turn_index,
            audio_format=body.audio_format,
        )
        feedback = _fallback_turn(session.topic, session.cefr_level, turn_index, audio_bytes)
        raw_response = feedback.model_dump(mode="json") | {
            "fallback_reason": f"Unsupported audio format: {body.audio_format}",
        }
        model = "system-fallback"

    turn_id = (
        await db.execute(
            insert(ConversationTurnRecord)
            .values(
                session_id=session.id,
                turn_index=turn_index,
                user_audio_s3_key=body.user_audio_s3_key,
                user_transcript=feedback.user_transcript,
                agent_response_text=feedback.agent_response_text,
                feedback=feedback.model_dump(mode="json"),
                raw_response=raw_response or feedback.model_dump(mode="json"),
                model=model,
                prompt_version_id=prompt_version_id,
            )
            .returning(ConversationTurnRecord.id)
        )
    ).scalar_one()
    await db.commit()
    row = (
        await db.execute(select(ConversationTurnRecord).where(ConversationTurnRecord.id == turn_id))
    ).scalar_one()
    return _turn_out(row)


async def _get_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    session_id: UUID,
) -> ConversationSession:
    session = (
        await db.execute(
            select(ConversationSession).where(
                ConversationSession.id == session_id,
                ConversationSession.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if session is None:
        raise NotFoundError(f"Conversation session {session_id} not found")
    return session


def _normalise_audio_format(audio_format: str) -> str:
    value = audio_format.lower().strip()
    if "/" in value:
        value = value.rsplit("/", 1)[-1]
    if ";" in value:
        value = value.split(";", 1)[0]
    if value in {"x-wav", "wave"}:
        return "wav"
    if value in {"mpeg", "mp3"}:
        return "mp3"
    return value


def _fallback_turn(
    topic: str,
    cefr_level: str,
    turn_index: int,
    audio_bytes: bytes,
) -> ConversationTurn:
    transcript = (
        f"Audio response received ({len(audio_bytes)} bytes). "
        "Automatic transcript is unavailable in fallback mode."
    )
    follow_ups = {
        "A1": f"Thanks. Can you say one more simple sentence about {topic}?",
        "A2": f"Thanks for sharing. What is one thing you like about {topic}?",
        "B1": f"Good, let's continue. Can you give one clear example about {topic}?",
        "B2": f"Interesting. What is the main advantage or disadvantage of {topic} in your view?",
        "C1": f"That is a useful start. How would you compare two perspectives on {topic}?",
        "C2": f"Let's push the idea further. What nuance or trade-off matters most in {topic}?",
    }
    return ConversationTurn(
        user_transcript=transcript,
        agent_response_text=follow_ups.get(cefr_level, follow_ups["B1"]),
        fluency_band_estimate=5.0 if turn_index == 0 else 5.5,
        grammar_issues=[],
        pronunciation_issues=[],
        lexis_suggestions=[],
        encouragement_uz=(
            "Audio saqlandi. Keyingi javobda fikringizni 2-3 sabab bilan kengaytiring."
        ),
        encouragement_en=(
            "Your audio was saved. In the next response, expand your idea with 2-3 reasons."
        ),
    )


async def get_session_with_turns(
    db: AsyncSession,
    *,
    user_id: UUID,
    session_id: UUID,
) -> tuple[ConversationSessionOut, list[ConversationTurnOut]]:
    session = await _get_session(db, user_id=user_id, session_id=session_id)
    rows = (
        await db.execute(
            select(ConversationTurnRecord)
            .where(ConversationTurnRecord.session_id == session.id)
            .order_by(ConversationTurnRecord.turn_index.asc())
        )
    ).scalars().all()
    return _session_out(session), [_turn_out(r) for r in rows]


async def get_active_session(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> tuple[ConversationSessionOut, list[ConversationTurnOut]] | None:
    """Most recent active session for the user, with all of its turns."""
    session = (
        await db.execute(
            select(ConversationSession)
            .where(
                ConversationSession.user_id == user_id,
                ConversationSession.status == "active",
            )
            .order_by(ConversationSession.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if session is None:
        return None
    rows = (
        await db.execute(
            select(ConversationTurnRecord)
            .where(ConversationTurnRecord.session_id == session.id)
            .order_by(ConversationTurnRecord.turn_index.asc())
        )
    ).scalars().all()
    return _session_out(session), [_turn_out(r) for r in rows]


def _session_out(row: ConversationSession) -> ConversationSessionOut:
    return ConversationSessionOut(
        id=row.id,
        topic_id=row.topic_id,
        topic=row.topic,
        cefr_level=row.cefr_level,
        mode=row.mode,
        status=row.status,
        started_at=row.started_at,
        ended_at=row.ended_at,
    )


def _turn_out(row: ConversationTurnRecord) -> ConversationTurnOut:
    feedback = ConversationTurn.model_validate(row.feedback)
    return ConversationTurnOut(
        id=row.id,
        session_id=row.session_id,
        turn_index=row.turn_index,
        user_audio_s3_key=row.user_audio_s3_key,
        user_transcript=row.user_transcript,
        agent_response_text=row.agent_response_text,
        agent_audio_url=row.agent_audio_url,
        feedback=feedback,
        model=row.model,
        prompt_version_id=row.prompt_version_id,
        created_at=row.created_at,
    )
