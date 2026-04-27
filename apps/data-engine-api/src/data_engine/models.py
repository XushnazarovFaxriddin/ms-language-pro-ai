"""SQLAlchemy ORM for data_engine schema (Bobomurod's tables)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from languagepro_common.db import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

SCHEMA = "data_engine"


# ---------------------------------------------------------------- taxonomies
class CefrLevel(Base):
    __tablename__ = "cefr_levels"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(4), unique=True)
    descriptor_uz: Mapped[str] = mapped_column(Text)
    descriptor_en: Mapped[str] = mapped_column(Text)
    ord: Mapped[int]


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    name_uz: Mapped[str] = mapped_column(String(64))
    name_en: Mapped[str] = mapped_column(String(64))


# ----------------------------------------------------------------- banks/qs
class QuestionBank(Base):
    __tablename__ = "question_banks"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255))
    owner_user_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    scope: Mapped[str] = mapped_column(String(16), default="private")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    bank_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.question_banks.id", ondelete="RESTRICT")
    )
    type: Mapped[str] = mapped_column(String(48))  # mcq_single, writing_task2, ...
    status: Mapped[str] = mapped_column(String(24), default="draft")
    skill_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.skills.id"))
    cefr_level_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.cefr_levels.id"))
    ielts_band_target: Mapped[Decimal | None] = mapped_column(Numeric(2, 1))

    # Payload + key (split: payload = student-visible, answer_key = key)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    answer_key: Mapped[dict] = mapped_column(JSONB, default=dict)

    # IRT params
    difficulty_b: Mapped[float] = mapped_column(Numeric(8, 4), default=0)
    discrimination_a: Mapped[float] = mapped_column(Numeric(8, 4), default=1.0)
    guessing_c: Mapped[float] = mapped_column(Numeric(4, 3), default=0.25)
    n_responses: Mapped[int] = mapped_column(Integer, default=0)

    # Provenance
    source_license: Mapped[str] = mapped_column(String(64), default="ai_generated")
    generated_by_model: Mapped[str | None] = mapped_column(String(64))
    prompt_version_id: Mapped[str | None] = mapped_column(String(128))
    generation_run_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))

    estimated_seconds: Mapped[int] = mapped_column(Integer, default=60)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class QuestionEmbedding(Base):
    __tablename__ = "question_embeddings"
    __table_args__ = ({"schema": SCHEMA},)
    question_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(f"{SCHEMA}.questions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(768))
    model: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------- generation
class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_user_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    params: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="queued")
    totals: Mapped[dict] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ValidationResult(Base):
    __tablename__ = "validation_results"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    question_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.questions.id", ondelete="CASCADE")
    )
    juror_model: Mapped[str] = mapped_column(String(64))
    verdict: Mapped[str] = mapped_column(String(16))  # approve|reject|borderline
    reasoning: Mapped[str] = mapped_column(Text)
    criteria_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ------------------------------------------------------- practice catalogue
class ErrorTaxonomy(Base):
    __tablename__ = "error_taxonomy"
    __table_args__ = ({"schema": SCHEMA},)

    code: Mapped[str] = mapped_column(String(128), primary_key=True)
    skill: Mapped[str] = mapped_column(String(16))
    layer: Mapped[str] = mapped_column(String(16))
    severity: Mapped[str] = mapped_column(String(16), default="minor")
    explanation_uz: Mapped[str] = mapped_column(Text)
    explanation_en: Mapped[str] = mapped_column(Text)
    example_correct: Mapped[str | None] = mapped_column(Text)
    example_wrong: Mapped[str | None] = mapped_column(Text)
    recommended_drill_ids: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)


class Drill(Base):
    __tablename__ = "drills"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(128), unique=True)
    skill: Mapped[str] = mapped_column(String(16))
    target_codes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    cefr_level: Mapped[str] = mapped_column(String(4))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    variant_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ConversationTopic(Base):
    __tablename__ = "conversation_topics"
    __table_args__ = ({"schema": SCHEMA},)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(128), unique=True)
    title_uz: Mapped[str] = mapped_column(String(255))
    title_en: Mapped[str] = mapped_column(String(255))
    prompt: Mapped[str] = mapped_column(Text)
    cefr_level: Mapped[str] = mapped_column(String(4))
    kind: Mapped[str] = mapped_column(String(32), default="daily")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------------------------------------- blueprint
class ExamBlueprint(Base):
    __tablename__ = "exam_blueprints"
    __table_args__ = ({"schema": SCHEMA},)
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    sections: Mapped[list] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------------------------------------- analytics
class LLMCall(Base):
    """analytics.llm_calls — written by every LLMRouter call."""

    __tablename__ = "llm_calls"
    __table_args__ = ({"schema": "analytics"},)

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
