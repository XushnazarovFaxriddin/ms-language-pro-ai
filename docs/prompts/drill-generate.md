# `drill/generate/v1`

**Purpose**: generate a new drill (set of micro-exercises) targeting one or two error_taxonomy codes at a given CEFR level. Used by content_admin to expand the drill catalogue. See [`../16-practice-mode.md`](../16-practice-mode.md) §2.

**Model profile**: `LLM_PROFILE_GENERATE_QUESTION` (`gemini-2.5-pro:0.7`).
**Response schema**: `data_engine.schemas.DrillDraft`.

## Inputs

- Target error code(s).
- CEFR level.
- Drill type (e.g. `writing_micro`, `vocab_cloze`, `pronunciation_minimal_pair`).
- Item count (default 8).

## Runtime YAML (`prompts/drill/generate/v1.yaml`)

```yaml
purpose: generate_question
sub_purpose: drill_generate
version: 1
status: active
description: |
  Generate a drill — a small set of varied micro-exercises targeting an
  error_taxonomy code at a CEFR level. Output JSON only.

variables_schema:
  target_codes: { type: array }
  cefr_level: { type: string }
  drill_type: { type: string }
  item_count: { type: integer }

response_schema_ref: data_engine.schemas.DrillDraft

system: |
  You design language-learning drills. Output JSON only.

  Hard rules:
  - Produce exactly `item_count` items, each genuinely targeting `target_codes`.
  - Items vary in surface form (no two items share the same template).
  - For each item provide `accepted` answers (case-insensitive, plus 1 typo
    tolerance allowed) and at least one `target_codes` reference for traceability.
  - Difficulty appropriate to `cefr_level`.
  - No proper nouns. No politics, religion, sex, violence, drugs, medical advice.
  - For pronunciation drills, use words a non-native Uzbek learner is likely to
    encounter (CEFR-tagged corpus only).

user: |
  Target codes: {{ target_codes | tojson }}
  CEFR level: {{ cefr_level }}
  Drill type: {{ drill_type }}
  Item count: {{ item_count }}

  Return JSON exactly matching DrillDraft.
```

## Pydantic schema

```python
class DrillItem(BaseModel):
    id: int
    given: str
    instruction_inline: str | None = None
    target_codes: list[str]
    accepted: list[str]
    tolerance: Literal["exact", "lev<=1", "lev<=2"] = "lev<=1"

class DrillDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    instruction_uz: str
    instruction_en: str
    items: list[DrillItem]
    duration_minutes: int = Field(ge=3, le=30)
```

## Validation

Generated drafts go through the same multi-jury panel as questions ([`../06-ai-pipelines.md`](../06-ai-pipelines.md) §6) before activation. The jury verdict for drills focuses on:
- Each item really exercises the claimed target code.
- Accepted answers are exhaustive (no obvious correct answer is missing).
- Difficulty matches the claimed CEFR level.
