# API Contracts

> **Language**: English (technical reference)
> **Audience**: Both backend developers (Bobomurod, Faxriddin) and frontend integrators.
> **Status**: v1 frozen as of week 2; breaking changes require ADR.

This document defines the **stable** REST contracts between LanguagePro AI services. It is the single source of truth — both `data-engine-api` and `exam-platform-api` derive their `packages/contracts/` types from this document, and all clients (web apps, CLI tools, third-party researchers) consume only these endpoints.

---

## 1. URL conventions

| Environment | Base URL | Notes |
|---|---|---|
| Local dev | `http://api.localhost/{service}/v1` | Caddy routes by Host |
| Staging | `https://api.staging.languagepro.ai/{service}/v1` | TBD |
| Production | `https://api.languagepro.ai/{service}/v1` | |

Service slugs: `auth`, `data`, `exam`. Examples:
- `POST https://api.languagepro.ai/auth/v1/login`
- `GET  https://api.languagepro.ai/data/v1/items/next`
- `POST https://api.languagepro.ai/exam/v1/attempts`

---

## 2. Authentication & authorization

### 2.1. End-user authentication (browser → all APIs)

Cookie-based, issued by `auth-api`:

| Cookie | Purpose | Attributes |
|---|---|---|
| `__Host-lp_access` | Short-lived JWT (15 min) | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| `__Host-lp_refresh` | Refresh token (30 days) | `HttpOnly; Secure; SameSite=Strict; Path=/auth/v1/refresh` |

Cookies are scoped to `Domain=.languagepro.ai` (prod) or `Domain=.localhost` (dev) so all subdomains share session.

JWT payload (HS256):
```json
{
  "sub": "user-uuid",
  "roles": ["student"],
  "locale": "uz",
  "iat": 1714060800,
  "exp": 1714061700,
  "iss": "auth.languagepro.ai",
  "aud": "languagepro.ai"
}
```

### 2.2. Service-to-service (S2S) authentication

`exam-platform-api` → `data-engine-api` calls require an additional `Authorization: Bearer <s2s-jwt>` header. JWT properties:

| Field | Value |
|---|---|
| `iss` | `exam-platform` |
| `aud` | `data-engine` |
| `exp` | now + 300 (5 minutes) |
| `iat` | now |
| `jti` | unique uuid (replay prevention) |
| `scope` | array of allowed actions, e.g. `["items:next", "items:key", "responses:write"]` |

Signed with `S2S_SHARED_SECRET` (HS256, rotated quarterly). The data-engine validates `iss`, `aud`, `exp`, `scope`, and tracks `jti` in Redis for replay defense.

### 2.3. Researcher API tokens

Long-lived `api_keys` (hashed, prefixed `lp_pk_…`) for researcher CSV exports. `Authorization: Bearer lp_pk_...`. Read-only, scoped to `analytics.item_response_data` exports.

---

## 3. Common conventions

### 3.1. Versioning

URL-based: `/v1/...`. Breaking changes require a new version path; old versions supported for 6 months minimum.

### 3.2. Pagination

Cursor-based:

Request: `GET /v1/questions?limit=50&cursor=eyJ...`

Response:
```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "eyJ...",
    "has_more": true
  }
}
```

### 3.3. Error format

