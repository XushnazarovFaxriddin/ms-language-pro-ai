# Single Dockerfile reused by auth-api, data-engine-api, exam-platform-api.
# Build arg SERVICE_NAME selects which apps/<dir> to install.
ARG SERVICE_NAME
ARG SERVICE_MODULE

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

# uv (fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /usr/local/bin/

WORKDIR /app

# System deps: ffmpeg only needed for exam-platform-worker, but we keep image
# unified for simplicity (~50MB extra). Override with python-worker.Dockerfile if needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace metadata first for layer caching
COPY pyproject.toml uv.lock* ./
COPY python/ ./python/

ARG SERVICE_NAME
COPY apps/${SERVICE_NAME}/ ./apps/${SERVICE_NAME}/

RUN uv sync --frozen --no-install-project 2>/dev/null || uv sync

EXPOSE 8000

ARG SERVICE_MODULE
ENV SERVICE_MODULE=${SERVICE_MODULE}

# Default cmd: uvicorn for the API. Workers override via compose `command:`.
CMD ["sh", "-c", "uv run uvicorn ${SERVICE_MODULE}.main:app --host 0.0.0.0 --port 8000 --reload"]
