# data-engine-api

> **Owner**: Bobomurod (Topic 1)
> **Stack**: Python 3.12 · FastAPI · SQLAlchemy 2.0 · arq · Gemini (via OpenAI SDK) · pgvector

AI-powered question generation, validation, and IRT calibration backend for LanguagePro AI.

## Run locally
```bash
uv sync
uv run alembic -c alembic.ini upgrade head
uv run fastapi dev src/data_engine/main.py --port 8000
# In another terminal:
uv run arq src.data_engine.jobs.WorkerSettings
```

## Docs
See [`docs/`](docs/) for architecture, API spec, AI pipeline, IRT calibration, and thesis mapping.
