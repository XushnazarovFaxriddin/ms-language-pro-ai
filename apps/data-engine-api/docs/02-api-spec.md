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
| GET/POST/PATCH | `/v1/prompts` | Prompt CRUD + versioning |
| GET/PATCH | `/v1/llm-config` | Read/edit `runtime_config` (hot-swap) |
| GET | `/v1/calibration/runs` | List runs |
| GET | `/v1/calibration/items/{id}/history` | Per-item parameter history |

### Researcher (api-key)
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/exports/responses.csv` | Anonymized empirical data |
| GET | `/v1/exports/questions.csv` | Approved question metadata |

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
