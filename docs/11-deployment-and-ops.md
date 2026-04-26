# 11 — Deployment & Ops

> **TL;DR.** v1 runs on a single Hetzner VPS via Docker Compose: Caddy → 6 service containers + 2 worker containers + Postgres + Redis + MinIO. Auto-TLS via Let's Encrypt. Cloudflare in front for DNS + WAF + CDN. Nightly Postgres backup to Cloudflare R2. Sentry + structlog + Langfuse for observability. Zero-downtime deploys via image-tagged compose pull + restart. Single-VPS budget: ~$30/mo + Gemini API usage.

---

## 1. Environments

| Env | Domain | Hosting | Purpose |
|---|---|---|---|
| dev | `*.localhost` (Caddy) | local Docker | development |
| staging | `*.staging.aiexam.uz` | Hetzner VPS (smaller, $10/mo) | optional Phase 4+; for now skip |
| prod | `*.aiexam.uz` | Hetzner CCX23 VPS | production |

Hard rules:
- Never `ssh` into a server to fix code. Fix in git, deploy.
- Never run `psql` to mutate prod data without an Alembic migration or a recorded `scripts/<one-off>.sql` script.
- Secrets only via `.env.prod` on the host; never in git, never in Docker image layers.

---

## 2. Local dev

```bash
# Bootstrap (once)
make bootstrap        # installs uv, pnpm, node@22, lefthook (via brew)
make install          # uv sync + pnpm install + cp .env.example .env
# Edit .env: set GOOGLE_API_KEY at minimum.

# Run the stack
make up               # docker compose -f infra/compose/docker-compose.dev.yml up -d
make migrate          # alembic upgrade head × 3 services
make seed             # demo users + seed questions

# Run apps with hot-reload
make dev              # pnpm -r dev (3 web apps); APIs run in compose
# Or run a single API natively for fast Python reload:
cd apps/data-engine-api && uv run fastapi dev src/data_engine/main.py --port 8000
```

URLs:
- `http://localhost:3000` — landing
- `http://localhost:3001` — exam-platform-web (`app.localhost`)
- `http://localhost:3002` — data-engine-web (`admin.localhost`)
- `http://localhost:8000/v1/docs` — data-engine-api Swagger
- `http://localhost:8001/v1/docs` — exam-platform-api Swagger
- `http://localhost:8002/v1/docs` — auth-api Swagger
- `http://minio.localhost` — MinIO console (admin / admin)

---

## 3. Production VPS layout

Single host (Hetzner CCX23, 4 vCPU, 16 GB RAM, dedicated CPU):

```
host: aiexam-prod-1
├── /etc/caddy/                       (TLS state)
├── /var/lib/aiexam/
│   ├── postgres/                     (volume — pgdata)
│   ├── redis/                        (volume)
│   └── minio/                        (volume)
├── /opt/aiexam/
│   ├── compose/docker-compose.prod.yml
│   ├── caddy/Caddyfile.prod
│   ├── .env.prod                     (chmod 600, owned by deploy user)
│   └── scripts/
└── ufw firewall: 22 (key only), 80, 443
```

Resource budget:
- Postgres: 4 GB RAM, 1 vCPU pin (use `cpu_count` and `shared_buffers=1GB`)
- Redis: 256 MB RAM
- MinIO: 1 GB RAM, 50 GB disk
- Each FastAPI: 256 MB, 0.5 vCPU
- Workers: 1 GB, 1 vCPU
- Caddy: 64 MB
- Next apps (built static): 200 MB each
- Headroom for spikes: ~3 GB

---

## 4. Production compose

`infra/compose/docker-compose.prod.yml` (excerpt):

```yaml
name: aiexam-prod
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile.prod:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on: [auth-api, data-engine-api, exam-platform-api,
                 landing, exam-platform-web, data-engine-web]

  postgres:
    image: pgvector/pgvector:pg17
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /var/lib/aiexam/postgres:/var/lib/postgresql/data
      - ../../scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes: ["/var/lib/aiexam/redis:/data"]
    command: redis-server --requirepass ${REDIS_PASSWORD} --save 60 1

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes: ["/var/lib/aiexam/minio:/data"]
    command: server /data --console-address ":9001"

  auth-api:
    image: ghcr.io/<owner>/aiexam-auth-api:${IMAGE_TAG}
    restart: unless-stopped
    env_file: .env.prod
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_started } }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/healthz"]

  # … data-engine-api, exam-platform-api, two workers, three Next apps …

volumes:
  caddy-data:
  caddy-config:
```

`.env.prod` lists secrets read by `env_file:`.

---

## 5. Caddy configuration (production)

`infra/caddy/Caddyfile.prod`:

