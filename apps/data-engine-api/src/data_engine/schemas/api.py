"""Pydantic DTOs for HTTP request/response."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from data_engine.schemas.llm_io import DrillDraft, ListeningPassage


# -------- items (S2S consumed by exam-platform) --------
class ItemPayload(BaseModel):
    """Student-visible payload (no answer key)."""

    model_config = ConfigDict(extra="allow")
    passage: str | None = None
    prompt: str | None = None
    options: list[dict[str, str]] | None = None  # [{id, label}]
    audio_url: str | None = None


class ItemOut(BaseModel):
    id: UUID
    type: str
    skill: str
    cefr_level: str
    payload: ItemPayload
    estimated_seconds: int


class NextItemOut(BaseModel):
    item: ItemOut
    selection_metadata: dict[str, Any] = Field(default_factory=dict)


class AnswerKeyOut(BaseModel):
    """Returned by S2S /items/{id}/key — never to browsers."""

    correct_option_id: str | None = None
    rationale: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class ResponseEventIn(BaseModel):
    """POST /items/{id}/response — S2S empirical data."""

    attempt_id: UUID
    user_theta_at_answer: float
    is_correct: bool | None
    partial_credit: float | None = None
    time_ms: int


# -------- generation (admin) --------
class GenerationJobCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    skill: Literal["reading", "listening", "writing", "speaking"]
    cefr_level: Literal["A2", "B1", "B2", "C1", "C2"]
    topic: str
    count: int = Field(ge=1, le=200)
    bank_id: UUID | None = None


class GenerationJobOut(BaseModel):
    id: UUID
    status: str
    params: dict[str, Any]
    totals: dict[str, Any]
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class DrillGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_codes: list[str] = Field(min_length=1, max_length=2)
    cefr_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    drill_type: str
    item_count: int = Field(default=8, ge=3, le=20)


class DrillGenerateOut(BaseModel):
    draft: DrillDraft
    model: str
    prompt_version_id: str | None = None


class ListeningPassageGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    part: int = Field(ge=1, le=4)
    cefr_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    topic: str
    duration_target_seconds: int = Field(ge=30, le=900)


class ListeningPassageGenerateOut(BaseModel):
    passage: ListeningPassage
    model: str
    prompt_version_id: str | None = None


# -------- practice catalogue (admin) --------
class ErrorTaxonomyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    skill: str = Field(min_length=1, max_length=32)
    layer: str = Field(min_length=1, max_length=32)
    severity: Literal["info", "minor", "major"] = "minor"
    explanation_uz: str
    explanation_en: str
    example_correct: str | None = None
    example_wrong: str | None = None
    recommended_drill_ids: list[str] = Field(default_factory=list)


class ErrorTaxonomyPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skill: str | None = Field(default=None, min_length=1, max_length=32)
    layer: str | None = Field(default=None, min_length=1, max_length=32)
    severity: Literal["info", "minor", "major"] | None = None
    explanation_uz: str | None = None
    explanation_en: str | None = None
    example_correct: str | None = None
    example_wrong: str | None = None
    recommended_drill_ids: list[str] | None = None


class ErrorTaxonomyOut(ErrorTaxonomyIn):
    pass


class DrillIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    skill: str = Field(min_length=1, max_length=32)
    target_codes: list[str] = Field(default_factory=list)
    cefr_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    duration_minutes: int = Field(ge=3, le=30)
    payload: dict[str, Any] = Field(default_factory=dict)
    variant_count: int = Field(default=1, ge=1)


class DrillPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = None
    skill: str | None = Field(default=None, min_length=1, max_length=32)
    target_codes: list[str] | None = None
    cefr_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"] | None = None
    duration_minutes: int | None = Field(default=None, ge=3, le=30)
    payload: dict[str, Any] | None = None
    variant_count: int | None = Field(default=None, ge=1)


class DrillOut(DrillIn):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ConversationTopicIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    title_uz: str
    title_en: str
    prompt: str
    cefr_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    kind: str = "daily"
    is_active: bool = True


class ConversationTopicPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = None
    title_uz: str | None = None
    title_en: str | None = None
    prompt: str | None = None
    cefr_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"] | None = None
    kind: str | None = None
    is_active: bool | None = None


class ConversationTopicOut(ConversationTopicIn):
    id: UUID
    created_at: datetime


# -------- blueprints --------
class ExamBlueprintOut(BaseModel):
    id: UUID
    code: str
    name_uz: str
    name_en: str
    sections: list[dict[str, Any]]


# -------- LLM usage analytics summary --------
class LLMUsageSummary(BaseModel):
    period: str  # "24h" | "7d" | "30d"
    total_cost_usd: Decimal
    total_calls: int
    total_tokens_in: int
    total_tokens_out: int
    avg_latency_p50_ms: int
    avg_latency_p95_ms: int
