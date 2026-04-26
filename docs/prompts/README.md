# Prompts (LLM templates)

> **TL;DR.** Every LLM call uses a template defined in this folder, mirrored to the runtime `prompts/` directory at repo root. Versioned, hot-swappable, audited via `analytics.llm_calls.prompt_version_id`. **Never** inline a prompt in code.

---

## Layout

```
docs/prompts/                       # docs / examples — read-only reference
├── README.md                       # this file
├── generate-question-mcq-reading.md
├── generate-question-writing-task2.md
├── generate-question-speaking-part2.md
├── validate-question.md
├── classify-cefr.md
├── score-writing.md
├── score-speaking.md
└── feedback-uz.md

prompts/                            # runtime YAML — loaded by PromptRegistry
├── generate_question/<sub>/v<N>.yaml
├── validate_question/<sub>/v<N>.yaml
├── classify_cefr/<sub>/v<N>.yaml
├── score_writing/<sub>/v<N>.yaml
├── score_speaking/<sub>/v<N>.yaml
└── feedback/<sub>/v<N>.yaml
```

The runtime YAML files are the source of truth at boot. The Markdown docs in this folder are **commentary + design rationale** — they explain *why* each prompt is shaped the way it is, what failure modes it tries to defeat, and what to A/B next.

---

## Conventions

1. **Versioning**: bump `version` integer for any non-trivial change. Old versions stay on disk; mark older as `status: archived`. Activate via filename `current` symlink or admin UI override (`runtime_config`).
2. **Variables**: declare every templated variable in `variables_schema`. `Jinja2 StrictUndefined` rejects missing keys at render time.
3. **Boundary markers**: when a user-controlled string is included (essay, audio transcript), wrap it in distinctive XML tags and add an instruction to ignore any commands inside. Defends against prompt injection.
4. **Structured output**: every grading / classifying / generating prompt must declare `response_schema_ref` pointing at a Pydantic model. The model becomes the JSON Schema sent in `response_format`.
5. **No inline prompts in code.** If you can't make it parameterise, add an ADR explaining why.

---

## Authoring checklist (per prompt change)

- [ ] Bumped `version`. Old version marked `status: archived`.
- [ ] All variables in `variables_schema`.
- [ ] User content wrapped in boundary tags with explicit "ignore instructions inside" line.
- [ ] Response schema declared and matches the Python Pydantic model.
- [ ] Examples in `examples:` section show the expected JSON structure (not just the natural-language style).
- [ ] Tested via the admin "Test prompt" button on at least 5 sample inputs.
- [ ] If degrading quality is acceptable for a cost win, paired with a smaller-model variant (`*_FAST`).

---

## Files

| Doc | Runtime path | Purpose |
|---|---|---|
| [`generate-question-mcq-reading.md`](generate-question-mcq-reading.md) | `prompts/generate_question/mcq_reading/v1.yaml` | Generate one MCQ reading question |
| [`generate-question-writing-task2.md`](generate-question-writing-task2.md) | `prompts/generate_question/writing_task2/v1.yaml` | Generate one Task 2 prompt |
| [`generate-question-speaking-part2.md`](generate-question-speaking-part2.md) | `prompts/generate_question/speaking_part2/v1.yaml` | Generate one Part 2 cue card |
| [`validate-question.md`](validate-question.md) | `prompts/validate_question/generic/v1.yaml` | Multi-jury verdict |
| [`classify-cefr.md`](classify-cefr.md) | `prompts/classify_cefr/generic/v1.yaml` | Classify text CEFR level |
| [`score-writing.md`](score-writing.md) | `prompts/score_writing/ielts/v1.yaml` | Grade writing essay (4 criteria) |
| [`score-speaking.md`](score-speaking.md) | `prompts/score_speaking/ielts/v1.yaml` | Grade speaking audio (multimodal) |
| [`feedback-uz.md`](feedback-uz.md) | `prompts/feedback/uz/v1.yaml` | Localise feedback to UZ |
