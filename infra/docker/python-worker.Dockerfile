# Worker image (currently exam-platform-worker — needs ffmpeg for audio).
ARG SERVICE_NAME
ARG SERVICE_MODULE

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /usr/local/bin/

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock* ./
COPY python/ ./python/

COPY apps/ ./apps/

RUN uv sync --frozen --no-install-project 2>/dev/null || uv sync

ARG SERVICE_MODULE
ENV SERVICE_MODULE=${SERVICE_MODULE}

CMD ["sh", "-c", "uv run arq ${SERVICE_MODULE}.jobs.WorkerSettings"]
