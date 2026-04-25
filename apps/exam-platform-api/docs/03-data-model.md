# 03 — Data Model (schema `exam_platform`)

## Tables

### `exams`
- id, blueprint_code (e.g. `ielts-academic-full`), is_active, created_at

### `exam_attempts`
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| exam_id | uuid FK | |
| blueprint_snapshot | jsonb | frozen at start (sections, item counts) |
| state | enum: `in_progress | completed | abandoned | invalidated` | |
| theta_estimates | jsonb | per-skill: `{listening: 0.4, ...}` |
| theta_se | jsonb | standard errors |
| started_at, finished_at, expires_at | timestamptz | |
| locale | text | for feedback language |

### `attempt_sections`
- id, attempt_id, section_index, skill, started_at, finished_at, time_used_seconds

### `attempt_responses`
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| attempt_id | uuid FK | |
| section_id | uuid FK | |
| item_id | uuid | (from data-engine, no FK across schema) |
| item_snapshot | jsonb | (no answer key) |
| type | enum (`mcq_single`, ...) | |
| raw_answer | jsonb | varies by type |
| audio_recording_id | uuid FK nullable | |
| is_correct | bool nullable | null until scored |
| partial_credit | numeric nullable | 0..1 |
| theta_at_answer | numeric | snapshot |
| time_ms | int | |
| answered_at | timestamptz | |

### `audio_recordings`
- id, response_id FK, s3_key, duration_seconds, format, bytes, uploaded_at

### `transcripts` (for speaking)
- id, audio_id FK, text, raw_provider_response jsonb, model, created_at

### `llm_scoring_runs`
- id, response_id FK, rubric_id (data-engine ref), model, prompt_version_id, raw_response jsonb, criteria_scores jsonb, overall_band numeric, confidence numeric, cost_cents int, latency_ms int, created_at

### `scoring_results` (final)
- id, response_id FK UNIQUE, source enum: `llm | human | hybrid`, band numeric, criteria jsonb, feedback_uz text, feedback_en text, finalized_at

### `human_review_queue`
- id, response_id FK, reason text (low_confidence | criteria_spread | manual_request), assigned_to nullable, decided_at nullable, decision jsonb

### `feedback`
- id, attempt_id FK, overall_summary_uz, overall_summary_en, strengths jsonb, weaknesses jsonb, recommendations jsonb

### `certificates`
- id, attempt_id FK UNIQUE, pdf_s3_key, sha256, issued_at, revoked_at nullable

## Migrations
- `apps/exam-platform-api/alembic/`
- One migration per PR
