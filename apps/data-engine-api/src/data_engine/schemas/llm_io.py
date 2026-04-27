"""Pydantic schemas for LLM structured I/O."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class QuestionOption(BaseModel):
    id: Literal["A", "B", "C", "D"]
    label: str


class QuestionDraft(BaseModel):
    """Output of `generate_question/mcq_reading`."""

    model_config = ConfigDict(extra="forbid")

    passage: str
    prompt: str
    options: list[QuestionOption] = Field(min_length=4, max_length=4)
    correct_option_id: Literal["A", "B", "C", "D"]
    distractor_rationale: dict[str, str]
    difficulty_self_rating: int = Field(ge=1, le=9)
    estimated_seconds: int = Field(default=60, ge=10, le=600)


class JuryVerdict(BaseModel):
    """Output of `validate_question`."""

    model_config = ConfigDict(extra="forbid")

    verdict: Literal["approve", "reject", "borderline"]
    reasoning: str
    criteria_scores: dict[str, int]


class CefrClassification(BaseModel):
    """Output of `classify_cefr`."""

    model_config = ConfigDict(extra="forbid")

    actual_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str


class DrillItem(BaseModel):
    """Single generated practice drill item."""

    model_config = ConfigDict(extra="forbid")

    id: int = Field(ge=1)
    given: str
    instruction_inline: str | None = None
    target_codes: list[str] = Field(min_length=1)
    accepted: list[str] = Field(min_length=1)
    tolerance: Literal["exact", "lev<=1", "lev<=2"] = "lev<=1"


class DrillDraft(BaseModel):
    """Output of `drill/generate`."""

    model_config = ConfigDict(extra="forbid")

    type: str
    instruction_uz: str
    instruction_en: str
    items: list[DrillItem] = Field(min_length=1)
    duration_minutes: int = Field(ge=3, le=30)


class TranscriptTurn(BaseModel):
    """One speaker turn in a generated listening passage."""

    model_config = ConfigDict(extra="forbid")

    speaker: str
    voice_hint: Literal["Kore", "Puck", "Aoede", "Charon", "Fenrir", "Orus", "Zephyr"]
    text: str


class ListeningPassage(BaseModel):
    """Output of `generate_question/listening_passage`."""

    model_config = ConfigDict(extra="forbid")

    part: int = Field(ge=1, le=4)
    title: str
    turns: list[TranscriptTurn] = Field(min_length=1)
    estimated_duration_seconds: int = Field(gt=0)
    accent_hint: Literal["en-US", "en-GB", "en-AU"] = "en-US"
