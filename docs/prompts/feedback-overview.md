# `feedback/overview/v1`

**Purpose**: compose the human-readable, bilingual narrative summary that wraps the layered feedback at the end of an attempt. The user sees this just below the band ring on the results page.

**Model profile**: `LLM_PROFILE_FEEDBACK_UZ` (default `gemini-2.5-pro:0.4`).
**Response schema**: `exam_platform.schemas.AttemptOverview`.

## Why a wrapper

L1 (band) and L2 (criterion) come from `score_writing` / `score_speaking`. We need an additional pass that:

- weaves the four skills into one narrative (not 4 disconnected paragraphs),
- highlights the **single biggest opportunity** for improvement,
- ends on a forward-looking note tied to the Roadmap,
- is short — 5 sentences UZ + 5 sentences EN.

## Runtime YAML (`prompts/feedback/overview/v1.yaml`)

```yaml
purpose: feedback
sub_purpose: overview
version: 1
status: active
description: |
  Compose a 5-sentence bilingual narrative tying together a student's per-skill
  band scores, top error patterns, and a single biggest opportunity.

variables_schema:
  bands: { type: object }              # {listening, reading, writing, speaking, overall}
  top_error_codes: { type: array }     # [{code, count, severity}]
  vocabulary_metrics: { type: object } # {ttr, awl_coverage, cefr_distribution}
  target_band: { type: number }
  user_locale: { type: string }

response_schema_ref: exam_platform.schemas.AttemptOverview

system: |
  You write supportive, specific feedback for IELTS / CEFR test-takers. Tone:
  precise, friendly, never patronising. Output JSON only.

  Hard rules:
  - 5 sentences each in `narrative_uz` and `narrative_en`. Not more, not less.
  - First sentence: state overall band + one observation.
  - Sentences 2–4: name the strongest skill, the weakest skill, and one specific
    pattern (taken from `top_error_codes`).
  - Sentence 5: tie to a concrete next step the user can take in Practice Mode
    (drills, flashcards, pronunciation lab, conversation).
  - Use formal Uzbek (siz form). Plain English second-person.
  - No exclamation points. No emojis.

user: |
  Bands: {{ bands | tojson }}
  Top error codes (last attempt): {{ top_error_codes | tojson }}
  Vocabulary metrics: {{ vocabulary_metrics | tojson }}
  Target band: {{ target_band }}
  User locale: {{ user_locale }}

  Return JSON:
  {
    "narrative_uz": "5-sentence Uzbek paragraph",
    "narrative_en": "5-sentence English paragraph",
    "biggest_opportunity_code": "one error_taxonomy.code",
    "next_step_ref": "drill code or 'pronunciation' or 'conversation' or 'flashcards'"
  }
```

## Pydantic schema

```python
class AttemptOverview(BaseModel):
    model_config = ConfigDict(extra="forbid")
    narrative_uz: str
    narrative_en: str
    biggest_opportunity_code: str
    next_step_ref: str
```
