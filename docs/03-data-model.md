# 03 — Data Model

> **TL;DR.** One Postgres 17 cluster, five logical schemas: `auth`, `data_engine`, `exam_platform`, `billing`, `analytics`. UUIDs everywhere (`gen_random_uuid()`). All timestamps are `TIMESTAMPTZ`. JSON payloads use `JSONB`. Vectors use `pgvector(768)`. Every mutation goes through Alembic — no raw `psql` schema edits in production.

---

## 1. Conventions

- **PKs**: UUID v4, `DEFAULT gen_random_uuid()`. Exception: small enum-like tables (`roles`, `cefr_levels`, `skills`) use `SERIAL`.
- **FKs**: explicit `ON DELETE` clause every time (`CASCADE`, `RESTRICT`, or `SET NULL`).
- **Timestamps**: `created_at` and (where mutable) `updated_at`, both `TIMESTAMPTZ DEFAULT now()`. `updated_at` maintained by ORM `onupdate`.
- **Enums**: stored as `TEXT` with a `CHECK` constraint, not Postgres `CREATE TYPE` — easier migrations.
- **Money**: store as integer **cents** (or **tiyin** for UZS) — `BIGINT`. Plus a `currency` column (`USD`, `UZS`, ...).
- **Soft delete**: only `auth.users` and `billing.subscriptions` have `deleted_at`. Everything else hard-deletes via `ON DELETE CASCADE`.
- **Schema search path**: every service connection sets `SET search_path TO <its-schema>, public;`.
- **Naming**: `snake_case`, table names plural (`questions`, not `question`), join tables `<a>_<b>` (`user_roles`).

---

## 2. Schema `auth`

Owned by `auth-api`. Read-only by other services for `users` lookup.

### `users`
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| email | CITEXT UNIQUE NOT NULL | case-insensitive |
| password_hash | TEXT NULL | NULL if OAuth-only |
| display_name | TEXT NULL | |
| locale | TEXT NOT NULL DEFAULT `'uz'` | `uz` \| `en` |
| theme | TEXT NOT NULL DEFAULT `'system'` | `system` \| `light` \| `dark` |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| email_verified_at | TIMESTAMPTZ NULL | |
| deleted_at | TIMESTAMPTZ NULL | tombstoned account |
| created_at, updated_at | TIMESTAMPTZ | |

### `roles`
Seed: `student`, `examiner`, `content_admin`, `researcher`, `superadmin`.

### `user_roles`
| col | type |
|---|---|
| user_id | UUID FK users(id) ON DELETE CASCADE |
| role_id | INT FK roles(id) ON DELETE CASCADE |
| PRIMARY KEY (user_id, role_id) | |

### `sessions` (refresh tokens)
| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK users(id) ON DELETE CASCADE |
| refresh_token_hash | TEXT UNIQUE NOT NULL (SHA-256 of opaque token) |
| user_agent | TEXT |
| ip | INET |
| expires_at | TIMESTAMPTZ NOT NULL |
| revoked_at | TIMESTAMPTZ NULL |
| created_at | TIMESTAMPTZ |

Indexes: `(user_id)`, `(refresh_token_hash)`.

### `oauth_accounts`
`(provider, provider_user_id)` UNIQUE. `provider` ∈ {`google`}.

### `api_keys` (researchers, future public API)
| col | type |
|---|---|
| id | UUID PK |
| owner_user_id | UUID FK users(id) ON DELETE CASCADE |
| name | TEXT |
| key_hash | TEXT UNIQUE (Argon2id of `lp_pk_…`) |
| scopes | TEXT[] |
| last_used_at | TIMESTAMPTZ NULL |
| revoked_at | TIMESTAMPTZ NULL |
| created_at | TIMESTAMPTZ |

---

## 3. Schema `data_engine` (Bobomurod's domain — content)

### `cefr_levels` (seed-only)
`A1, A2, B1, B2, C1, C2`. Includes `descriptor_uz`, `descriptor_en`, `ord`.

### `skills` (seed-only)
`listening, reading, writing, speaking`. Includes `name_uz`, `name_en`.

### `topics` (seed)
CEFR-J topic taxonomy. `code, name_uz, name_en, parent_id NULL`.

