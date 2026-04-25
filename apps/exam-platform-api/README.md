# exam-platform-api

> **Owner**: Faxriddin (Topic 2)
> **Stack**: Python 3.12 · FastAPI · SQLAlchemy 2.0 · arq · Gemini multimodal (audio + text)

Backend for student-facing exam platform: adaptive testing, async writing/speaking scoring, certificates.

## Run locally
```bash
uv sync
uv run alembic -c alembic.ini upgrade head
uv run fastapi dev src/exam_platform/main.py --port 8001
uv run arq src.exam_platform.jobs.WorkerSettings  # ffmpeg required for audio
```

## Docs
[`docs/`](docs/) — exam flow, scoring pipeline, audio handling, adaptive selection, thesis mapping.
