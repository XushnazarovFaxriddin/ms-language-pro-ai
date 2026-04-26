"""SQLAlchemy ORM for exam_platform schema (Faxriddin's tables)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from languagepro_common.db import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
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
