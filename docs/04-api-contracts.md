# 04 — API Contracts

> **TL;DR.** REST under `https://api.aiexam.uz/{auth,data,exam}/v1/*`. Cookie auth for browsers, S2S JWT for `exam-api → data-api`, API keys for researchers. JSON in/out, RFC 9457 Problem Details for errors. ULID `X-Request-Id` echoed back. Cursor pagination. Strict Pydantic on input — `extra="forbid"`. Never trust client values for `user_id`, `attempt_id`, `band` — derive from auth or DB.

---

## 1. Conventions

| Header | Direction | Purpose |
|---|---|---|
| `X-Request-Id` | C ↔ S | ULID; auto-generated if missing |
| `Idempotency-Key` | C → S | Required on `POST` mutations; 24h TTL in Redis |
| `X-CSRF-Token` | C → S | Required on mutation when authed via cookie; matches `__Host-lp_csrf` cookie |
| `Accept-Language` | C → S | `uz, en;q=0.8` — affects locale-bound feedback |
| `Authorization: Bearer <s2s>` | exam-api → data-api | Short-lived S2S JWT |
| `Authorization: Bearer lp_pk_…` | researcher → data-api | API key |

Errors (RFC 9457):
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.aiexam.uz/errors/invalid-cefr-level",
  "title": "Invalid CEFR level",
  "status": 422,
  "detail": "Provided level 'D1' is not in {A1,A2,B1,B2,C1,C2}",
  "instance": "/data/v1/questions",
  "request_id": "01HW9...",
  "errors": [{"field": "cefr_level", "code": "enum_value_error"}]
}
```

Pagination: cursor-based.
```json
GET /v1/questions?limit=50&cursor=eyJ...
{ "data": [...], "pagination": { "next_cursor": "eyJ...", "has_more": true } }
```

Rate limits: per-IP and per-user. `429` includes `Retry-After`. Default 120/min.

---

## 2. `auth-api` — `/auth/v1/*`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/register` | none | `{email, password, locale?, display_name?}` → 201 + cookies |
| POST | `/v1/login` | none | `{email, password}` → 200 + cookies |
| POST | `/v1/refresh` | refresh cookie | Rotate; 200 + new cookies |
| POST | `/v1/logout` | access | Revoke refresh; 204 + clear cookies |
| GET | `/v1/me` | access | Current user, roles, locale, theme |
| PATCH | `/v1/me` | access | `{display_name?, locale?, theme?}` |
| POST | `/v1/me/change-password` | access | `{current, new}` |
| POST | `/v1/me/delete` | access | Soft-delete, schedule purge |
| GET | `/v1/oauth/google/start` | none | Returns redirect URL |
| GET | `/v1/oauth/google/callback` | state cookie | Sets cookies, redirects to `returnTo` |
| POST | `/v1/admin/api-keys` | role=`superadmin` | Mint researcher key |
| GET | `/v1/admin/api-keys` | role=`superadmin` | List + last_used_at |
| DELETE | `/v1/admin/api-keys/{id}` | role=`superadmin` | Revoke |

Key DTOs:

```ts
interface RegisterRequest { email: string; password: string; locale?: 'uz'|'en'; display_name?: string }
interface LoginRequest    { email: string; password: string }
interface User {
  id: string; email: string; display_name: string|null;
  roles: ('student'|'examiner'|'content_admin'|'researcher'|'superadmin')[];
  locale: 'uz'|'en'; theme: 'system'|'light'|'dark';
  created_at: string;
}
interface MePatch { display_name?: string|null; locale?: 'uz'|'en'; theme?: 'system'|'light'|'dark' }
```

Rate limits: `/login` 5/min/IP, `/register` 3/hour/IP, `/refresh` 30/min/user.

---

## 3. `data-engine-api` — `/data/v1/*`

### 3.1 S2S endpoints (consumed by exam-api)

| Method | Path | Required scope | Purpose |
|---|---|---|---|
| GET | `/v1/items/next` | `items:next` | IRT next item; query: `attempt_id, theta, skill, exclude_ids[]` |
| GET | `/v1/items/{id}` | `items:read` | Item payload (no answer key) |
| GET | `/v1/items/{id}/key` | `items:key` | Answer key |
| GET | `/v1/rubrics/{skill}/{level}` | `rubrics:read` | Scoring rubric |
| GET | `/v1/exams/blueprints` | `blueprints:read` | List active blueprints |
| GET | `/v1/exams/blueprints/{code}` | `blueprints:read` | Full blueprint |
| POST | `/v1/items/{id}/response` | `responses:write` | Empirical response (IRT recalibration data) |

### 3.2 Admin (cookie + role)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET/POST | `/v1/banks` | content_admin+ | Bank CRUD |
| GET/POST/PATCH | `/v1/questions` | content_admin+ | Question CRUD with `?status=` filter |
| POST | `/v1/questions/{id}/approve` | content_admin+ | review→published |
| POST | `/v1/questions/{id}/reject` | content_admin+ | mark rejected |
| GET/POST | `/v1/generation/jobs` | content_admin+ | List + create |
| GET | `/v1/generation/jobs/{id}` | content_admin+ | Status |
| GET | `/v1/generation/jobs/{id}/events` | content_admin+ | SSE progress (`progress`, `item_generated`, `done`) |
| GET/POST/PATCH | `/v1/prompts` | content_admin+ | Prompt template CRUD + versioning |
| GET/PATCH | `/v1/llm-config` | superadmin | runtime_config |
| GET | `/v1/calibration/runs` | content_admin+ | List |
| GET | `/v1/calibration/items/{id}/history` | content_admin+ | Per-item param history |
| GET | `/v1/review-queue` | examiner+ | Items needing human review |
| POST | `/v1/review-queue/{id}/decide` | examiner+ | `{verdict, edits, comment}` |
| GET | `/v1/analytics/llm-usage/summary` | content_admin+ | KPIs |
| GET | `/v1/analytics/llm-usage/by-purpose` | content_admin+ | Breakdown |
| GET | `/v1/analytics/llm-usage/by-model` | content_admin+ | Breakdown |
| GET | `/v1/analytics/llm-usage/timeseries` | content_admin+ | Per-bucket |
| GET | `/v1/analytics/llm-usage/calls` | content_admin+ | Paginated raw |
| GET | `/v1/analytics/llm-usage/budget` | superadmin | Configured limits |
| PATCH | `/v1/analytics/llm-usage/budget` | superadmin | Set limits |

### 3.3 Researcher (api key)

| Method | Path | Scope | Purpose |
|---|---|---|---|
| GET | `/v1/exports/responses.csv` | `analytics:read` | Anonymised empirical data |
| GET | `/v1/exports/questions.csv` | `analytics:read` | Approved question metadata |

### 3.4 Public (no auth, used by landing + verify)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/blueprints/public` | List of exams to advertise on landing |
| GET | `/v1/verify/{public_id}` | Look up a certificate by public ID (returns name, band, exam, date) |

### 3.5 Key DTOs

```ts
type Skill = 'listening'|'reading'|'writing'|'speaking';
type CefrLevel = 'A1'|'A2'|'B1'|'B2'|'C1'|'C2';

interface NextItemRequest { attempt_id: string; theta: number; skill: Skill; exclude_ids?: string[] }
interface NextItemResponse {
  item: {
    id: string; type: QuestionType; skill: Skill; cefr_level: CefrLevel;
    payload: ItemPayload; estimated_seconds: number; audio_url?: string;
  };
  selection_metadata: { fisher_information: number; b: number; a: number; theta: number };
}

interface GenerationJobCreate {
  skill: Skill; cefr_level: CefrLevel; topic: string; count: number; bank_id?: string;
}
```

---

## 4. `exam-platform-api` — `/exam/v1/*`

### 4.1 Student (cookie)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/exams` | List active exams (locale-aware names) |
| POST | `/v1/attempts` | `{blueprint_code, locale?}` → attempt + first item |
| GET | `/v1/attempts/{id}` | Attempt state |
| GET | `/v1/attempts/{id}/next-item` | Next item only (used by ExamRunner reload) |
| POST | `/v1/attempts/{id}/responses` | Submit response |
| POST | `/v1/attempts/{id}/sections/{n}/finish` | Mark section complete |
| POST | `/v1/attempts/{id}/finish` | Finalise; trigger async scoring |
| GET | `/v1/attempts/{id}/results` | Per-skill bands + overall + feedback |
| GET | `/v1/attempts/{id}/scoring/events` | SSE: `scoring_started, transcript_ready, scoring_done` |
| GET | `/v1/attempts/{id}/certificate` | Signed PDF URL (entitlement-gated) |
| GET | `/v1/uploads/audio/presign` | `?attempt_id=&item_id=&duration_hint_seconds=` → presigned PUT |
| GET | `/v1/me/history` | Past attempts with bands |
| GET | `/v1/me/stats` | Cohort stats + skill trend |
| GET | `/v1/me/entitlements` | Current plan + remaining quotas (e.g. attempts_left) |

### 4.2 Examiner

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/review-queue` | Mirrors data-api `/review-queue` with cross-link to attempt response |

### 4.3 Billing (Phase 4)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/plans` | none | Public plan list with prices |
| POST | `/v1/checkout/sessions` | cookie | `{plan_id, period, currency, provider}` → redirect URL |
| POST | `/v1/checkout/cancel` | cookie | Cancel current subscription at period end |
| POST | `/v1/checkout/resume` | cookie | Undo cancel |
| GET | `/v1/me/billing` | cookie | Current subscription, invoices, next renewal |
| POST | `/v1/webhooks/stripe` | signature | Stripe webhook ingest |
| POST | `/v1/webhooks/click` | signature | Click webhook ingest |
| POST | `/v1/webhooks/payme` | signature | Payme webhook ingest |

**Webhook handlers must be idempotent.** See [`07-payments-and-billing.md`](07-payments-and-billing.md) §6.

### 4.4 Key DTOs

```ts
interface StartAttemptRequest { blueprint_code: string; locale?: 'uz'|'en' }
interface StartAttemptResponse {
  attempt_id: string;
  blueprint_snapshot: ExamBlueprint;
  current_section_index: number;
  current_item: ItemView | null;
  expires_at: string;
}

interface ItemView {
  id: string; type: QuestionType; skill: Skill; cefr_level: CefrLevel;
  payload: { passage?: string; prompt?: string; options?: {id:string;label:string}[]; audio_url?: string };
  estimated_seconds: number;
}

interface SubmitResponseRequest {
  item_id: string;
  type: QuestionType;
  mcq_choice_id?: string;       // mcq_single
  mcq_choice_ids?: string[];    // mcq_multi
  text_answer?: string;         // short_answer, completions
  essay?: string;               // writing tasks
  audio_s3_key?: string;        // speaking
  time_ms: number;
}
interface SubmitResponseResponse {
  response_id: string;
  graded_synchronously: boolean;
  is_correct?: boolean;
  next_item: ItemView | null;
  section_complete: boolean;
  attempt_complete: boolean;
}

interface AttemptResults {
  attempt_id: string;
  finished_at: string;
  overall_band: number;
  cefr_level: CefrLevel;
  sections: {
    skill: Skill;
    band: number;
    raw_correct?: number; raw_total?: number;
    criteria_scores?: Record<string, number>;
    feedback_uz: string; feedback_en: string;
    confidence: number;
  }[];
  certificate_url?: string;
  entitlements_used: { attempts_remaining: number | 'unlimited' };
}
```

---

## 5. SSE event format

```
event: progress
data: {"job_id":"…","total":20,"done":7,"approved":5,"in_review":1,"rejected_dup":1}

event: item_generated
data: {"job_id":"…","item_id":"…","status":"approved"}

event: done
data: {"job_id":"…","totals":{...}}
```

Browser code:
```ts
const es = new EventSource('/data/v1/generation/jobs/abc/events', { withCredentials: true });
es.addEventListener('progress', e => update(JSON.parse(e.data)));
es.addEventListener('done', () => es.close());
```

---

## 6. Idempotency rules

- Every `POST` that mutates state requires `Idempotency-Key`. Server stores `(key, user_id, response_body, ts)` in Redis (24h TTL).
- A retried request with the same key returns the original response **even if** the resource has changed since.
- Webhook handlers use `(provider, provider_event_id)` UNIQUE in `billing.webhook_events` for idempotency.

---

## 7. Versioning

URL-major version (`/v1/...`). Breaking changes require:
1. ADR in `docs/_adr/`.
2. New version path (`/v2/...`).
3. 6-month overlap.
4. `Sunset:` HTTP header on deprecated endpoints.

Additive changes (new optional field, new endpoint) — bump only `X-API-Version: vMAJOR.MINOR.PATCH`, add a `CHANGELOG.md` entry.

---

## 8. OpenAPI generation

- Each FastAPI app exposes `/v1/openapi.json`.
- Frontend `packages/contracts` regenerates TS types via `openapi-typescript` on `pnpm contracts:generate`.
- Hand-written Zod schemas in `packages/contracts/src/index.ts` are the single source for runtime validation; they must match server DTOs.

---

## 9. Acceptance

- [ ] Every endpoint has a Pydantic request model with `extra="forbid"`.
- [ ] Every endpoint has a typed `response_model`.
- [ ] All 4xx responses are RFC 9457 Problem Details.
- [ ] Cookies set by `auth-api` are visible to `data-api` and `exam-api` per `.aiexam.uz` apex domain.
- [ ] CORS regex matches `https?://(.*\.)?(localhost|aiexam\.uz)(:\d+)?` and rejects everything else.
- [ ] Pre-flight `OPTIONS` for every mutation succeeds with `Access-Control-Allow-Credentials: true`.
- [ ] Replay attack: posting a webhook twice with the same `provider_event_id` results in one charge, not two.
- [ ] An Idempotency-Key replay on `POST /attempts/{id}/responses` returns the original response and does not double-grade.
