# 02 — API Spec

> Full canonical contract: [`/docs/api-contracts.md`](../../../docs/api-contracts.md) § 5.
> OpenAPI live: `/data/v1/docs` (Swagger UI), `/data/v1/redoc`.

## Endpoint summary

### Public (S2S OR examiner+)
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/items/next` | IRT-based next item; query: `attempt_id, theta, skill, exclude_ids[]` |
| GET | `/v1/items/{id}` | Question payload (no key) |
| GET | `/v1/items/{id}/key` | Answer key — **S2S only** |
| GET | `/v1/rubrics/{skill}/{level}` | Scoring rubric |
| GET | `/v1/exams/blueprints` | List |
| GET | `/v1/exams/blueprints/{id}` | Full blueprint |
| POST | `/v1/items/{id}/response` | Empirical response (S2S `responses:write`) |

### Admin (content_admin+)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/v1/banks` | Question bank CRUD |
| GET/POST/PATCH | `/v1/questions` | Question CRUD with `?status=` filter |
| POST | `/v1/questions/{id}/approve` | Move to published |
| POST | `/v1/generation/jobs` | Body: `{skill, level, count, blueprint_id?}` |
| GET | `/v1/generation/jobs/{id}` | Job status |
| GET | `/v1/generation/jobs/{id}/events` | SSE progress stream |
| GET | `/v1/items` | Content Studio item bank with status, provenance, IRT, and quality flags |
| GET | `/v1/items/summary` | Item bank quality snapshot for dashboard/filter state |
| POST | `/v1/items/review/auto-jury` | Apply stored AI jury verdicts to the review queue |
| POST | `/v1/items/{id}/approve` | Manual content-admin approval |
| POST | `/v1/items/{id}/reject` | Manual content-admin rejection |
| GET/POST/PATCH | `/v1/prompts` | Prompt CRUD + versioning |
| GET/PATCH | `/v1/llm-config` | Read/edit `runtime_config` (hot-swap) |
| GET | `/v1/calibration/runs` | List runs |
| GET | `/v1/calibration/items/{id}/history` | Per-item parameter history |

### Researcher (api-key)
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/exports/responses.csv` | Anonymized empirical data |
| GET | `/v1/exports/questions.csv` | Question metadata with status, provenance, IRT, and quality flags |
| GET | `/v1/exports/validation-results.csv` | NLP/multi-jury validation evidence |
| GET | `/v1/exports/generation-jobs.csv` | AI dataset generation job parameters and totals |
| GET | `/v1/exports/llm-calls.csv` | LLM audit log with model, prompt version, tokens, cost, and latency |
| GET | `/v1/research/nlp-overview` | NLP lab: jury verdicts, criteria scores, embeddings, and quality gates |

### LLM Usage Analytics (admin/superadmin)
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/analytics/llm-usage/summary` | Today/Week/Month totals: cost, tokens (in/out), calls, avg latency |
| GET | `/v1/analytics/llm-usage/timeseries` | Time-bucketed usage: `?from=&to=&granularity=hour\|day&group_by=purpose\|model\|provider` |
| GET | `/v1/analytics/llm-usage/by-purpose` | Breakdown per purpose (generate_question, score_writing, ...) |
| GET | `/v1/analytics/llm-usage/by-model` | Breakdown per model (gemini-2.5-pro, ...) |
| GET | `/v1/analytics/llm-usage/by-user` | Per-user attribution (admin/student) |
| GET | `/v1/analytics/llm-usage/calls` | Paginated raw calls list with filters |
| GET | `/v1/analytics/llm-usage/calls/{request_id}` | Full call detail: prompt, response, tokens, cost |
| GET | `/v1/analytics/llm-usage/budget` | Configured budget + consumption + projection |
| PATCH | `/v1/analytics/llm-usage/budget` | Set monthly budget + alert thresholds (superadmin) |
| GET | `/v1/analytics/llm-usage/export.csv` | Raw call log CSV export |

## Auth matrix
- Browser (admin UI) → JWT cookie set by `auth-api`
- exam-platform-api → S2S JWT (HS256, scoped, 5min TTL)
- Researcher tools → `Authorization: Bearer lp_pk_...`

## Error format
RFC 9457 Problem Details, see `/docs/api-contracts.md` § 3.3.

## Pagination
Cursor-based (`?cursor=&limit=`), see `/docs/api-contracts.md` § 3.2.

## Implementation pointers
- Routers: `src/data_engine/api/v1/*.py` — one file per resource (`items.py`, `banks.py`, `generation.py`, ...)
- Auth dependency: `src/data_engine/api/deps.py` — `require_role(...)`, `require_s2s_scope(...)`
- Common error handlers: `src/data_engine/api/errors.py`
