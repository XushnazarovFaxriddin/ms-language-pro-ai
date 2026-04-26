"""Pydantic DTOs for HTTP request/response."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
