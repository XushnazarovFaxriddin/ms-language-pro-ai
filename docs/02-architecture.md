# 02 — Architecture

> **TL;DR.** Six deployable services on three subdomains: `landing` (marketing), `app` (student exam UI), `admin` (content team UI), `auth-api` (SSO), `data-api` (questions, generation, billing read), `exam-api` (attempts, scoring). Two background workers: `data-worker`, `exam-worker`. One Postgres cluster (4 logical schemas). One Redis. One S3 bucket family. Caddy in front, Sentry + Langfuse for observability. Stateless services; cookies cross subdomains via `.aiexam.uz` apex.

---

## 1. Service map

```
                            ┌─────────────────────────────────────┐
                            │              Cloudflare              │
                            │           (DNS + WAF + CDN)          │
                            └────────────────┬────────────────────┘
                                             │ TLS 1.3
                            ┌────────────────▼────────────────────┐
                            │              Caddy 2                 │
                            │  aiexam.uz → landing                 │
                            │  app.aiexam.uz → exam-platform-web   │
                            │  admin.aiexam.uz → data-engine-web   │
                            │  api.aiexam.uz/{auth,data,exam}/v1/*│
                            └────────────────┬────────────────────┘
                                             │
        ┌────────────────┬───────────────────┼───────────────────┬────────────────┐
        ▼                ▼                   ▼                   ▼                ▼
  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ ┌──────────────┐
  │ landing  │    │ exam-platform│    │ data-engine  │    │  auth-api    │ │ data-api     │
  │ (Next)   │    │ -web (Next)  │    │ -web (Next)  │    │  (FastAPI)   │ │ exam-api     │
  └──────────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ └──────┬───────┘
                         │                    │                    │               │
                         └────────────┬───────┴────────────────────┴───────────────┘
                                      │ JWT cookie (browser) + S2S JWT (svc → svc)
                                      ▼
                       ┌────────────────────────────────────┐
                       │         Postgres 17 + pgvector      │
                       │   schemas: auth, data_engine,       │
                       │            exam_platform, billing,  │
                       │            analytics                │
                       └────────────────────────────────────┘
                       ┌────────────────────────────────────┐
                       │   Redis 7 (cache, queue, sessions) │
                       └────────────────────────────────────┘
                       ┌────────────────────────────────────┐
                       │   S3 / MinIO (audio, certs, exports)│
                       └────────────────────────────────────┘

  Background:                            Outbound integrations:
  ┌──────────────┐  ┌──────────────┐    ┌────────────────┐ ┌────────────┐
  │ data-worker  │  │ exam-worker  │    │ Gemini (via    │ │ Click /    │
  │ (arq)        │  │ (arq)        │    │ OpenAI SDK)    │ │ Payme /    │
  │ - generation │  │ - score essay│    │ chat / embed / │ │ Stripe     │
  │ - validation │  │ - score audio│    │ STT / TTS      │ │ webhooks   │
  │ - calibration│  │ - render PDF │    └────────────────┘ └────────────┘
  └──────────────┘  └──────────────┘    ┌────────────────┐ ┌────────────┐
                                        │ Sentry         │ │ Langfuse   │
                                        │ (errors)       │ │ (LLM trace)│
                                        └────────────────┘ └────────────┘
```

---

## 2. Subdomain ownership matrix

| Subdomain | App | Owner | Public? |
|---|---|---|---|
| `aiexam.uz` | `apps/landing` | shared | yes |
| `app.aiexam.uz` | `apps/exam-platform-web` | exam squad | yes (auth required for `/exams`+) |
| `admin.aiexam.uz` | `apps/data-engine-web` | content squad | role-gated (`content_admin`+) |
| `api.aiexam.uz/auth/v1/*` | `apps/auth-api` | shared | mixed (login public; rest requires cookie) |
| `api.aiexam.uz/data/v1/*` | `apps/data-engine-api` | content squad | mixed |
| `api.aiexam.uz/exam/v1/*` | `apps/exam-platform-api` | exam squad | requires student cookie |

Cookies: `__Host-lp_access`, `__Host-lp_refresh`, `__Host-lp_csrf` — all `Domain=.aiexam.uz`. See [`05-auth-and-rbac.md`](05-auth-and-rbac.md).

---

## 3. Why this split (and not a monolith)