### `question_banks`
| col | type |
|---|---|
| id | UUID PK |
| name | TEXT |
| owner_user_id | UUID FK auth.users(id) ON DELETE SET NULL |
| scope | TEXT (`private` \| `shared` \| `public`) |
| created_at | TIMESTAMPTZ |

### `questions`
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| bank_id | UUID FK question_banks(id) ON DELETE RESTRICT | |
| type | TEXT | enum, see §3.1 below |
| status | TEXT | `draft` \| `in_review` \| `approved` \| `published` \| `retired` \| `rejected_dup` \| `rejected_jury` |
| skill_id | INT FK skills(id) | |
| cefr_level_id | INT FK cefr_levels(id) | |
| ielts_band_target | NUMERIC(2,1) NULL | nullable, only for IELTS questions |
| payload | JSONB | student-visible payload, no answer key |
| answer_key | JSONB | the correct answer + rationale |
| difficulty_b | NUMERIC(8,4) DEFAULT 0 | IRT 2PL `b` |
| discrimination_a | NUMERIC(8,4) DEFAULT 1.0 | IRT 2PL `a` |
| guessing_c | NUMERIC(4,3) DEFAULT 0.25 | constant per type |
| n_responses | INT DEFAULT 0 | calibration trigger |
| source_license | TEXT DEFAULT `'ai_generated'` | provenance |
| generated_by_model | TEXT NULL | e.g. `gemini-2.5-pro` |
| prompt_version_id | TEXT NULL | e.g. `generate_question/mcq_reading/v1` |
| generation_run_id | UUID NULL | groups items from the same job |
| estimated_seconds | INT DEFAULT 60 | for UI countdown |
| created_at, updated_at | TIMESTAMPTZ | |

Indexes: `(status, skill_id)`, `(cefr_level_id)`, `(bank_id, status)`.

### Question type enum (TEXT)
`mcq_single`, `mcq_multi`, `true_false_ng`, `yes_no_ng`, `matching`, `matching_headings`, `sentence_completion`, `summary_completion`, `short_answer`, `diagram_labelling`, `writing_task1_academic`, `writing_task1_general`, `writing_task2`, `speaking_part1_question`, `speaking_part2_cue_card`, `speaking_part3_question`, `listening_passage` (parent for grouped listening items).

### `question_versions` (immutable history)
Every edit creates a new version row. `(question_id, version)` UNIQUE.

### `question_embeddings`
| col | type |
|---|---|
| question_id | UUID PK FK questions(id) ON DELETE CASCADE |
| embedding | VECTOR(768) NOT NULL |
| model | TEXT NOT NULL (e.g. `gemini-embedding-001`) |
| created_at | TIMESTAMPTZ |

Index: `USING hnsw (embedding vector_cosine_ops)`.

### `generation_jobs`
| col | type |
|---|---|
| id | UUID PK |
| owner_user_id | UUID FK auth.users(id) ON DELETE SET NULL |
| params | JSONB (skill, cefr_level, topic, count, bank_id) |
| status | TEXT (`queued` \| `running` \| `done` \| `error`) |
| totals | JSONB (`{approved: N, in_review: N, ...}`) |
| started_at, finished_at | TIMESTAMPTZ NULL |
| created_at | TIMESTAMPTZ |

### `validation_results` (multi-jury verdicts)
`(id, question_id, juror_model, verdict, reasoning, criteria_scores)` — see [`06-ai-pipelines.md`](06-ai-pipelines.md).

### `human_reviews`
Examiner overrides on `in_review` items. Stores edits + decision.

### `rubrics`
Fixed-content (seed). `(skill, cefr_level)` UNIQUE. Holds 4 IELTS criteria for writing/speaking with band descriptors.

### `exam_blueprints`
| col | type |
|---|---|
| id | UUID PK |
| code | TEXT UNIQUE (`ielts_academic_full`, `ielts_reading_mini`, `cefr_quick_placement`) |
| name_uz, name_en | TEXT |
| sections | JSONB (`[{skill, item_count, time_limit_seconds, stop_rule}]`) |
| is_active | BOOLEAN |
| created_at | TIMESTAMPTZ |

### `prompt_templates` + `prompt_versions`
Mirrors filesystem `prompts/<purpose>/<sub>/v<N>.yaml` for runtime overrides + audit.

