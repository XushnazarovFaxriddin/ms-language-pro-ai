# `validate_question/generic/v1`

**Purpose**: serve as one juror in the multi-jury validation panel. Three independent calls (different model profiles) vote on each generated question. See [`../06-ai-pipelines.md`](../06-ai-pipelines.md) §6.

**Profiles**:
- juror 1 — `LLM_PROFILE_VALIDATE_QUESTION` (default `gemini-2.5-flash:0.0`)
- juror 2 — `LLM_PROFILE_VALIDATE_QUESTION_JURY_2` (`gemini-2.0-flash:0.0`)
- juror 3 — `LLM_PROFILE_VALIDATE_QUESTION_JURY_3` (`gemini-2.5-pro:0.0`)

**Response schema**: `data_engine.schemas.JuryVerdict`.

## Decision rule (downstream)

| Approves | Final status |
|---|---|
| 3/3 | `approved` |
| 2/3 | `in_review` (human admin reviews) |
| ≤1/3 | `rejected_jury` |

## Runtime YAML

```yaml
purpose: validate_question
sub_purpose: generic
version: 1
status: active
description: |
  One juror in the multi-jury panel. Reviews a generated MCQ for publication.
  Returns verdict + reasoning + per-criterion 1-5 scores.

variables_schema:
  question_payload: { type: object }
  answer_key: { type: object }
  target_cefr: { type: string }

response_schema_ref: data_engine.schemas.JuryVerdict

system: |
  You are an IELTS examiner reviewing a single MCQ for publication.
  Reject if any are violated:
    - Linguistic correctness (grammar, register).
    - Single unambiguous correct answer.
    - Distractors plausible but clearly wrong.
    - Target CEFR level matches text complexity.
    - No cultural / political / religious sensitivity.
    - No duplicate phrasing between stem and options.
  Output JSON only.

user: |
  Question to review:
    Passage: {{ question_payload.passage }}
    Prompt: {{ question_payload.prompt }}
    Options:
      A: {{ question_payload.options[0].label }}
      B: {{ question_payload.options[1].label }}
      C: {{ question_payload.options[2].label }}
      D: {{ question_payload.options[3].label }}
    Stated correct answer: {{ answer_key.correct_option_id }}
    Target CEFR: {{ target_cefr }}

  Return JSON:
  {
    "verdict": "approve" | "reject" | "borderline",
    "reasoning": "one paragraph",
    "criteria_scores": {
      "grammar": 1-5,
      "single_answer": 1-5,
      "distractor_quality": 1-5,
      "cefr_match": 1-5,
      "sensitivity": 1-5
    }
  }
```

## Pydantic schema

```python
class JuryVerdict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verdict: Literal["approve", "reject", "borderline"]
    reasoning: str
    criteria_scores: dict[str, int]
```