- **Auth-api** is small and crash-isolated. A bug in question generation can't lock everyone out.
- **Data-api** holds the IP (questions, prompts, IRT params). Tighter access controls + audit trail.
- **Exam-api** is the hot path; its perf and uptime budget are the strictest.
- **Workers** are CPU/network-bound and slow; isolating them keeps API latency budgets achievable.

We do **not** split further (no per-feature microservices). The complexity isn't worth it at this scale.

---

## 4. Repository layout

```
desertation/
├── apps/
│   ├── landing/                # Next.js — marketing
│   ├── exam-platform-web/      # Next.js — student
│   ├── data-engine-web/        # Next.js — admin
│   ├── auth-api/               # FastAPI — SSO
│   ├── data-engine-api/        # FastAPI — questions, generation, billing read
│   └── exam-platform-api/      # FastAPI — attempts, scoring
├── packages/                   # @languagepro/{ui,contracts,i18n,config-*}
├── python/
│   ├── languagepro_common/     # settings, db, errors, logging, auth
│   ├── languagepro_llm/        # LLMRouter, prompts, cost log
│   └── languagepro_irt/        # 2PL engine + Fisher info + theta update
├── prompts/                    # YAML prompt templates (filesystem-backed)
├── infra/
│   ├── compose/                # docker-compose.{dev,prod}.yml
│   ├── caddy/                  # Caddyfile.{dev,prod}
│   └── docker/                 # service Dockerfiles
├── scripts/                    # seed, migration helpers, eval
├── docs/                       # this folder
└── .github/workflows/          # CI
```

---

## 5. Service-to-service (S2S) contract

Only `exam-platform-api` calls `data-engine-api` directly. No other east-west traffic.

```
exam-platform-api ──Bearer S2S JWT──▶ data-engine-api
  (5-min TTL, HS256, S2S_SHARED_SECRET)
```

Allowed scopes for `iss=exam-platform`, `aud=data-engine`:

- `items:next` — adaptive item selection
- `items:read` — fetch full item (without key)
- `items:key` — fetch answer key
- `rubrics:read` — fetch scoring rubric
- `blueprints:read` — fetch exam structure
- `responses:write` — record empirical response (for IRT recalibration)

**No service** calls `auth-api`. JWT verification is local using the shared `AUTH_JWT_SECRET`. See [`05-auth-and-rbac.md`](05-auth-and-rbac.md).

---

## 6. Request lifecycle (student takes Reading section)

```
Browser → Caddy → app.aiexam.uz (Next.js RSC)
                ├── reads __Host-lp_access cookie (server-side)
                └── server-side fetch: api.aiexam.uz/exam/v1/exams
                      → exam-platform-api
                          ├── verifies JWT locally
                          └── returns exam list

User clicks Start →
Browser → Caddy → exam-platform-api POST /v1/attempts
                  ├── creates ExamAttempt
                  ├── calls data-engine-api GET /v1/exams/blueprints/{code}  (S2S)
                  ├── calls data-engine-api GET /v1/items/next?skill=reading (S2S)
                  └── returns attempt + first item

User picks B →
Browser → exam-platform-api POST /v1/attempts/{id}/responses
              ├── calls data-engine-api GET /v1/items/{id}/key  (S2S, items:key)
              ├── grades, updates θ via languagepro_irt.update_theta_eap
              ├── calls data-engine-api POST /v1/items/{id}/response  (S2S, responses:write)
              ├── calls data-engine-api GET /v1/items/next?theta=... (S2S, items:next)
              └── returns next item
```

---

## 7. Async pipelines (workers)

### data-worker (arq queue `arq:data-engine`)

| Job | Trigger | Avg duration | Cost |
|---|---|---|---|
| `generate_batch(job_id)` | `POST /v1/generation/jobs` | 30s × N items | ~$0.01/item |
| `recalibrate_items(item_ids)` | nightly cron 03:00 UTC | 5–30 min | $0 (CPU only) |
| `export_csv(job_id, scope)` | researcher API | 10–120s | $0 |

### exam-worker (arq queue `arq:exam-platform`)

| Job | Trigger | Avg duration | Cost |
|---|---|---|---|
| `score_writing(response_id)` | `POST /v1/attempts/.../responses` (essay) | 10–20s | ~$0.01 |
| `score_speaking(response_id)` | `POST /v1/attempts/.../responses` (audio) | 20–40s | ~$0.03 |
| `render_certificate(attempt_id)` | attempt finished, `plan != free` | 1–3s | $0 |
| `synthesize_listening_audio(item_id)` | new listening item created | 5–15s | ~$0.005 |

