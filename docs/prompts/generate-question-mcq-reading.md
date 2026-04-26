# `generate_question/mcq_reading/v1`

**Purpose**: produce one IELTS-style 4-option MCQ reading item at a target CEFR level on a given topic. Used by the generation pipeline ([`../06-ai-pipelines.md`](../06-ai-pipelines.md) §5).

**Model profile**: `LLM_PROFILE_GENERATE_QUESTION` (default `gemini-2.5-pro:0.7`).
**Response schema**: `data_engine.schemas.QuestionDraft`.

## Failure modes

- **Copying real IELTS passages** — illegal. Mitigate by saying "original, not from any source".
- **Two correct answers** — common. Mitigate by asking for distractor rationale per option.
- **Sensitive topics** — mitigate by enumerating exclusions.
- **Mismatched CEFR level** — handled by downstream classifier; we still ask the model to self-rate.

## Runtime YAML (`prompts/generate_question/mcq_reading/v1.yaml`)

```yaml
purpose: generate_question
sub_purpose: mcq_reading
version: 1
status: active
description: |
  Generate ONE IELTS-style multiple-choice reading question. Returns passage,
  prompt, 4 options A-D, correct answer id, distractor rationale per option,
  difficulty self-rating (1-9), and CEFR target.

variables_schema:
  topic: { type: string }
  cefr_level: { type: string, enum: [A2, B1, B2, C1, C2] }

response_schema_ref: data_engine.schemas.QuestionDraft

system: |
  You are an expert IELTS Academic Reading author. You write authentic, CEFR-aligned,
  single-correct-answer multiple-choice questions. Output JSON only.

  Rules:
  - Passage 80-180 words, original (do NOT copy from any real source).
  - Single unambiguous correct answer.
  - 3 plausible distractors that test misreading, scope, or detail-confusion.
  - distractor_rationale must explain WHY each option is correct or wrong (1 sentence each).
  - Vocabulary and syntax appropriate for the target CEFR level.
  - difficulty_self_rating: 1 (easiest) to 9 (hardest).
  - estimated_seconds: a reasonable answer-time for this item (15-180).
  - No proper nouns of real people. No politics, religion, sex, violence, drugs,
    medical advice. No content disparaging any nationality, language, or group.

user: |
  Generate one MCQ for IELTS Reading.

  Topic: {{ topic }}
  Target CEFR level: {{ cefr_level }}

  Return JSON exactly matching:
  {
    "passage": "...",
    "prompt": "...",
    "options": [
      {"id": "A", "label": "..."},
      {"id": "B", "label": "..."},
      {"id": "C", "label": "..."},
      {"id": "D", "label": "..."}
    ],
    "correct_option_id": "A|B|C|D",
    "distractor_rationale": {
      "A": "why right or wrong",
      "B": "...",
      "C": "...",
      "D": "..."
    },
    "difficulty_self_rating": 1-9,
    "estimated_seconds": 15-180
  }
```

## Pydantic schema (mirror)

```python
class QuestionOption(BaseModel):
    id: Literal["A", "B", "C", "D"]
    label: str

class QuestionDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")
    passage: str
    prompt: str
    options: list[QuestionOption] = Field(min_length=4, max_length=4)
    correct_option_id: Literal["A", "B", "C", "D"]
    distractor_rationale: dict[str, str]
    difficulty_self_rating: int = Field(ge=1, le=9)
    estimated_seconds: int = Field(ge=15, le=180)
```
