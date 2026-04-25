# 06 — Prompt Engineering

## Filesystem layout
```
prompts/
├── generate_question/
│   ├── mcq_reading/
│   │   ├── v1.yaml
│   │   ├── v2.yaml
│   │   └── current → v2.yaml  # symlink
│   ├── writing_task2/
│   ├── speaking_part2/
│   └── ...
├── validate_question/
│   └── generic/v1.yaml
├── classify_cefr/
│   └── generic/v1.yaml
├── score_writing/
│   └── ielts/v1.yaml
└── score_speaking/
    └── ielts/v1.yaml
```

## YAML format
```yaml
purpose: generate_question
sub_purpose: mcq_reading
version: 2
status: active        # active | archived
description: "Generate IELTS Reading MCQ from a passage and target CEFR level"
variables_schema:
  passage: { type: string }
  cefr_level: { type: string, enum: [A2, B1, B2, C1, C2] }
  topic: { type: string }
response_schema_ref: schemas.QuestionDraft
system: |
  You are an expert IELTS examiner...
user: |
  Passage:
  <passage>{{ passage }}</passage>

  Target CEFR level: {{ cefr_level }}
  Topic: {{ topic }}

  Generate exactly one MCQ with:
  - prompt
  - 4 options (A,B,C,D)
  - correct_option_id
  - distractor_rationale per option
  - difficulty_self_rating (1-9)
examples:
  - input: { passage: "...", cefr_level: "B2", topic: "environment" }
    output: { prompt: "...", options: [...], correct_option_id: "B", ... }
```

## PromptRegistry
- `services/prompts/registry.py` — `PromptRegistry`
- Loads from disk on boot, mirrors to `prompt_templates`+`prompt_versions` tables
- Admin UI may override `runtime_config.key="prompt.<purpose>.<sub>.version"` → forces specific version
- `registry.render(purpose, sub_purpose, vars) -> RenderedPrompt(messages, schema)`

## Dynamic LLM profile
- Format `LLM_PROFILE_<PURPOSE>=model:temperature` in `.env`
- DB override: `runtime_config.key="llm.profile.<purpose>"`, `value="gemini-2.5-pro:0.3"`
- Refresh every 30s via `LLMSettings.refresh()` background task
- Admin UI form per purpose

## Multi-jury diversity
For `validate_question`, 3 separate `LLMRouter` invocations:
```python
verdicts = await asyncio.gather(
    router.complete(LLMRequest(purpose="validate_question",
                               profile_override="gemini-2.5-flash:0.0", ...)),
    router.complete(LLMRequest(purpose="validate_question",
                               profile_override="gemini-2.0-flash:0.0", ...)),
    router.complete(LLMRequest(purpose="validate_question",
                               profile_override="gemini-2.5-pro:0.0", ...)),
)
```

## Prompt versioning
- Never delete a prompt — archive (`status='archived'`)
- Every LLM call records `prompt_version_id` → reproducibility
- Admin UI: "Test on 10 sample inputs" before activating new version
- Diff between versions visible in admin UI (text diff)

## Acceptance
- [ ] Switching `LLM_PROFILE_GENERATE_QUESTION` env restarts → new model used
- [ ] Switching via `runtime_config` (DB) → new model used in <1min, no restart
- [ ] Every `analytics.llm_calls` row has valid `prompt_version_id`
- [ ] Adding new prompt version doesn't break existing scheduled jobs