### `runtime_config`
| col | type |
|---|---|
| key | TEXT PK (e.g. `llm.profile.score_writing`) |
| value | TEXT |
| updated_by_user_id | UUID NULL |
| updated_at | TIMESTAMPTZ |

### `calibration_runs` + `item_parameters_history`
Nightly IRT recalibration audit trail.

---

## 4. Schema `exam_platform` (Faxriddin's domain — student exam runtime)

### `exams`
| col | type |
|---|---|
| id | UUID PK |
| blueprint_code | TEXT UNIQUE FK data_engine.exam_blueprints(code) |
| name_uz, name_en | TEXT |
| is_active | BOOLEAN DEFAULT true |
| created_at | TIMESTAMPTZ |

### `exam_attempts`
| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| exam_id | UUID FK exams(id) ON DELETE RESTRICT |
| blueprint_snapshot | JSONB (frozen at start) |
| state | TEXT (`in_progress` \| `scoring` \| `completed` \| `abandoned` \| `invalidated`) |
| theta_estimates | JSONB (`{listening: 0.4, reading: -0.2, ...}`) |
| theta_se | JSONB |
| locale | TEXT (`uz` \| `en`) — feedback language |
| started_at, finished_at | TIMESTAMPTZ |
| expires_at | TIMESTAMPTZ NOT NULL (= started_at + 4h) |

Indexes: `(user_id, started_at DESC)`, `(state)`, `(expires_at)`.

### `attempt_responses`
| col | type | notes |
|---|---|---|
| id | UUID PK | |
| attempt_id | UUID FK exam_attempts(id) ON DELETE CASCADE | |
| section_index | INT | 0-based |
| item_id | UUID | FK to data_engine.questions but no constraint (cross-schema) |
| item_snapshot | JSONB | frozen payload (no answer key) for replay |
| type | TEXT | mirrors questions.type |
| skill | TEXT | listening \| reading \| writing \| speaking |
| raw_answer | JSONB | `{mcq_choice_id}` \| `{essay}` \| `{audio_s3_key}` |
| is_correct | BOOLEAN NULL | NULL until graded |
| partial_credit | NUMERIC(4,3) NULL | 0..1 |
| theta_at_answer | NUMERIC(8,4) | snapshot |
| time_ms | INT | response time |
| answered_at | TIMESTAMPTZ | |

Indexes: `(attempt_id, answered_at)`, `(attempt_id, item_id)`.

### `audio_recordings`
S3 metadata for speaking responses. 90-day retention.

### `transcripts`
For Phase 2 explicit transcript storage (Gemini multimodal returns transcript embedded in scoring response; we copy out for indexing).

### `llm_scoring_runs`
Per-call audit for writing/speaking grading. `(response_id, model, prompt_version_id, criteria_scores, overall_band, confidence, cost_cents)`.

### `scoring_results` (final)
| col | type |
|---|---|
| id | UUID PK |
| response_id | UUID UNIQUE FK attempt_responses(id) ON DELETE CASCADE |
| source | TEXT (`llm` \| `human` \| `hybrid`) |
| band | NUMERIC(3,1) |
| criteria | JSONB (per IELTS rubric) |
| feedback_uz | TEXT |
| feedback_en | TEXT |
| confidence | NUMERIC(4,3) NULL |
| finalized_at | TIMESTAMPTZ |

### `human_review_queue`
Items needing examiner override (low confidence or criteria spread > 1.5). Pro/Team plans only.

### `certificates`
| col | type |
|---|---|
| id | UUID PK |
| attempt_id | UUID UNIQUE FK exam_attempts(id) ON DELETE CASCADE |
| pdf_s3_key | TEXT |
| sha256 | TEXT |
| public_id | TEXT UNIQUE (short, URL-safe; for `aiexam.uz/verify/<id>`) |
| issued_at | TIMESTAMPTZ |
| revoked_at | TIMESTAMPTZ NULL |

---

## 5. Schema `billing` (added in Phase 4)

> See [`07-payments-and-billing.md`](07-payments-and-billing.md) for flow + provider details.

