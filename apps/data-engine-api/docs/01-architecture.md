# 01 — Architecture

## Qatlamlar (hexagonal-ish)

```
src/data_engine/
├── api/v1/             # FastAPI routerlar (HTTP only)
├── domain/             # pure entities, value objects
├── services/           # use cases (orchestration)
│   ├── generation/     # generate_question, batch_generate
│   ├── validation/     # multi_jury, cefr_classifier
│   ├── calibration/    # py-irt wrapper, fisher_information
│   └── prompts/        # PromptRegistry
├── adapters/
│   ├── db/             # SQLAlchemy models, repositories
│   ├── llm/            # LLMRouter integration (from python/languagepro_llm)
│   └── storage/        # MinIO/S3 (audio prompts)
├── jobs/               # arq tasks (generate, validate, calibrate)
├── schemas/            # Pydantic v2 DTOs
├── settings.py
└── main.py
```

## Request lifecycle (sync API call)

```
HTTP request
  → Caddy → FastAPI router (api/v1/...)
  → AuthN/AuthZ middleware (JWT cookie OR S2S JWT)
  → Pydantic validation (schemas/)
  → Service (services/...) — pure use case logic
    → Adapter (adapters/db/...) — DB query
    → Adapter (adapters/llm/...) — LLMRouter call (cached)
  → Pydantic response model
  → JSON response
```

## Background job (generate_batch)

```
POST /v1/generation/jobs → arq.enqueue("generate_batch", params)
arq worker:
  for i in range(count):
    services.generation.generate_one()
      → LLMRouter.complete(purpose="generate_question")
      → embed → pgvector search → dedup
      → services.validation.multi_jury()
      → services.validation.cefr_classify()
      → services.calibration.cold_start_b()
      → save Question (status='approved' | 'needs_review')
    → SSE event to data-engine-web
```

## Tashqi bog'lanishlar
- **PostgreSQL 17** (schema `data_engine`) — read/write
- **Redis** — cache (LLM responses), arq queue
- **MinIO/S3** — audio prompts (listening section)
- **Gemini API** (via OpenAI SDK) — `python/languagepro_llm`
- **exam-platform-api** — outbound: oladi (S2S empirical responses); inbound: beradi (items/keys/blueprints)

## Asosiy qarorlar
| Qaror | Qaerda hujjatlangan |
|---|---|
| OpenAI SDK + Gemini (no ChatGPT) | `docs/adr/0003-openai-sdk-with-gemini.md` |
| pgvector vs Qdrant | `docs/adr/0002-postgres-pgvector.md` |
| arq vs Celery | `docs/adr/0004-arq-over-celery.md` |
| 2PL vs 3PL | `adr/0003-2pl-vs-3pl.md` (local) |
| Multi-jury validation | `adr/0005-multi-jury-validation.md` (local) |
