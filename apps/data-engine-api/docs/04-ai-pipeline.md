# 04 — AI Pipeline

## Maqsad
Sifatli, kalibrlangan, dublikatsiz IELTS/CEFR savollar generatsiya.

## Pipeline (per-item)

```
seed (skill, cefr_level, topic, n)
  ↓
[1] generate     LLMRouter.complete(purpose="generate_question",
                                    response_schema=QuestionDraft)
  ↓
[2] embed        LLMRouter.complete(purpose="embed", input=text)
  ↓
[3] dedup        SELECT FROM question_embeddings WHERE
                 embedding <=> $1 < 0.08   -- cosine_distance < 0.08 → dup
                 LIMIT 1
                 → if found: status='rejected_duplicate', STOP
  ↓
[4] jury         3 parallel LLMRouter.complete(purpose="validate_question")
                 with different models (2.5-flash, 2.0-flash, 2.5-pro)
                 → each returns: {verdict, reasoning, criteria_scores}
  ↓
[5] cefr_classify   LLMRouter.complete(purpose="classify_cefr",
                                       input={text, target_level})
                    + lexical analysis (CEFR-J wordlist match)
                    → {actual_level, confidence}
  ↓
[6] cold_start_b    Map LLM 1-9 difficulty self-rating → z-scale b
  ↓
[7] decide
   if all_jury_approve AND actual_level == target AND confidence > 0.7:
     status = 'approved'
   else:
     status = 'needs_human_review'
   save Question + QuestionVersion + Embedding + ValidationResults
```

## Service files
- `services/generation/generator.py` — `async def generate_one(spec) -> Question`
- `services/generation/batch.py` — `async def generate_batch(job_id, spec, count)` (arq job)
- `services/validation/jury.py` — `async def multi_jury(question) -> list[Verdict]`
- `services/validation/cefr.py` — `async def classify_cefr(text) -> CefrResult`
- `services/validation/dedup.py` — `async def find_duplicate(embedding) -> Question | None`
- `services/calibration/cold_start.py` — `def cold_start_b(llm_rating: int) -> float`

## Prompt purposes (see `prompts/`)
- `generate_question/` — per-skill subdirs (mcq_reading, writing_task2, ...)
- `validate_question/` — generic validator
- `classify_cefr/` — generic classifier

## Structured output
Use Gemini JSON schema mode via OpenAI SDK `response_format={"type": "json_schema", ...}`. Schemas in `schemas/llm_io.py`.

## Cost tracking
Every LLM call → `analytics.llm_calls(request_id, purpose, model, tokens_in, tokens_out, cost_usd, ...)`. `cost_usd` computed from price tables (`python/languagepro_llm/pricing.py`).

## Acceptance
- [ ] `services/generation/generate_one()` returns valid `Question` for all 4 skills
- [ ] Dedup rejects ≥95% obvious near-duplicates in test set
- [ ] Jury agreement rate ≥ 70% on first 100 generated items (else: prompt issue)
- [ ] Total cost per generated approved item < $0.05