```caddy
{
  email ops@aiexam.uz
  servers {
    protocols h1 h2 h3
  }
}

aiexam.uz, www.aiexam.uz {
  redir https://aiexam.uz{uri} 308
  reverse_proxy landing:3000
}

app.aiexam.uz {
  reverse_proxy exam-platform-web:3001
}

admin.aiexam.uz {
  reverse_proxy data-engine-web:3002
}

api.aiexam.uz {
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options DENY
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
  }

  @cors header Origin *
  header @cors {
    Access-Control-Allow-Credentials true
    Access-Control-Allow-Headers "Content-Type, Authorization, X-CSRF-Token, X-Request-Id, Idempotency-Key"
    Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS"
    Access-Control-Allow-Origin "{http.request.header.Origin}"
    Vary Origin
  }

  @options method OPTIONS
  respond @options 204

  handle_path /auth/* { reverse_proxy auth-api:8000 }
  handle_path /data/* { reverse_proxy data-engine-api:8000 }
  handle_path /exam/* { reverse_proxy exam-platform-api:8000 }
}
```

TLS: Caddy auto-issues from Let's Encrypt; HSTS preload set.

---

## 6. Build & ship

GitHub Actions deploys image-per-service to `ghcr.io`.

```yaml
# .github/workflows/release.yml (sketch)
on: { push: { tags: ['v*.*.*'] } }
jobs:
  build-images:
    matrix: [auth-api, data-engine-api, exam-platform-api,
             landing, exam-platform-web, data-engine-web]
    steps:
      - docker buildx build --platform linux/amd64 \
          -t ghcr.io/<owner>/aiexam-${{matrix.service}}:${{github.ref_name}} \
          --push -f infra/docker/${{matrix.service}}.Dockerfile .
  deploy:
    needs: build-images
    steps:
      - ssh deploy@aiexam-prod-1 "cd /opt/aiexam && \
          IMAGE_TAG=${{github.ref_name}} \
          docker compose -f compose/docker-compose.prod.yml pull && \
          docker compose -f compose/docker-compose.prod.yml up -d && \
          docker compose -f compose/docker-compose.prod.yml exec -T \
            data-engine-api uv run alembic upgrade head && \
          docker compose -f compose/docker-compose.prod.yml exec -T \
            exam-platform-api uv run alembic upgrade head && \
          docker compose -f compose/docker-compose.prod.yml exec -T \
            auth-api uv run alembic upgrade head"
```

Zero-downtime: `up -d` does a rolling restart; Caddy keeps existing connections open. Migrations are forward-compatible by convention (no destructive change without staged release).

Rollback:
```
ssh deploy@aiexam-prod-1 \
  "IMAGE_TAG=v0.x.y-prev docker compose -f compose/docker-compose.prod.yml up -d"
```

(Roll forward DB if migration was destructive — see [`10-engineering-conventions.md`](10-engineering-conventions.md) §6.)

---

## 7. Backups & restore

### Postgres

`scripts/backup-postgres.sh` (cron, daily 03:00 UTC):

```bash
#!/usr/bin/env bash
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T postgres \
  pg_dump --schema=auth --schema=data_engine --schema=exam_platform \
  --schema=billing --schema=analytics \
  -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > /tmp/aiexam-$TS.sql.gz
rclone copy /tmp/aiexam-$TS.sql.gz r2:aiexam-backups/postgres/
rm /tmp/aiexam-$TS.sql.gz
# keep 30 daily, 12 monthly via R2 lifecycle
```

Restore (drill quarterly, document outcome in `docs/_runbooks/restore-test.md`):
```bash
rclone copy r2:aiexam-backups/postgres/<file>.sql.gz /tmp/
gunzip /tmp/<file>.sql.gz
docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < /tmp/<file>.sql
```

### MinIO / S3

