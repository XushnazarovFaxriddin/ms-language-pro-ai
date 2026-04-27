"""Async AI conversation partner backend."""

from __future__ import annotations

import base64
from uuid import UUID

from languagepro_common.errors import ConflictError, NotFoundError, ValidationError
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
    except ValueError as exc:
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

    resp = await router.complete(
        LLMRequest(
            purpose="score_speaking",
            prompt_id="score_speaking/conversation_turn",
            variables={
                "topic": session.topic,
                "prior_turns": prior_turns,
                "user_locale": "uz",
                "cefr_level": session.cefr_level,
            },
            audio_input=audio_bytes,
            audio_format=body.audio_format,
            user_id=user_id,
        )
    )
    if resp.parsed is None:
        raise ValidationError("Conversation turn response did not match schema")
    feedback = ConversationTurn.model_validate(resp.parsed)

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
                raw_response=resp.parsed,
                model=resp.model,
                prompt_version_id=resp.prompt_version_id,
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
