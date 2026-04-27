"""HTTP DTOs for exam-platform-api."""

from datetime import date, datetime
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
    next_section_index: int | None = None
    next_skill: str | None = None


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


CefrLevel = Literal["A1", "A2", "B1", "B2", "C1", "C2"]
Severity = Literal["info", "minor", "major"]


class WritingScore(BaseModel):
    """Structured output for `score_writing/ielts`."""

    model_config = ConfigDict(extra="forbid")

    task_response: float = Field(ge=0.0, le=9.0)
    coherence_cohesion: float = Field(ge=0.0, le=9.0)
    lexical_resource: float = Field(ge=0.0, le=9.0)
    grammatical_range_accuracy: float = Field(ge=0.0, le=9.0)
    overall_band: float = Field(ge=0.0, le=9.0)
    evidence_quotes: list[str] = Field(min_length=2, max_length=4)
    feedback_uz: str
    feedback_en: str
    confidence: float = Field(ge=0.0, le=1.0)


class SpeakingAudioMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    duration_seconds: float = Field(ge=0.0)
    wpm: float = Field(ge=0.0)
    pause_ratio: float = Field(ge=0.0, le=1.0)


class SpeakingScore(BaseModel):
    """Structured output for `score_speaking/ielts`."""

    model_config = ConfigDict(extra="forbid")

    transcript: str
    fluency_coherence: float = Field(ge=0.0, le=9.0)
    lexical_resource: float = Field(ge=0.0, le=9.0)
    grammatical_range_accuracy: float = Field(ge=0.0, le=9.0)
    pronunciation: float = Field(ge=0.0, le=9.0)
    overall_band: float = Field(ge=0.0, le=9.0)
    audio_metadata: SpeakingAudioMetadata
    feedback_uz: str
    feedback_en: str
    confidence: float = Field(ge=0.0, le=1.0)


class SentenceIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    span: tuple[int, int]
    severity: Literal["minor", "major"]
    rule_id: str | None = None


class SentenceAnnotation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sentence_index: int = Field(ge=0)
    char_range: tuple[int, int]
    text: str
    issues: list[SentenceIssue] = Field(min_length=1)
    suggested_rewrite_uz: str
    suggested_rewrite_en: str


class SentenceAnnotations(BaseModel):
    model_config = ConfigDict(extra="forbid")

    annotations: list[SentenceAnnotation]


class WordOccurrence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sentence_index: int = Field(ge=0)
    char_range: tuple[int, int]


class WordSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lemma: str
    cefr: CefrLevel
    context: str


class WordUpgradeItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    word: str
    occurrences: list[WordOccurrence] = Field(min_length=1)
    suggestions: list[WordSuggestion] = Field(min_length=1, max_length=4)
    rationale_uz: str
    rationale_en: str