All errors follow [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457):

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.languagepro.ai/errors/invalid-cefr-level",
  "title": "Invalid CEFR level",
  "status": 422,
  "detail": "Provided level 'D1' is not in {A1,A2,B1,B2,C1,C2}",
  "instance": "/data/v1/questions",
  "errors": [
    {"field": "cefr_level", "code": "enum_value_error"}
  ],
  "request_id": "01HW9..."
}
```

### 3.4. Tracing & idempotency

| Header | Direction | Purpose |
|---|---|---|
| `X-Request-Id` | Client → Server | Echoed back; ULID format. Auto-generated if missing. |
| `Idempotency-Key` | Client → Server | Required on `POST` for mutations (creating attempts, responses); 24h TTL in Redis. |
| `X-API-Version` | Server → Client | E.g. `v1.3.0` for observability. |

### 3.5. Locales

`Accept-Language: uz, en;q=0.8` — preferred locale for human-readable error messages and feedback. Defaults to `en` if not provided.

---

## 4. `auth-api` endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/v1/register` | none | Create student account (email + password) |
| `POST` | `/v1/login` | none | Issue access + refresh cookies |
| `POST` | `/v1/refresh` | refresh cookie | Rotate access token |
| `POST` | `/v1/logout` | access cookie | Revoke refresh token |
| `GET`  | `/v1/me` | access cookie | Current user, roles, locale |
| `POST` | `/v1/oauth/google/start` | none | OAuth init |
| `POST` | `/v1/oauth/google/callback` | none | OAuth complete |
| `POST` | `/v1/admin/api-keys` | role=`superadmin` | Mint researcher key |

Key DTOs:

```typescript
// POST /v1/login
interface LoginRequest { email: string; password: string; }
interface LoginResponse {
  user: { id: string; email: string; roles: string[]; locale: 'uz' | 'en'; };
}
// Cookies are set by server.

// GET /v1/me
interface MeResponse {
  id: string;
  email: string;
  display_name: string | null;
  roles: ('student' | 'examiner' | 'content_admin' | 'researcher' | 'superadmin')[];
  locale: 'uz' | 'en';
  created_at: string;  // ISO 8601
}
```

---

## 5. `data-engine-api` endpoints (Bobomurod)

### 5.1. Public (consumed by `exam-platform-api` via S2S, and by `data-engine-web`)

| Method | Path | Required scope / role | Purpose |
|---|---|---|---|
| `GET`  | `/v1/items/next` | S2S `items:next` OR role≥examiner | IRT-based next item for an attempt |
| `GET`  | `/v1/items/{id}` | S2S `items:read` OR role≥examiner | Question payload (no answer key) |
| `GET`  | `/v1/items/{id}/key` | S2S `items:key` only | Answer key (browsers cannot call) |
| `GET`  | `/v1/rubrics/{skill}/{level}` | S2S OR role≥examiner | Scoring rubric |
| `GET`  | `/v1/exams/blueprints` | S2S OR role≥examiner | List blueprints |
| `GET`  | `/v1/exams/blueprints/{id}` | S2S OR role≥examiner | Full blueprint structure |
| `POST` | `/v1/items/{id}/response` | S2S `responses:write` | Empirical response data for IRT recalibration |

### 5.2. Admin (data-engine-web only, role≥content_admin)

| Method | Path | Purpose |
|---|---|---|
| `GET/POST` | `/v1/banks` | Question bank CRUD |
| `GET/POST/PATCH` | `/v1/questions` | Question CRUD (with status filter) |
| `POST` | `/v1/questions/{id}/approve` | Move from review to published |
| `POST` | `/v1/generation/jobs` | Start a generation batch |
| `GET`  | `/v1/generation/jobs/{id}` | Job status |
| `GET`  | `/v1/generation/jobs/{id}/events` | SSE stream of job progress |
| `GET/POST/PATCH` | `/v1/prompts` | Prompt template CRUD + versioning |
| `GET/PATCH` | `/v1/llm-config` | View/edit `runtime_config` (LLM profile hot-swap) |
| `GET`  | `/v1/calibration/runs` | List calibration runs |
| `GET`  | `/v1/calibration/items/{id}/history` | Per-item parameter history |
| `GET`  | `/v1/exports/responses.csv` | Researcher CSV export (api-key auth) |

### 5.3. Key DTOs