---

## 8. Storage

- **Postgres**: single cluster, all schemas (`auth`, `data_engine`, `exam_platform`, `billing`, `analytics`). Per-service connection uses `search_path = <schema>, public`.
- **Redis**: DB 0 = generic cache + sessions; DB 1 = LLM response cache (24h TTL); DB 2 = arq queue.
- **S3 / MinIO** buckets:
  - `audio-recordings/` — student speaking uploads (90d retention)
  - `audio-prompts/` — TTS-generated listening passages (forever)
  - `certificates/` — signed PDFs (forever)
  - `exports/` — researcher CSVs (30d retention)

All audio uploads use **pre-signed PUT URLs** (browser → S3 directly). Server never proxies.

---

## 9. Deployment topology

### Production (v1)
- **One Hetzner CCX23 VPS** (4 vCPU, 16 GB RAM) — runs Caddy + 6 service containers + 2 worker containers + Postgres + Redis + MinIO via Docker Compose. Total monthly cost: ~$30 + Cloudflare (free) + Gemini API (variable).
- **Backup**: nightly `pg_dump` to Cloudflare R2 (3 USD/mo).
- **Domain**: `aiexam.uz` Cloudflare DNS → VPS public IP.

### Scaling path
- When a single VPS is saturated:
  1. Move Postgres → managed (Hetzner managed Postgres, or Supabase, or Neon).
  2. Move object storage → R2 (already pre-signed URLs, no code change).
  3. Split `exam-worker` to a second VPS (talks to same Postgres + Redis).
  4. Eventually: Kubernetes (k3s) on 3-node cluster.

### Dev environment
- **Docker Compose** for postgres, redis, minio, caddy.
- **Native processes** (uvicorn / `pnpm dev`) for hot-reload.
- See [`11-deployment-and-ops.md`](11-deployment-and-ops.md) for run scripts.

---

## 10. Observability stack

| Concern | Tool | What we collect |
|---|---|---|
| Errors | Sentry | unhandled exceptions in Python + JS, stack traces, breadcrumbs |
| Logs | structlog → JSON to stdout → Docker logs → optional Loki | structured: `request_id`, `user_id`, `attempt_id` |
| LLM | Langfuse | per-call: model, tokens, cost, latency, prompt version, output |
| Metrics | Postgres + custom dashboard | calls/min, p95 latency, MRR, signups |
| Uptime | UptimeRobot (free) → Telegram alerts | hits `/healthz` every 60s |

**Always log**:
- request_id (ULID, generated in middleware, returned in `X-Request-Id`)
- user_id (when authenticated)
- attempt_id, response_id, question_id (when relevant)

**Never log**:
- passwords, tokens, full essays, audio bytes
- `Authorization` header values
- payment card numbers (we don't store any)

---

## 11. Failure modes

| Component down | Impact | Auto-recovery? |
|---|---|---|
| Postgres | total | manual restart; alerts within 60s |
| Redis | sessions invalidated, queue paused | yes (data-worker reconnects) |
| MinIO | speaking uploads fail | yes (uploads retry 3×, then user-facing error) |
| Gemini API | generation/scoring unavailable | retry with fallback profile (e.g. 2.5-pro → 2.0-pro); essays queued and retried later |
| `auth-api` | nobody can log in (existing sessions still work for 15 min) | keep existing access tokens valid; restart |
| `data-api` | exam-api cannot fetch new items | exam-api serves cached items if available; otherwise 503 |
| `exam-api` | students cannot start/submit | restart; existing sessions return idempotently |

---

## 12. Acceptance

- [ ] `make up` brings the entire stack to "healthy" in under 60 seconds on a fresh VM.
- [ ] All 6 services serve `/healthz` returning `200 OK` with their service name.
- [ ] `tcpdump`-style cross-service traffic only happens over the documented S2S route.
- [ ] No service connects to the DB with `search_path = public` only — every connection sets its schema.
- [ ] An unhandled exception in any service produces a Sentry event tagged with `service`, `request_id`.
- [ ] Killing Postgres for 30 seconds, then bringing it back, recovers without manual intervention beyond the first 60 seconds.