class WordUpgrades(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[WordUpgradeItem] = Field(max_length=15)


class AttemptOverview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    narrative_uz: str
    narrative_en: str
    biggest_opportunity_code: str
    next_step_ref: str


class RoadmapItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["drill", "vocabulary", "mock", "conversation", "pronunciation"]
    ref: str
    minutes: int = Field(gt=0)
    frequency: Literal["daily", "weekly"]


class RoadmapMilestone(BaseModel):
    model_config = ConfigDict(extra="forbid")

    week: int = Field(ge=1)
    theme: str
    skill_focus: list[Literal["listening", "reading", "writing", "speaking"]] = Field(
        min_length=1,
        max_length=2,
    )
    expected_band_lift: float
    items: list[RoadmapItem] = Field(min_length=3, max_length=6)


class DailyTargets(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vocabulary_cards: int = Field(ge=0, le=60)
    drill_minutes: int = Field(ge=0)
    mock_questions: int = Field(ge=0)


class SpacedRepetition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    algorithm: Literal["fsrs"]
    queue_size: int = Field(ge=0)
    stability_target: str


class RoadmapPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    milestones: list[RoadmapMilestone]
    daily_targets: DailyTargets
    spaced_repetition: SpacedRepetition
    unmet_codes: list[str] = Field(default_factory=list)
    narrative_uz: str
    narrative_en: str


class GrammarIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    span: tuple[int, int]
    severity: Severity


class PronunciationIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    word: str
    gop: float | None = Field(default=None, ge=0.0, le=1.0)


class LexisSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    word: str
    alt: str
    cefr: CefrLevel


class ConversationTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_transcript: str
    agent_response_text: str
    fluency_band_estimate: float = Field(ge=3.0, le=9.0)
    grammar_issues: list[GrammarIssue] = Field(default_factory=list, max_length=5)
    pronunciation_issues: list[PronunciationIssue] = Field(default_factory=list)
    lexis_suggestions: list[LexisSuggestion] = Field(default_factory=list)
    encouragement_uz: str
    encouragement_en: str


class FeedbackArtifactOut(BaseModel):
    id: UUID
    attempt_id: UUID
    response_id: UUID | None = None
    layer: str
    skill: str
    payload: dict[str, Any]
    source: str
    model: str | None = None
    prompt_version_id: str | None = None
    created_at: datetime


class AnalyseWritingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_band: float = Field(default=7.0, ge=0.0, le=9.0)
    target_cefr: CefrLevel | None = None
    detected_issues: list[dict[str, Any]] | None = None
    error_taxonomy_codes: list[str] | None = None
    word_stats: list[dict[str, Any]] | None = None


class AttemptFeedbackOut(BaseModel):
    attempt_id: UUID
    artifacts: list[FeedbackArtifactOut]


class ResponseFeedbackOut(BaseModel):
    response_id: UUID
    artifacts: list[FeedbackArtifactOut]


class FeedbackOverviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_band: float = Field(default=7.0, ge=0.0, le=9.0)


class RoadmapRegenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_band: float = Field(default=7.0, ge=0.0, le=9.0)
    target_date: date
    weekly_hours: int = Field(default=5, ge=1, le=40)
    focus_skill: Literal["listening", "reading", "writing", "speaking"] = "writing"
    weeks_until_target: int = Field(default=8, ge=4, le=12)


class RoadmapOut(BaseModel):
    id: UUID
    anchor_attempt_id: UUID | None = None
    target_band: float
    target_date: date
    weekly_hours: int
    current_band_estimate: float | None = None
    predicted_band_at_target: dict[str, Any]
    plan: RoadmapPlan
    status: str
    created_at: datetime
    updated_at: datetime


class TodayRoadmapOut(BaseModel):
    roadmap_id: UUID
    items: list[RoadmapItem]


class SRSCardOut(BaseModel):
    id: UUID
    ref_type: str
    ref_id: str
    payload: dict[str, Any]
    stability: float
    difficulty: float
    due_at: datetime
    reps: int
    lapses: int
    last_grade: str | None = None


class SRSGradeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: UUID
    grade: Literal["again", "hard", "good", "easy"]


class DrillAttemptCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items_total: int = Field(default=0, ge=0)


class DrillAttemptOut(BaseModel):
    id: UUID
    drill_id: UUID
    items_correct: int
    items_total: int
    duration_ms: int | None = None
    started_at: datetime
    completed_at: datetime | None = None


class DrillItemSubmit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    correct: bool
    target_codes: list[str] = Field(default_factory=list, max_length=5)


class DrillAttemptComplete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    duration_ms: int = Field(ge=0)


class MasteryOut(BaseModel):
    code: str
    mastery: float
    last_practiced_at: datetime


class ConversationSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    topic_id: UUID | None = None
    cefr_level: CefrLevel = "B1"
    mode: Literal["async", "realtime"] = "async"


class ConversationSessionOut(BaseModel):
    id: UUID
    topic_id: UUID | None = None
    topic: str
    cefr_level: CefrLevel
    mode: str
    status: str
    started_at: datetime
    ended_at: datetime | None = None


class ConversationTurnCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    audio_base64: str
    audio_format: str = "webm"
    user_audio_s3_key: str | None = None


class ConversationTurnOut(BaseModel):
    id: UUID
    session_id: UUID
    turn_index: int
    user_audio_s3_key: str | None = None
    user_transcript: str
    agent_response_text: str
    agent_audio_url: str | None = None
    feedback: ConversationTurn
    model: str | None = None
    prompt_version_id: str | None = None
    created_at: datetime
