# 07 — Deployment

## Local dev
```bash
# From repo root
docker compose -f infra/compose/docker-compose.dev.yml up data-engine-api data-engine-worker
# Or run host-side:
cd apps/data-engine-api
uv run fastapi dev src/data_engine/main.py --port 8000
uv run arq src.data_engine.jobs.WorkerSettings  # separate terminal
```

## Required env (subset of root `.env`)
- `DATABASE_URL`
- `REDIS_URL`, `REDIS_LLM_CACHE_DB`, `REDIS_QUEUE_DB`
- `S3_*`
- `GOOGLE_API_KEY`, `OPENAI_API_KEY=${GOOGLE_API_KEY}`, `OPENAI_BASE_URL`
- `LLM_PROFILE_*`
- `AUTH_JWT_SECRET` (verify cookie)
- `S2S_SHARED_SECRET` (verify exam-platform calls)
- `SENTRY_DSN`, `LANGFUSE_*`

## Migrations
```bash
uv run alembic -c apps/data-engine-api/alembic.ini upgrade head
uv run alembic -c apps/data-engine-api/alembic.ini revision --autogenerate -m "add foo"
```

## Production (Docker on VPS)
- Image: `infra/docker/data-engine-api.Dockerfile` (multi-stage, ~200MB)
- 2 containers: `api` (uvicorn, 4 workers) + `worker` (arq, 2 workers)
- Caddy routes `data-engine.languagepro.ai` → `data-engine-web`, `api.languagepro.ai/data/*` → `data-engine-api`
- Postgres: shared cluster, search_path includes `data_engine,public`
- Backup: nightly `pg_dump --schema=data_engine` to S3

## Health checks
- `GET /healthz` → 200 if process up
- `GET /readyz` → 200 if DB+Redis reachable

## Rollout
- `git tag v0.x.y` → CI builds + pushes Docker image → VPS pulls + restarts
- Migrations run before container restart (`alembic upgrade head` in entrypoint, idempotent)

## Acceptance
- [ ] `docker compose up` brings up healthy api + worker
- [ ] `/data/v1/healthz` returns 200 within 5s of start
- [ ] Cold start to first request: <10s
- [ ] Memory baseline <300MB per worker
