# 09 — Tezis-Kod Xaritasi (Bobomurod)

> Tezis: _"Sun'iy intellekt arxitekturasi yordamida xorijiy tilni bilish darajasini aniqlash platformasining ma'lumotlar manbaini shakllantirish"_

| Tezis bobi | Kod / artifakt | Asosiy fayllar |
|---|---|---|
| **Bob 2 — Adabiyot tahlili** | Doc | `docs/literature-review.md` (kelajakda) |
| **Bob 3 — AI bilan savol generatsiya arxitekturasi** | Generation pipeline | `services/generation/generator.py`, `services/generation/batch.py`, `prompts/generate_question/*` |
| **Bob 4 — Multi-jury validatsiya** | 3-LLM jury system | `services/validation/jury.py`, `prompts/validate_question/`, `validation_results` jadvali |
| **Bob 5 — CEFR klassifikatsiya algoritmi** | Hybrid LLM + lexical | `services/validation/cefr.py`, CEFR-J wordlist seeder, `taxonomies` |
| **Bob 6 — IRT 2PL kalibratsiya** | py-irt + Fisher info | `services/calibration/`, `python/languagepro_irt/`, `calibration_runs`, `item_parameters_history` |
| **Bob 7 — Eksperimental natijalar** | Metrika to'plash | `docs/10-evaluation.md`, `analytics.llm_calls`, Langfuse |

## Demo skripti (himoya 10 daq)

1. **data-engine-web ochish** → `/generation/new`
2. Form: `skill=reading, cefr_level=B2, count=20, blueprint=ielts-academic`
3. **Submit** → SSE progress: real-time bar to'ladi
4. **Live** ko'rsatish:
   - Bitta savol generatsiya (Gemini 2.5-pro)
   - Embedding + dedup (1 ta dublikat rad etilishi)
   - 3-jury verdict (chronological)
   - CEFR classifier output
5. **Calibration dashboard** ochish → `b` distribution histogram
6. **Langfuse** ochish → ushbu batch'ning umumiy cost (~$0.30 for 20 items)
7. (1 daq) Q&A — "Why Gemini, not GPT-4?" → ADR 0003 ko'rsatish

## Empirik natijalar (10-bobda)
- N savollar generatsiya: ≥500
- Approve rate (jury unanimous): 60-75% (target)
- Average cost per approved item: <$0.05
- Inter-juror Cohen's κ: ≥0.6 (substantial agreement)
- CEFR classifier accuracy: ≥85% on 100 hand-labeled subset
- Calibration shift after 30 responses: avg |Δb| > 0.1

## Bobomurodning individual hissasi (komissiya uchun)
- 100% kod: `services/generation/`, `services/validation/`, `services/calibration/`, `services/prompts/registry.py`
- 100% schema: `data_engine.*` jadvallari + Alembic migrations
- 100% prompt design: `prompts/generate_question/`, `prompts/validate_question/`
- 100% admin UI: `apps/data-engine-web/`
- Joint: `python/languagepro_llm/` (co-author with Faxriddin), shared infra
