# `roadmap/generate/v1`

**Purpose**: produce a multi-week personalised study plan from the user's latest attempt + targets. See [`../15-learning-roadmap.md`](../15-learning-roadmap.md).

**Model profile**: `LLM_PROFILE_FEEDBACK_UZ` (`gemini-2.5-pro:0.3`).
**Response schema**: `exam_platform.schemas.RoadmapPlan`.

## Inputs the prompt receives

- Skill bands (current).
- Per-criterion bands (L2).
- Top 10 error codes from last 30 days.
- Vocabulary CEFR distribution.
- Target band, target date, weekly hours, focus skill.
- Drill catalogue (filtered by skill + CEFR).

## Failure modes

- **Generic plan** (model defaults to "study English 30 min/day"). Mitigate by requiring per-week skill_focus and explicit drill refs.
- **Ignoring user constraints** (target date, hours). Mitigate with strict acceptance: total minutes/week must equal weekly_hours × 60 ± 10%.
- **Overpacking week 1**. Mitigate with ramp-up rule.

## Runtime YAML (`prompts/roadmap/generate/v1.yaml`)

```yaml
purpose: feedback
sub_purpose: roadmap_generate
version: 1
status: active
description: |
  Produce a 4–12-week personalised study plan keyed to the drill catalogue.

variables_schema:
  bands: { type: object }
  criterion_scores: { type: object }
  top_error_codes: { type: array }
  vocabulary_metrics: { type: object }
  target_band: { type: number }
  target_date: { type: string, format: date }
  weekly_hours: { type: integer }
  focus_skill: { type: string }
  user_locale: { type: string }
  drill_catalogue: { type: array }
  weeks_until_target: { type: integer }

response_schema_ref: exam_platform.schemas.RoadmapPlan

system: |
  You design study plans for IELTS / CEFR learners. Plans are concrete,
  drill-referenced, and time-bound. Output JSON only.

  Hard rules:
  - The number of milestones equals `weeks_until_target` (cap at 12).
  - Sum of (item.minutes × frequency) across a week must equal
    `weekly_hours * 60 ± 10%`.
  - Each milestone names exactly one or two `skill_focus` and a 1-line theme.
  - Each milestone contains 3–6 items, picking only drills from `drill_catalogue`.
  - Across the plan, every code in `top_error_codes` is targeted by ≥ 1 drill.
  - Week 1 has 70% of the planned weekly minutes (ramp-up).
  - Last week has 110% with a final mock.
  - Vocabulary cards count is `daily_targets.vocabulary_cards`, default 25, capped 60.
  - `narrative_uz` and `narrative_en`: 3 sentences each.
  - No drills outside `drill_catalogue`. If a code has no matching drill, name it
    in `unmet_codes` so the content team can fill the gap.

user: |
  Current bands: {{ bands | tojson }}
  Criterion: {{ criterion_scores | tojson }}
  Top errors: {{ top_error_codes | tojson }}
  Vocabulary: {{ vocabulary_metrics | tojson }}
  Target band: {{ target_band }} by {{ target_date }} (weeks: {{ weeks_until_target }})
  Weekly hours: {{ weekly_hours }}
  Focus skill: {{ focus_skill }}
  Drill catalogue: {{ drill_catalogue | tojson }}

  Return JSON exactly matching schema RoadmapPlan.
```

## Pydantic schema

```python
class RoadmapItem(BaseModel):
    type: Literal["drill", "vocabulary", "mock", "conversation", "pronunciation"]
    ref: str
    minutes: int
    frequency: Literal["daily", "weekly"]

class RoadmapMilestone(BaseModel):
    week: int
    theme: str
    skill_focus: list[str]
    expected_band_lift: float
    items: list[RoadmapItem]

class DailyTargets(BaseModel):
    vocabulary_cards: int
    drill_minutes: int
    mock_questions: int

class SpacedRepetition(BaseModel):
    algorithm: Literal["fsrs"]
    queue_size: int
    stability_target: str

class RoadmapPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    milestones: list[RoadmapMilestone]
    daily_targets: DailyTargets
    spaced_repetition: SpacedRepetition
    unmet_codes: list[str] = []
    narrative_uz: str
    narrative_en: str
```
