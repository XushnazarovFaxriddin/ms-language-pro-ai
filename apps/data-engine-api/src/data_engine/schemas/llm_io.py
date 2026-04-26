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
