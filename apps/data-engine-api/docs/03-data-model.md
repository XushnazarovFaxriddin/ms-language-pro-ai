# 03 — Data Model (schema `data_engine`)

## Tables

### `taxonomies` (seed-only, immutable)
- `cefr_levels` (id, code A1..C2, descriptor_uz, descriptor_en, ord)
- `ielts_sections` (id, code, max_questions, time_limit_seconds)
- `skills` (id, code listening|reading|writing|speaking)
- `can_do_statements` (id, cefr_level_id, skill_id, statement_uz, statement_en)
- `topics` (id, code, name_uz, name_en)  — CEFR-J topic domains

### `question_banks`
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| owner_user_id | uuid FK auth.users | |
| scope | enum: `private | shared | public` | |
| created_at | timestamptz | |

### `questions` (core)
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| bank_id | uuid FK | |
| type | enum (`mcq_single`, ...) | see `api-contracts.md` § 5.4 |
| status | enum: `draft | in_review | approved | published | retired` | |
| skill_id | int FK | |
| cefr_level_id | int FK | |
| ielts_band_target | numeric(2,1) | nullable |
| current_version_id | uuid FK question_versions | |
| difficulty_b | numeric | IRT 2PL `b` |
| discrimination_a | numeric default 1.0 | IRT 2PL `a` |
| guessing_c | numeric default 0.25 | constant per type |
| n_responses | int default 0 | calibration trigger |
| source_license | text | "ai_generated" or license code |
| generated_by_model | text | e.g. `gemini-2.5-pro` |
| created_at, updated_at | timestamptz | |

### `question_versions` (immutable)
- id, question_id, payload jsonb (shape per `type`), prompt_version_id, generated_by_model, created_at

### `question_embeddings`
- question_id PK FK, embedding vector(768), model text, created_at
- INDEX: `USING hnsw (embedding vector_cosine_ops)`

### `generation_jobs`
- id, owner_user_id, params jsonb (skill, level, count, ...), status, started_at, finished_at, totals jsonb (generated, approved, rejected_dup, needs_review)

### `generation_runs` (per-item LLM call)
- id, job_id, question_id (nullable if rejected), prompt_version_id, model, tokens_in, tokens_out, cost_usd, latency_ms, raw_response jsonb

### `validation_results`
- id, question_id, juror_model, verdict (approve|reject|borderline), reasoning text, criteria_scores jsonb

### `human_reviews`
- id, question_id, reviewer_user_id, decision (approve|reject|edit), edits jsonb, comment, created_at

### `rubrics`
- id, skill, cefr_level, criteria jsonb (e.g. IELTS Writing 4 criteria with band descriptors)

### `exam_blueprints`
- id, code (e.g. `ielts-academic-full`), name, sections jsonb (composition: [{skill, n_items, time_seconds}, ...])

### `prompt_templates` + `prompt_versions`
- templates: id, purpose enum, name
- versions: id, template_id, version int, system text, user text, examples jsonb, variables_schema jsonb, response_schema_ref text, status (active|archived), created_at

### `runtime_config`
- key text PK (e.g. `llm.profile.score_writing`), value text, updated_by_user_id, updated_at

### `calibration_runs`
- id, started_at, finished_at, n_items_recalibrated, method (`mml-2pl`), summary jsonb

### `item_parameters_history`
- id, question_id, calibration_run_id, a, b, c, n_responses, created_at

## Cross-schema reads
- `analytics.item_response_data` — read by calibration job (right-join via `question_id`)
- `analytics.llm_calls` — read by `/v1/analytics/llm-usage/*` endpoints (LLM dashboard)
- `analytics.llm_budgets` — read+write by budget endpoints

## Schema `analytics` (joint, but data-engine owns the LLM dashboard reads)

### `llm_calls` (every LLM invocation across all services)
| col | type | notes |
|---|---|---|
| request_id | uuid PK | |
| ts | timestamptz default now() | indexed |
| service | text | `data-engine \| exam-platform` |
| purpose | text | `generate_question \| score_writing \| ...` |
| user_id | uuid nullable FK auth.users | initiator (admin or student) |
| attempt_id | uuid nullable | for exam-platform calls |
| question_id | uuid nullable | for data-engine calls |
| provider | text | `gemini` |
| model | text | `gemini-2.5-pro`, `gemini-embedding-001`, ... |
| prompt_version_id | uuid nullable FK | |
| tokens_in | int | |
| tokens_out | int | |
| cost_usd | numeric(10,6) | computed from price tables |
| latency_ms | int | |
| cache_hit | bool | Redis cache |
| status | text | `success \| error \| timeout` |
| error_class | text nullable | |
| INDEX | (ts), (purpose, ts), (model, ts), (user_id, ts), (service, ts) | for dashboard query speed |

### `llm_budgets`
- id, scope (`global | per_purpose | per_user`), scope_value text, monthly_usd numeric, alert_threshold numeric (e.g. 0.8 = 80%), last_alerted_at, created_at

### `llm_pricing` (seed)
- model text PK, input_per_1m_usd numeric, output_per_1m_usd numeric, valid_from timestamptz

## Migrations
- Alembic env: `apps/data-engine-api/alembic.ini`, `apps/data-engine-api/alembic/`
- One migration per PR
- Initial migration creates schema + all tables + pgvector ext (idempotent)
