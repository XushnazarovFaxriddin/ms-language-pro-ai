# 08 — Deployment

## Local
```bash
docker compose -f infra/compose/docker-compose.dev.yml up exam-platform-api exam-platform-worker
# Or:
cd apps/exam-platform-api
uv run fastapi dev src/exam_platform/main.py --port 8001
uv run arq src.exam_platform.jobs.WorkerSettings
```

## Required env (subset)
- `DATABASE_URL`, `REDIS_URL`, `S3_*`
- `GOOGLE_API_KEY`, `OPENAI_API_KEY=${GOOGLE_API_KEY}`, `OPENAI_BASE_URL`
- `LLM_PROFILE_SCORE_WRITING`, `LLM_PROFILE_SCORE_SPEAKING`
- `AUTH_JWT_SECRET` (verify cookie)
- `S2S_SHARED_SECRET` (sign outbound calls to data-engine)
- `DATA_ENGINE_API_URL=http://data-engine-api:8000`
- `SENTRY_DSN`, `LANGFUSE_*`

## Migrations
```bash
uv run alembic -c apps/exam-platform-api/alembic.ini upgrade head
```

## Production (Docker on VPS)
- 2 containers: api (uvicorn 4 workers) + worker (arq 4 workers — speaking can be slow)
- Caddy: `app.aiexam.uz` → exam-platform-web; `api.aiexam.uz/exam/*` → exam-platform-api
- Postgres `search_path = exam_platform, public`
- ffmpeg installed in worker image (`apt-get install -y ffmpeg`)

## Resource sizing (pilot scale)
- API: 512 MB RAM, 0.5 CPU
- Worker: 1 GB RAM, 1 CPU (LLM I/O bound, ffmpeg occasionally CPU-bound)

## Health
- `/healthz`, `/readyz` (DB + Redis + S3 + data-engine reachability)

## Backup
- Postgres `pg_dump --schema=exam_platform` nightly to S3
- S3 audio bucket: cross-region replication (Phase 2)

## Acceptance
- [ ] `docker compose up` brings up healthy api+worker
- [ ] First request <10s after startup
- [ ] ffmpeg available in worker image (`docker exec ... ffmpeg -version`)