```typescript
// GET /v1/items/next?attempt_id=&theta=&skill=&exclude_ids[]=&blueprint_id=
interface NextItemRequest {
  attempt_id: string;
  theta: number;          // current θ estimate, default 0
  skill: 'listening' | 'reading' | 'writing' | 'speaking';
  exclude_ids?: string[]; // already seen
  blueprint_id?: string;  // optional constraint
}
interface NextItemResponse {
  item: {
    id: string;
    type: QuestionType;        // see § 5.4
    payload: QuestionPayload;  // shape depends on type, see § 5.5
    skill: Skill;
    cefr_level: CefrLevel;
    section_part?: number;
    estimated_seconds: number;
    audio_url?: string;        // pre-signed, for listening/speaking
  };
  selection_metadata: {
    fisher_information: number;
    estimated_b: number;
    estimated_a: number;
  };
}

// POST /v1/items/{id}/response (S2S)
interface ItemResponseEvent {
  attempt_id: string;
  user_theta_at_answer: number;
  is_correct: boolean | null;     // null for writing/speaking (graded async)
  partial_credit?: number;        // 0..1
  time_ms: number;
  device_metadata?: { ua: string; locale: string; };
}
```

### 5.4. Question type taxonomy

```typescript
type QuestionType =
  // Reading / Listening
  | 'mcq_single'        // single correct option
  | 'mcq_multi'         // multiple correct
  | 'true_false_ng'     // True / False / Not Given
  | 'yes_no_ng'         // Yes / No / Not Given (writer's views)
  | 'matching'
  | 'matching_headings'
  | 'sentence_completion'
  | 'summary_completion'
  | 'short_answer'
  | 'diagram_labelling'
  // Writing
  | 'writing_task1_academic'
  | 'writing_task1_general'
  | 'writing_task2'
  // Speaking
  | 'speaking_part1_question'
  | 'speaking_part2_cue_card'
  | 'speaking_part3_question';
```

### 5.5. Payload shapes (illustrative)

```typescript
interface MCQSinglePayload {
  prompt: string;          // markdown supported
  passage_id?: string;     // for reading
  options: { id: string; label: string; }[];
  word_limit?: never;
}

interface MCQSingleAnswerKey {  // returned by /items/{id}/key
  correct_option_id: string;
  rationale: string;            // for explanation in feedback
}

interface WritingTask2Payload {
  prompt: string;
  word_limit_min: 250;
  word_limit_max: 400;
  time_limit_minutes: 40;
}

interface WritingTask2Rubric {
  criteria: ('task_response' | 'coherence_cohesion' |
             'lexical_resource' | 'grammatical_range_accuracy')[];
  band_descriptors: Record<CefrBand, Record<Criterion, string>>;
}
```

---

## 6. `exam-platform-api` endpoints (Faxriddin)

### 6.1. Student-facing (browser, JWT cookie)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/v1/exams/blueprints` | List available exams |
| `POST` | `/v1/attempts` | Start a new exam attempt |
| `GET`  | `/v1/attempts/{id}` | Attempt state |
| `GET`  | `/v1/attempts/{id}/next-item` | Get next adaptive item (proxies data-engine) |
| `POST` | `/v1/attempts/{id}/responses` | Submit a response (mcq, essay, audio s3_key) |
| `POST` | `/v1/attempts/{id}/sections/{n}/finish` | Mark section complete |
| `POST` | `/v1/attempts/{id}/finish` | Finalize attempt (triggers final scoring) |
| `GET`  | `/v1/attempts/{id}/results` | Per-section + overall band + feedback |
| `GET`  | `/v1/attempts/{id}/certificate` | Signed certificate PDF URL |
| `GET`  | `/v1/uploads/audio/presign` | Get S3 presigned PUT URL for audio recording |
| `GET`  | `/v1/me/history` | Attempt history |

### 6.2. Examiner (role=examiner)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/v1/review-queue` | Items needing human review (low confidence) |
| `POST` | `/v1/review-queue/{id}/decide` | Override LLM grade |

### 6.3. Key DTOs

