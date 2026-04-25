# 10 — Tezis-Kod Xaritasi (Faxriddin)

> Tezis: _"Sun'iy intellekt arxitekturalari yordamida xorijiy tilini bilish darajasini aniqlash platformasini ishlab chiqish"_

| Tezis bobi | Kod / artifakt | Asosiy fayllar |
|---|---|---|
| **Bob 2 — Adabiyot tahlili** | Doc | `docs/literature-review.md` (kelajakda) |
| **Bob 3 — Platforma arxitekturasi** | Backend + Frontend | `apps/exam-platform-api/`, `apps/exam-platform-web/` |
| **Bob 4 — Adaptiv test boshqaruvi** | Theta tracking, item selection | `services/adaptive/`, `06-adaptive-selection.md` |
| **Bob 5 — Avtomatik baholash pipeline'i** | Writing scoring | `services/scoring/writing.py`, `prompts/score_writing/`, confidence gate |
| **Bob 6 — Multimodal speaking baholash** | Audio + Gemini | `services/scoring/speaking.py`, `adapters/audio/`, `prompts/score_speaking/` |
| **Bob 7 — Eksperimental natijalar** | IRR study, pilot | `11-evaluation.md` |

## Demo skripti (himoya 15 daq)

1. **Yangi student** ro'yxatdan o'tadi (auth-api SSO)
2. **`/exams`** → IELTS Mini Test (15 daq, 1 reading + 1 writing + 1 speaking)
3. **Reading** (5 daq):
   - Birinchi MCQ → to'g'ri javob → `theta` ko'tariladi → keyingi savol qiyinroq
   - 2-savol noto'g'ri → `theta` pasayadi → osonroq savol
   - Adaptive selection ko'rinadi (logs/dashboard)
4. **Writing Task 2** (5 daq):
   - 100 so'zli essay yozish
   - Submit → "Scoring..." holati
   - 15-20 sekund ichida natija paydo bo'ladi
   - 4 ta criteria score + UZ feedback ko'rsatish
5. **Speaking Part 2** (3 daq):
   - Cue card → 1 daq tayyorgarlik
   - 2 daq gapirish (mikrofon yoziladi)
   - Stop → audio S3'ga yuklanadi
   - 25-30 sekundda Gemini multimodal natija qaytaradi: transcript + 4 criteria + feedback
6. **Results page**: Overall band 6.5, per-skill bands, certificate PDF
7. (1 daq) Q&A — "Why async, not realtime?" → ADR EP-0003

## Empirik natijalar (11-bobda)
- IRR study: 30 essay × (2 humans + LLM)
  - Pearson r (LLM vs human avg): target ≥ 0.75
  - Quadratic-weighted Cohen's κ: target ≥ 0.65
- Pilot 10-20 BSU students:
  - Avg attempt completion rate: ≥80%
  - NPS: ≥ +20
  - Avg time-on-task per section vs IELTS published time
  - LLM cost per attempt: target <$0.50

## Faxriddinning individual hissasi
- 100% kod: `apps/exam-platform-api/`, `apps/exam-platform-web/`
- 100% schema: `exam_platform.*` jadvallari + Alembic migrations
- 100% scoring prompts: `prompts/score_writing/`, `prompts/score_speaking/`
- 100% audio pipeline: `adapters/audio/`, MediaRecorder integration
- 100% adaptive (consumer side): `services/adaptive/`
- Joint: `python/languagepro_llm/` (co-author with Bobomurod), shared infra
