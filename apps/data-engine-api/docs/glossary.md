# Glossary (data-engine local)

> Repo-level glossary: [`/docs/glossary-uz-en.md`](../../../docs/glossary-uz-en.md). Bu fayl faqat data-engine'ga xos atamalar uchun.

| EN | UZ | Notes |
|---|---|---|
| Question bank | Savol bazasi | `data_engine.question_banks` |
| Item bank | Element banki | IRT kontekstida sinonim |
| Cold-start `b` | Sovuq start `b` | Empirik javobsiz LLM-rated difficulty |
| Multi-jury validation | Ko'p-juror validatsiya | 3 ta LLM ovoz beradi |
| Juror | Juror / sud a'zosi | Validation context |
| Dedup / Deduplication | Dublikat aniqlash | pgvector cosine search |
| Cold-start | Sovuq start | Yangi item uchun boshlang'ich qiymat |
| Recalibration | Qayta kalibratsiya | Empirik javoblardan keyin |
| MML estimation | MML estimatsiya | Marginal Maximum Likelihood (py-irt) |
| Fisher Information | Fisher axboroti | I(θ) — item selection criterion |
| Generation job | Generatsiya ishi | `data_engine.generation_jobs` |
| Generation run | Generatsiya yurish | Per-item LLM call |
| Validation result | Validatsiya natijasi | Per-juror verdict |
| Provenance | Provenans / kelib chiqish | `generated_by_model`, `prompt_version_id` |
| Runtime config | Runtime konfiguratsiya | Hot-swap LLM profile (DB) |