### `plans` (seed)
| col | type |
|---|---|
| id | TEXT PK (`free`, `starter`, `pro`, `team`) |
| name_uz, name_en | TEXT |
| price_uzs_monthly | BIGINT NULL (in tiyin) |
| price_uzs_yearly | BIGINT NULL |
| price_usd_monthly_cents | INT NULL |
| price_usd_yearly_cents | INT NULL |
| entitlements | JSONB (see §5.1) |
| is_public | BOOLEAN |
| sort_order | INT |

### Entitlement keys (canonical)
- `attempts.monthly_quota` — int or `"unlimited"`
- `skills.allowed` — `["reading","listening","writing","speaking"]`
- `feedback.detail` — `"none"` \| `"summary"` \| `"detailed"`
- `certificate.pdf` — bool
- `history.full` — bool
- `human_review.access` — bool
- `team.seats` — int (Team plan only)
- `support.priority` — bool

### `subscriptions`
| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| plan_id | TEXT FK plans(id) |
| status | TEXT (`trialing` \| `active` \| `past_due` \| `canceled` \| `expired`) |
| period | TEXT (`monthly` \| `yearly`) |
| current_period_start | TIMESTAMPTZ |
| current_period_end | TIMESTAMPTZ |
| cancel_at_period_end | BOOLEAN DEFAULT false |
| canceled_at | TIMESTAMPTZ NULL |
| provider | TEXT (`stripe` \| `click` \| `payme` \| `manual`) |
| provider_subscription_id | TEXT NULL |
| created_at, updated_at | TIMESTAMPTZ |

One active sub per user; constraint enforced at app level (race-free via `SELECT … FOR UPDATE`).

### `payment_intents` (start of every checkout)
| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) |
| plan_id | TEXT FK plans(id) |
| period | TEXT |
| amount | BIGINT (smallest unit) |
| currency | TEXT |
| provider | TEXT |
| provider_session_id | TEXT NULL |
| status | TEXT (`created` \| `redirected` \| `succeeded` \| `failed` \| `expired`) |
| metadata | JSONB |
| created_at, updated_at | TIMESTAMPTZ |

### `invoices`
One row per successful charge. `(provider, provider_invoice_id)` UNIQUE.

### `webhook_events`
Append-only log of every webhook received from any provider, with `processed_at`.

### `entitlement_overrides` (admin grants, e.g. promo codes)
| col | type |
|---|---|
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| key | TEXT (entitlement key) |
| value | JSONB |
| expires_at | TIMESTAMPTZ NULL |
| reason | TEXT |
| granted_by_user_id | UUID NULL |
| created_at | TIMESTAMPTZ |

---

## 6. Schema `exam_platform` — extended (cross-ref 13–17)

These tables support practice mode, feedback engine, learning roadmap, and analytics. They live in `exam_platform` (per-user runtime data).

### `feedback_artifacts`
Multi-layer feedback storage. See [`14-feedback-engine.md`](14-feedback-engine.md) §2.

| col | type |
|---|---|
| id | UUID PK |
| attempt_id | UUID FK exam_attempts(id) ON DELETE CASCADE |
| response_id | UUID FK attempt_responses(id) ON DELETE CASCADE NULL |
| layer | TEXT (`band` \| `criterion` \| `sentence` \| `word` \| `phoneme` \| `roadmap`) |
| skill | TEXT |
| payload | JSONB (shape per layer) |
| source | TEXT (`llm` \| `analyser` \| `human`) |
| model | TEXT NULL |
| prompt_version_id | TEXT NULL |
| created_at | TIMESTAMPTZ |

Indexes: `(attempt_id, layer, skill)`, `(response_id)`.

### `roadmaps`
| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| anchor_attempt_id | UUID NULL |
| target_band | NUMERIC(3,1) |
| target_date | DATE |
| weekly_hours | INT |
| current_band_estimate | NUMERIC(3,1) |
| predicted_band_at_target | JSONB (`{p10, p50, p90}`) |
| plan | JSONB |
| status | TEXT (`active` \| `at_risk` \| `superseded` \| `completed` \| `abandoned`) |
| created_at, updated_at | TIMESTAMPTZ |

Partial unique index: `(user_id) WHERE status = 'active'`.

### `srs_cards`
FSRS-4 spaced-repetition queue. See [`15-`](15-learning-roadmap.md) §5.

| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| ref_type | TEXT (`vocab_word` \| `grammar_rule` \| `phoneme_drill`) |
| ref_id | TEXT |
| stability | NUMERIC |
| difficulty | NUMERIC |
| due_at | TIMESTAMPTZ |
| reps | INT default 0 |
| lapses | INT default 0 |
| last_grade | TEXT NULL |
| created_at, updated_at | TIMESTAMPTZ |

Index: `(user_id, due_at)`.

### `drill_attempts`
Records of practice drills.

| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| drill_id | UUID FK data_engine.drills(id) |
| items_correct | INT |
| items_total | INT |
| duration_ms | INT |
| started_at, completed_at | TIMESTAMPTZ |

### `user_mastery`
Per-error-code mastery score.

| col | type |
|---|---|
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| code | TEXT FK data_engine.error_taxonomy(code) |
| mastery | NUMERIC(4,3) — 0..1 |
| last_practiced_at | TIMESTAMPTZ |
| PRIMARY KEY (user_id, code) | |

### `conversation_sessions` + `conversation_turns`
AI Conversation Partner. See [`16-`](16-practice-mode.md) §4.

```
conversation_sessions:
  id, user_id, topic_id, mode (async|realtime), started_at, ended_at,
  total_turns, aggregate_metrics (jsonb)

conversation_turns:
  id, session_id, turn_index, user_audio_s3_key, user_transcript,
  agent_response_text, agent_audio_url, feedback (jsonb), created_at
```

### `pronunciation_attempts`
Pronunciation Lab clips with GOP scores.

| col | type |
|---|---|
| id | UUID PK |
| user_id | UUID FK auth.users(id) ON DELETE CASCADE |
| phoneme | TEXT |
| word | TEXT |
| audio_s3_key | TEXT |
| gop | NUMERIC(4,3) |
| verdict | TEXT (`good` \| `acceptable` \| `needs_work`) |
| created_at | TIMESTAMPTZ |

---

## 7. Schema `data_engine` — extended

### `error_taxonomy` (seed)
~200 error codes. See [`14-`](14-feedback-engine.md) §2.

| col | type |
|---|---|
| code | TEXT PK |
| skill | TEXT |
| layer | TEXT |
| severity | TEXT |
| explanation_uz, explanation_en | TEXT |
| example_correct, example_wrong | TEXT |
| recommended_drill_ids | TEXT[] |

### `drills`
Catalogue of practice drills.

| col | type |
|---|---|
| id | UUID PK |
| code | TEXT UNIQUE |
| skill | TEXT |
| target_codes | TEXT[] FK error_taxonomy(code) |
| cefr_level | TEXT |
| duration_minutes | INT |
| payload | JSONB |
| variant_count | INT |
| created_at | TIMESTAMPTZ |

### `cefr_words` (seed)
CEFR-J + EVP joined wordlist for vocabulary analysis.

| col | type |
|---|---|
| word | TEXT |
| pos | TEXT |
| cefr_level | TEXT |
| awl | BOOLEAN |
| PRIMARY KEY (word, pos) | |

### `conversation_topics`
Curated topics for AI Conversation Partner.

| col | type |
|---|---|
| id | UUID PK |
| code | TEXT UNIQUE |
| skill | TEXT default `speaking` |
| cefr_level | TEXT |
| category | TEXT (`daily` \| `ielts_part2` \| `academic`) |
| name_uz, name_en | TEXT |
| prompt_uz, prompt_en | TEXT |
| follow_up_prompts | TEXT[] |
| created_at | TIMESTAMPTZ |

### `experiments` (research A/B)
See [`18-`](18-research-and-psychometrics.md) §6.

| col | type |
|---|---|
| id | UUID PK |
| name | TEXT |
| purpose | TEXT |
| variant_a_prompt_id, variant_b_prompt_id | TEXT |
| traffic_split | NUMERIC |
| status | TEXT |
| primary_metric | TEXT |
| min_sample_size | INT |
| created_at, started_at, ended_at | TIMESTAMPTZ |

---

## 8. Schema `analytics` — extended

### Materialised views (refreshed nightly 03:30 UTC)

