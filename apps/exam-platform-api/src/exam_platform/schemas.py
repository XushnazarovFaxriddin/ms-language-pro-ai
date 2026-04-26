"""HTTP DTOs for exam-platform-api."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StartAttemptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    blueprint_code: str
    locale: Literal["uz", "en"] = "uz"


class ItemView(BaseModel):
    """Student-visible item (no answer key)."""

    id: UUID
    type: str
    skill: str
    cefr_level: str
    payload: dict[str, Any]
    estimated_seconds: int


class StartAttemptResponse(BaseModel):
    attempt_id: UUID
    blueprint_snapshot: dict[str, Any]
    current_section_index: int
    current_item: ItemView | None


class NextItemResponse(BaseModel):
    current_section_index: int
    current_item: ItemView | None


class SubmitResponseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    item_id: UUID
    type: str
    mcq_choice_id: str | None = None
    text_answer: str | None = None
    audio_s3_key: str | None = None
    time_ms: int = Field(ge=0)


class SubmitResponseOut(BaseModel):
    response_id: UUID
    graded_synchronously: bool
    is_correct: bool | None = None
    next_item: ItemView | None = None
    section_complete: bool = False
    attempt_complete: bool = False


class AttemptOut(BaseModel):
    id: UUID
    state: str
    blueprint_snapshot: dict[str, Any]
    current_section_index: int
    current_item: ItemView | None = None
    theta_estimates: dict[str, float]
    started_at: datetime
    finished_at: datetime | None

class AttemptListItem(BaseModel):
    id: UUID
    exam_id: UUID
    exam_name_uz: str
    exam_name_en: str
    blueprint_code: str
    state: str
    score: float | None = None
    started_at: datetime
    finished_at: datetime | None = None
