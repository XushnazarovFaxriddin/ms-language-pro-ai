"""SQLAlchemy ORM for exam_platform schema (Faxriddin's tables)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import ClassVar
from uuid import UUID, uuid4

from languagepro_common.db import Base
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

SCHEMA = "exam_platform"


class Exam(Base):
    __tablename__ = "exams"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    blueprint_code: Mapped[str] = mapped_column(String(64), unique=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))
    exam_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.exams.id", ondelete="RESTRICT")
    )
    blueprint_snapshot: Mapped[dict] = mapped_column(JSONB)
    state: Mapped[str] = mapped_column(String(16), default="in_progress")
    current_section_index: Mapped[int] = mapped_column(Integer, default=0)
    current_item_snapshot: Mapped[dict | None] = mapped_column(JSONB)
    current_item_issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    theta_estimates: Mapped[dict] = mapped_column(JSONB, default=dict)
    theta_se: Mapped[dict] = mapped_column(JSONB, default=dict)
    locale: Mapped[str] = mapped_column(String(8), default="uz")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AttemptResponse(Base):
    __tablename__ = "attempt_responses"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    attempt_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.exam_attempts.id", ondelete="CASCADE")
    )
    section_index: Mapped[int] = mapped_column(Integer)
    item_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))  # external (data_engine)
    item_snapshot: Mapped[dict] = mapped_column(JSONB)  # frozen at view time, no answer key
    type: Mapped[str] = mapped_column(String(48))
    raw_answer: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    partial_credit: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    theta_at_answer: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=0)
    skill: Mapped[str] = mapped_column(String(16))
    time_ms: Mapped[int] = mapped_column(Integer, default=0)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AudioRecording(Base):
    __tablename__ = "audio_recordings"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    response_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.attempt_responses.id", ondelete="CASCADE")
    )
    s3_key: Mapped[str] = mapped_column(String(512))
    duration_seconds: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    bytes: Mapped[int | None] = mapped_column(Integer)
    format: Mapped[str] = mapped_column(String(32), default="audio/webm")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LLMScoringRun(Base):
    __tablename__ = "llm_scoring_runs"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    response_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.attempt_responses.id", ondelete="CASCADE")
    )
    rubric_ref: Mapped[str | None] = mapped_column(String(128))
    model: Mapped[str] = mapped_column(String(64))
    prompt_version_id: Mapped[str | None] = mapped_column(String(128))
    raw_response: Mapped[dict] = mapped_column(JSONB, default=dict)
    criteria_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    overall_band: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    cost_cents: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScoringResult(Base):
    __tablename__ = "scoring_results"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    response_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(f"{SCHEMA}.attempt_responses.id", ondelete="CASCADE"),
        unique=True,
    )
    source: Mapped[str] = mapped_column(String(16), default="llm")  # llm|human|hybrid
    band: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    criteria: Mapped[dict] = mapped_column(JSONB, default=dict)
    feedback_uz: Mapped[str | None] = mapped_column(Text)
    feedback_en: Mapped[str | None] = mapped_column(Text)
    finalized_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FeedbackArtifact(Base):
    __tablename__ = "feedback_artifacts"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    attempt_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.exam_attempts.id", ondelete="CASCADE")
    )
    response_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.attempt_responses.id", ondelete="CASCADE")
    )
    layer: Mapped[str] = mapped_column(String(24))
    skill: Mapped[str] = mapped_column(String(16))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    source: Mapped[str] = mapped_column(String(16), default="llm")
    model: Mapped[str | None] = mapped_column(String(64))
    prompt_version_id: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Roadmap(Base):
    __tablename__ = "roadmaps"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))
    anchor_attempt_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.exam_attempts.id", ondelete="SET NULL")
    )
    target_band: Mapped[Decimal] = mapped_column(Numeric(3, 1))
    target_date: Mapped[date] = mapped_column(Date)
    weekly_hours: Mapped[int] = mapped_column(Integer)
    current_band_estimate: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    predicted_band_at_target: Mapped[dict] = mapped_column(JSONB, default=dict)
    plan: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SRSCard(Base):
    __tablename__ = "srs_cards"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))
    ref_type: Mapped[str] = mapped_column(String(32))
    ref_id: Mapped[str] = mapped_column(String(128))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    stability: Mapped[Decimal] = mapped_column(Numeric(8, 3), default=Decimal("1.0"))
    difficulty: Mapped[Decimal] = mapped_column(Numeric(8, 3), default=Decimal("5.0"))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reps: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    last_grade: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DrillAttempt(Base):
    __tablename__ = "drill_attempts"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))
    drill_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))
    items_correct: Mapped[int] = mapped_column(Integer, default=0)
    items_total: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserMastery(Base):
    __tablename__ = "user_mastery"
    __table_args__ = ({"schema": SCHEMA},)

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    code: Mapped[str] = mapped_column(String(128), primary_key=True)
    mastery: Mapped[Decimal] = mapped_column(Numeric(4, 3), default=Decimal("0.0"))
    last_practiced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True))
    topic_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    topic: Mapped[str] = mapped_column(Text)
    cefr_level: Mapped[str] = mapped_column(String(4), default="B1")
    mode: Mapped[str] = mapped_column(String(16), default="async")
    status: Mapped[str] = mapped_column(String(16), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ConversationTurnRecord(Base):
    __tablename__ = "conversation_turns"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(f"{SCHEMA}.conversation_sessions.id", ondelete="CASCADE"),
    )
    turn_index: Mapped[int] = mapped_column(Integer)
    user_audio_s3_key: Mapped[str | None] = mapped_column(String(512))
    user_transcript: Mapped[str] = mapped_column(Text)
    agent_response_text: Mapped[str] = mapped_column(Text)
    agent_audio_url: Mapped[str | None] = mapped_column(Text)
    feedback: Mapped[dict] = mapped_column(JSONB, default=dict)
    raw_response: Mapped[dict] = mapped_column(JSONB, default=dict)
    model: Mapped[str | None] = mapped_column(String(64))
    prompt_version_id: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LLMCall(Base):
    """analytics.llm_calls mirror for exam-platform cost logging."""

    __tablename__ = "llm_calls"
    __table_args__: ClassVar = {"schema": "analytics", "extend_existing": True}

    request_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    service: Mapped[str] = mapped_column(String(32))
    purpose: Mapped[str] = mapped_column(String(64))
    user_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    attempt_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    question_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    provider: Mapped[str] = mapped_column(String(32), default="gemini")
    model: Mapped[str] = mapped_column(String(64))
    prompt_version_id: Mapped[str | None] = mapped_column(String(128))
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="success")
    error_class: Mapped[str | None] = mapped_column(String(128))