- `analytics.user_mastery_daily_mat` — per-user × skill × CEFR mastery snapshots.
- `analytics.user_band_history_mat` — band per attempt over time.
- `analytics.user_error_freq_mat` — error code frequency, weekly delta.
- `analytics.user_time_spent_mat` — activity time breakdown.
- `analytics.cohort_stats_mat` — cohort-similarity buckets for roadmap MC simulation.
- `analytics.jury_metrics_daily_mat` — Cohen's κ, Fleiss κ time series.
- `analytics.roadmap_calibration_mat` — predicted vs actual band buckets.
- `analytics.daily_metrics_mat` — KPIs (signups, attempts, MRR, costs).

### `irr_studies` (long-form)
Inter-rater reliability research records.

| col | type |
|---|---|
| id | UUID PK |
| model_version | TEXT |
| n_essays | INT |
| pearson_r, kappa_quadratic, mae | NUMERIC |
| ci_low, ci_high | JSONB |
| conducted_at | TIMESTAMPTZ |

---

## 9. Schema `analytics` (original)

### `events`
| col | type |
|---|---|
| id | BIGSERIAL PK |
| ts | TIMESTAMPTZ DEFAULT now() |
| user_id | UUID NULL |
| anonymous_id | TEXT NULL (cookie) |
| type | TEXT (`signup`, `login`, `attempt_started`, `payment_succeeded`, ...) |
| payload | JSONB |
| ip | INET NULL |
| user_agent | TEXT NULL |

Index: `(type, ts)`, `(user_id, ts)`.

### `llm_calls`
Every LLMRouter call writes here. See [`06-ai-pipelines.md`](06-ai-pipelines.md) for fields + the dashboard query that powers `/admin/llm-usage`.

### `item_response_data`
Anonymised feed for IRT recalibration. `(item_id, user_pseudo_id, was_correct, time_ms, theta_at_answer, ts)`.

### `daily_metrics_mat` (materialised view)
Refreshed nightly. Powers admin KPIs (signups/day, attempts/day, MRR).

---

## 7. DDL examples

```sql
-- Initial schemas + extensions (run by scripts/init-db.sql at first boot)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS data_engine;
CREATE SCHEMA IF NOT EXISTS exam_platform;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS analytics;
```

```sql
-- Example: question_embeddings + HNSW index
CREATE TABLE data_engine.question_embeddings (
    question_id UUID PRIMARY KEY REFERENCES data_engine.questions(id) ON DELETE CASCADE,
    embedding   VECTOR(768) NOT NULL,
    model       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON data_engine.question_embeddings
    USING hnsw (embedding vector_cosine_ops);
```

```sql
-- Example: Subscriptions with "one active" partial unique
CREATE UNIQUE INDEX one_active_sub_per_user
ON billing.subscriptions (user_id)
WHERE status IN ('trialing', 'active', 'past_due');
```

---

## 8. Migrations

- One Alembic env per service (`apps/<svc>/alembic/`). Each env restricts `include_object` to its schema(s).
- `auth-api` owns `auth`. `data-engine-api` owns `data_engine` + `analytics`. `exam-platform-api` owns `exam_platform` + `billing`.
- Migration filename: `YYYYMMDDHHMM_<author>_<slug>.py`.
- Every migration must implement both `upgrade()` and `downgrade()`.
- Data migrations (backfills) wrapped in `op.execute()` with a comment explaining intent.

---

## 9. Cross-schema reads

| Reader | Reads | Writer |
|---|---|---|
| exam-platform-api | `auth.users` (lookup by id) | auth-api |
| data-engine-api | `auth.users` (admin authorisation) | auth-api |
| data-engine-api | `analytics.item_response_data` (calibration) | exam-platform-api |
| billing background job | `auth.users.email` (invoice email) | auth-api |

No service writes to another's primary schema. Reads are always `SELECT` — never `JOIN UPDATE`.

---

## 10. Acceptance

- [ ] `alembic upgrade head` against an empty DB produces all 5 schemas with all tables in `<5 seconds`.
- [ ] `alembic downgrade base` reverses cleanly.
- [ ] Every FK has an explicit `ON DELETE`.
- [ ] Every JSONB column has a `CHECK` constraint or schema validator at the app level.
- [ ] `EXPLAIN` on `SELECT * FROM data_engine.questions WHERE status='approved' AND skill_id=$1 ORDER BY ...` uses the `(status, skill_id)` index.
- [ ] HNSW recall@5 ≥ 0.95 on a 1000-vector benchmark.
- [ ] No `public.<table>` in production except `alembic_version` per schema.
