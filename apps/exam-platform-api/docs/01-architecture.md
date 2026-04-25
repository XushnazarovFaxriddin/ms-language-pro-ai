# 01 — Architecture

## Qatlamlar

```
src/exam_platform/
├── api/v1/             # FastAPI routerlar
├── domain/             # entities (Attempt, Section, Response)
├── services/
│   ├── attempt/        # start, navigate, finish
│   ├── adaptive/       # theta update, next-item proxy
│   ├── scoring/        # writing.py, speaking.py, mcq.py
│   ├── certificates/
│   └── results/
├── adapters/
│   ├── db/
│   ├── llm/            # uses python/languagepro_llm
│   ├── storage/        # S3/MinIO presigned URLs
│   ├── audio/          # ffmpeg wrapper
│   └── data_engine/    # HTTP client to data-engine-api (S2S)
├── jobs/               # arq: score_writing, score_speaking, render_cert
├── schemas/
├── settings.py
└── main.py
```

## Tashqi bog'lanishlar
- **PostgreSQL** (schema `exam_platform`)
- **Redis** — cache, arq queue, attempt state cache
- **MinIO/S3** — audio recordings, certificate PDFs
- **data-engine-api** (S2S JWT outbound) — items, keys, rubrics
- **Gemini** (via OpenAI SDK) — scoring
- **auth-api** — verifies JWT cookie

## Asosiy oqimlar (high-level)

### 1. Attempt start
```
POST /v1/attempts {blueprint_id}
  → fetch blueprint from data-engine
  → snapshot blueprint into exam_attempts.blueprint_snapshot
  → return first section
```

### 2. Item navigation
```
GET /v1/attempts/:id/next-item
  → load attempt theta, exclude_ids
  → call data-engine /v1/items/next (S2S)
  → cache item locally for 1h
  → return to client (no answer_key)
```

### 3. MCQ submit
```
POST /v1/attempts/:id/responses {item_id, mcq_choice_id}
  → fetch answer key from data-engine /v1/items/:id/key (S2S)
  → grade
  → update theta (Bayesian update, 2PL)
  → write attempt_responses
  → POST data-engine /v1/items/:id/response (empirical data)
  → return next item OR section_complete
```

### 4. Writing/Speaking submit (async)
```
POST /v1/attempts/:id/responses {item_id, essay | audio_s3_key}
  → save attempt_responses (graded=false)
  → enqueue arq job
  → return 202 Accepted
arq worker:
  → score_writing.run(response_id) or score_speaking.run(response_id)
  → write llm_scoring_runs, scoring_results
  → if low confidence → human_review_queue
  → SSE notify client
```

## ADRs
- `adr/0001-rsc-vs-csr-for-exam-runner.md`
- `adr/0002-mediarecorder-vs-recordrtc.md`
- `adr/0003-async-vs-realtime-speaking.md`
- `adr/0004-tiptap-vs-lexical.md`