```typescript
// POST /v1/attempts
interface StartAttemptRequest {
  blueprint_id: string;       // e.g. "ielts-academic-full" or "cefr-quick-placement"
  locale?: 'uz' | 'en';       // student locale for feedback
}
interface StartAttemptResponse {
  attempt_id: string;
  blueprint: ExamBlueprint;
  current_section: { index: number; skill: Skill; time_limit_seconds: number; };
  expires_at: string;         // ISO 8601, attempt becomes invalid after
}

// POST /v1/attempts/{id}/responses
interface SubmitResponseRequest {
  item_id: string;
  type: QuestionType;
  // exactly one of the following present:
  mcq_choice_id?: string;
  mcq_choice_ids?: string[];
  text_answer?: string;        // for short_answer, completions
  essay?: string;              // for writing tasks
  audio_s3_key?: string;       // for speaking; pre-uploaded via presign
  time_ms: number;
}
interface SubmitResponseResponse {
  response_id: string;
  graded_synchronously: boolean;  // false for writing/speaking
  is_correct?: boolean;           // for objective items
  next_item?: NextItemResponse;   // null at section end
}

// GET /v1/attempts/{id}/results
interface AttemptResults {
  attempt_id: string;
  finished_at: string;
  overall_band: number;        // 0..9 in 0.5 steps
  cefr_level: CefrLevel;
  sections: {
    skill: Skill;
    band: number;
    raw_correct?: number;
    raw_total?: number;
    criteria_scores?: Record<string, number>;  // for writing/speaking
    feedback_uz: string;
    feedback_en: string;
    confidence: number;        // 0..1; below threshold flags review
  }[];
  certificate_url?: string;
  scoring_metadata: {
    llm_total_cost_usd: number;
    elapsed_seconds: number;
    needs_review: boolean;
  };
}

// GET /v1/uploads/audio/presign?attempt_id=&item_id=&duration_hint_seconds=
interface PresignResponse {
  url: string;                 // PUT here
  s3_key: string;              // pass back in submit
  expires_at: string;
  max_bytes: number;
  required_headers: Record<string, string>;  // e.g. Content-Type
}
```

---

## 7. SSE / streaming endpoints

| Endpoint | Auth | Event types |
|---|---|---|
| `GET /data/v1/generation/jobs/{id}/events` | role=content_admin | `progress`, `item_generated`, `item_validated`, `done`, `error` |
| `GET /exam/v1/attempts/{id}/scoring/events` | attempt owner | `scoring_started`, `transcript_ready`, `scoring_done` |

Format: standard `text/event-stream`, JSON `data:` payloads, named `event:` types.

---

## 8. Rate limiting

| Endpoint group | Limit (per IP) | Limit (per user) |
|---|---|---|
| `/auth/v1/login` | 5 / minute | — |
| `/auth/v1/register` | 3 / hour | — |
| `/exam/v1/attempts/*` (writes) | 60 / minute | 30 / minute |
| `/data/v1/generation/jobs` | — | 5 / hour (content_admin) |
| `/data/v1/items/*` (S2S) | — | unlimited (S2S trusted) |
| Default | 120 / minute | 200 / minute |

`429 Too Many Requests` includes `Retry-After: <seconds>`.

---

## 9. Versioning & deprecation policy

- **MINOR additions** (new optional fields, new endpoints): no version bump, announced in [`CHANGELOG.md`](../CHANGELOG.md).
- **BREAKING changes** require:
  1. ADR in `docs/adr/`
  2. New URL version (`/v2/...`)
  3. 6-month overlap period
  4. `Sunset:` HTTP header on deprecated endpoints
- DTOs are generated to TypeScript via `packages/contracts/`. Server is source of truth (FastAPI's auto OpenAPI → `openapi-typescript` → `.ts`).

---

## 10. Open contracts not yet finalized (will be ratified by week 2)

| # | Open question | Owner |
|---|---|---|
| 1 | Streaming response for real-time speaking (Phase 2) — separate doc ADR-EP-0003 | Faxriddin |
| 2 | Bulk import endpoint for legacy questions (CSV) | Bobomurod |
| 3 | Webhook signature scheme for third-party LMS integrations (post-MVP) | Joint |

---

_Last reviewed: 2026-04-26 by joint authors. Contract frozen at v1 from week 2._