- Audio recordings have 90-day lifecycle policy. Treat as expendable (a backup is the user's local microphone).
- Certificates: cross-region replicate to R2 (1 USD/mo extra).

---

## 8. Monitoring

| Layer | Tool | Setup |
|---|---|---|
| Errors | Sentry | `SENTRY_DSN` per service; release = git tag |
| LLM | Langfuse self-hosted (Phase 2) | docker-compose addition; data sent from `LLMRouter` |
| Logs | Docker JSON → optional Loki | for v1, `docker logs` is enough |
| Uptime | UptimeRobot (free) | hits `/healthz` × 3 every 60s; Telegram alert |
| DB | `pg_stat_statements`; weekly review | enabled in `postgresql.conf` |
| Resource | `docker stats`; node-exporter (Phase 2) | |

Health checks:
- `/healthz` returns 200 if process up.
- `/readyz` returns 200 only when DB + Redis reachable + recent migration applied.

Alert priorities:
- **P0** (Telegram + email): site down, DB down, payment provider webhook 5xx > 5 in 5 min.
- **P1** (email): error rate > 1%, LLM cost MTD > 80% of budget.
- **P2** (daily digest): slow queries, expired certificates of trust.

---

## 9. Logging conventions

- JSON to stdout, Docker captures to its driver.
- Required fields: `service`, `request_id`, `ts`, `level`, `event`.
- Conditional fields: `user_id`, `attempt_id`, `question_id`, `provider`, `model`, `cost_usd`, `latency_ms`, `error_class`.
- Never log: passwords, tokens, full essays, audio bytes, card numbers, OAuth state.
- Retention: 14 days hot in Docker driver; long-term archive optional.

---

## 10. Runbooks

`docs/_runbooks/` contains:

- `db-down.md` — restart sequence, fail-safe queries, when to fail over.
- `webhook-replay.md` — how to re-process a webhook from `webhook_events`.
- `gemini-outage.md` — what to disable, what to enqueue, user comms.
- `restore-test.md` — quarterly restore drill.
- `secret-rotation.md` — JWT secret, S2S secret, DB password, Stripe keys.
- `incident-template.md` — how to write a postmortem.

Each runbook has: triggers, severity, immediate steps, recovery steps, postmortem checklist.

---

## 11. Secret rotation

| Secret | Frequency | Procedure |
|---|---|---|
| `AUTH_JWT_SECRET` | quarterly | overlap with `kid`; Phase 5 supports two keys |
| `S2S_SHARED_SECRET` | quarterly | rolling deploy: deploy new secret to data-api first, then exam-api |
| Postgres password | quarterly | `ALTER USER ... PASSWORD`; update `.env.prod`; rolling restart |
| `STRIPE_WEBHOOK_SECRET` | per Stripe rotation | regenerate in Stripe; update env; redeploy |
| `GOOGLE_API_KEY` | as needed | regenerate in GCP; update env; redeploy |
| Argon2 pepper (if added) | never (would invalidate all hashes) | — |

---

## 12. DNS / Cloudflare

```
A     aiexam.uz             → <vps-ip>
A     www.aiexam.uz         → <vps-ip>
A     app.aiexam.uz         → <vps-ip>
A     admin.aiexam.uz       → <vps-ip>
A     api.aiexam.uz         → <vps-ip>
TXT   aiexam.uz             → "v=spf1 include:resend.com -all"
DKIM  resend._domainkey...  → (Resend's DKIM record)
DMARC _dmarc.aiexam.uz      → "v=DMARC1; p=quarantine; rua=mailto:ops@aiexam.uz"
```

Cloudflare: proxy ON for landing + admin + api (WAF). Rules:
- Block country: none.
- Bot Fight Mode: ON.
- WAF custom rule: rate limit `/auth/v1/login` to 30/IP/min.
- Cache: bypass everything under `api.aiexam.uz`; aggressive cache for landing static.

---

## 13. Email

- Provider: Resend. Sender: `noreply@aiexam.uz`.
- Templates as MJML in `apps/landing/src/emails/` (Phase 2).
- Send through worker (`exam-worker.send_email`) so retries are managed.
- Required transactional emails:
  - signup welcome
  - email verification
  - password reset
  - subscription confirmation / cancellation / failed payment
  - certificate ready
  - GDPR data export ready

---

## 14. Cost ceiling

| Item | Monthly | Notes |
|---|---|---|
| Hetzner CCX23 | $30 | dedicated CPU, 4 vCPU / 16 GB |
| Cloudflare R2 (backups + audio cold) | $3 | first 10 GB free |
| Resend | $20 | 50k emails/mo; cheaper plan if under |
| Sentry | $0 | free tier 5k events/mo |
| Langfuse | $0 | self-hosted |
| Domain | $1 | aiexam.uz renewal |
| Gemini API | variable | targeted ≤ $200 at MVP scale |
| **Total fixed** | **~$54** | scales linearly with users |

Set `LLM_BUDGET_MONTHLY_USD = 200`; alert at 80%, hard-cap admin generation at 100%.

---

## 15. Acceptance

- [ ] `make up` brings the entire stack to "healthy" in under 60 seconds on a fresh VM.
- [ ] All 6 services serve `/healthz` returning 200 with their service name.
- [ ] Production deploy from `git tag v0.x.y` completes in < 5 minutes including migrations.
- [ ] Rolling back to the previous tag takes < 2 minutes.
- [ ] Quarterly restore drill recovers the prior day's DB into a sandbox in < 15 minutes.
- [ ] An unhandled exception in any service shows in Sentry with `service`, `request_id`, `user_id`.
- [ ] Killing Postgres for 30s, then bringing it back, recovers without manual intervention.
- [ ] No `.env.prod` in any image layer (`docker history` clean).
- [ ] All third-party secrets are stored in `.env.prod` only, with `chmod 600`.
- [ ] HSTS, CSP, X-Frame-Options, X-Content-Type-Options headers present on every HTML response.
