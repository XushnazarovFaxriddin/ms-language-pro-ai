# 01 — Tech Stack

> **TL;DR.** Pinned versions and rationale for every dependency. Backend: Python 3.12 + FastAPI 0.115 + SQLAlchemy 2.0 + Postgres 17 + Redis 7. Frontend: Next.js 15 + TS 5.6 + Tailwind v4 + shadcn/ui (new-york). AI: `openai` SDK + Gemini OpenAI-compat endpoint, **only**. JS workspace via pnpm + Turborepo; Python workspace via uv. Containers: Docker + Compose v2. Reverse proxy: Caddy 2. Observability: Sentry + structlog + Langfuse. **No new dependencies without an ADR.**

---

## 1. Hard rules

1. **One AI SDK only** — `openai` (Python + JS), pointing at Gemini's OpenAI-compatible endpoint. No `google-genai`, no `langchain`, no `litellm` in shipping code. Spec exception: throwaway research scripts under `scripts/eval/` may use anything.
2. **One frontend stack** — Next.js 15 App Router, no Vite/Remix/Astro for production apps.
3. **One backend framework** — FastAPI for every Python service.
4. **One DB** — Postgres 17 with `pgvector` and `pgcrypto`. No Mongo, no SQLite, no Redis-as-database.
5. **One cache + queue** — Redis 7. Logical DBs: `0` cache, `1` LLM cache, `2` arq queue.
6. **One ORM** — SQLAlchemy 2.0 async. No Tortoise, no Prisma-Python, no raw `asyncpg.Pool` in business code.
7. **One package manager per language** — `pnpm` (JS), `uv` (Python). No npm, no yarn, no Poetry, no Pipenv.

---

## 2. Backend (Python 3.12)

| Layer | Library | Version | Why |
|---|---|---|---|
| Web | `fastapi` | `>=0.115,<0.117` | async, OpenAPI auto, Pydantic v2 native |
| ASGI | `uvicorn[standard]` | `>=0.32` | reload, websockets, httptools |
| Validation | `pydantic` | `>=2.9` | strict, `ConfigDict(extra="forbid")` everywhere |
| Settings | `pydantic-settings` | `>=2.6` | env-driven config |
| ORM | `sqlalchemy[asyncio]` | `>=2.0.36` | mature, type-safe `Mapped[...]` |
| DB driver | `asyncpg` | `>=0.30` | fastest async pg driver |
| Migrations | `alembic` | `>=1.14` | one migration per PR; up + down |
| Vectors | `pgvector` | `>=0.3` | HNSW + cosine ops |
| Background jobs | `arq` | `>=0.26` | native asyncio, redis-only |
| Cache / sessions | `redis[hiredis]` | `>=5.2` | hiredis = faster parser |
| HTTP client | `httpx` | `>=0.28` | only for S2S + payment webhooks |
| AI | `openai` | `>=1.55` | the **only** AI SDK |
| Auth | `python-jose[cryptography]`, `argon2-cffi` | latest | JWT (HS256), Argon2id passwords |
| OAuth | `authlib` | `>=1.3.2` | Google OAuth |
| Rate limit | `fastapi-limiter` | `>=0.1.6` | redis-backed |
| S3 | `boto3` | `>=1.35` | works with MinIO |
| IRT calibration | `py-irt` | `>=0.5` | nightly job only; uses Pyro |
| Audio | `ffmpeg-python` (wrap CLI) | latest | normalise to 16 kHz mono WAV |
| Testing | `pytest`, `pytest-asyncio`, `pytest-cov`, `testcontainers`, `respx` | latest | unit + integration |
| Lint / format | `ruff` | `>=0.8` | replaces black + isort + flake8 |
| Type check | `mypy` | `>=1.13` | `strict = true` |
| Logs | `structlog` | `>=24.4` | JSON in prod, console in dev |
| Errors | `sentry-sdk[fastapi]` | latest | crash reporting |
| LLM tracing | `langfuse` | latest | self-hosted; per-call observability |

Use `uv` for everything: `uv sync`, `uv add fastapi`, `uv run pytest`.

---

## 3. Frontend (Node 22 + TS)

| Layer | Library | Version | Why |
|---|---|---|---|
| Framework | `next` | `15.x` | App Router + Server Components + Turbopack |
| Runtime | React | `^19.0` | concurrent features |
| Language | TypeScript | `^5.6` | `strict`, `noUncheckedIndexedAccess` |
| Styling | `tailwindcss` | `^4.0` | `@theme inline`, native CSS variables |
| UI primitives | `shadcn/ui` (style: new-york) | latest | copy-pasted into `@languagepro/ui`, no runtime dep |
| Icons | `lucide-react` | `^0.470` | matches shadcn |
| Animation | `framer-motion` | `^11.x` | page transitions, micro-interactions |
| Tween / spring extras | `tailwindcss-animate` | latest | utility classes |
| Forms | `react-hook-form` + `zod` | latest | type-safe, shared schemas |
| Server state | `@tanstack/react-query` | `^5.62` | only for paginated/filtered lists |
| Tables | `@tanstack/react-table` | `^8.20` | admin tables |
| Charts | `recharts` | `^2.13` | LLM dashboard, history graphs |
| Editor | `@tiptap/react` + `StarterKit` + `CharacterCount` | latest | writing tasks |
| Audio recording | native `MediaRecorder` | — | webm/opus |
| Resumable upload | `tus-js-client` | latest | for >5 min recordings |
| i18n | `next-intl` | `^3.26` | `[locale]` segment |
| Auth | cookie-based, no third-party | — | see [`05-auth-and-rbac.md`](05-auth-and-rbac.md) |
| AI client | `openai` | `^4.x` | edge-side calls only if needed (Phase 5+) |
| Date | `date-fns` | latest | locale-aware formatting |
| Utils | `clsx`, `tailwind-merge` | latest | `cn()` |
| Testing | `vitest`, `@playwright/test` | latest | unit + E2E |
| Lint | ESLint flat + `@next/eslint-plugin-next` | latest | |
| Format | `biome` | latest | replaces Prettier (faster) |

---

## 4. Monorepo tooling

- **JS workspace**: `pnpm` workspaces + Turborepo. Lockfile: `pnpm-lock.yaml`. Cache: Vercel remote cache (`turbo.json`).
- **Python workspace**: `uv` workspace, members in `pyproject.toml [tool.uv.workspace]`. Lockfile: `uv.lock`.
- **Pre-commit**: `lefthook` — runs ruff, biome, type-check on staged files.
- **Diagram render**: Mermaid → PNG via CI (`@mermaid-js/mermaid-cli`).

---

## 5. Infrastructure

| Component | Tool | Version |
|---|---|---|
| Containers | Docker | 24+ |
| Compose | Docker Compose v2 | latest |
| Reverse proxy | Caddy | `2.x` (auto TLS, HTTP/3) |
| Database | Postgres + pgvector | `pgvector/pgvector:pg17` |
| Cache / queue | Redis | `redis:7-alpine` |
| Object storage | MinIO (dev) / S3-compatible (prod, e.g. Hetzner Object Storage / Cloudflare R2) | latest |
| Optional vector | only pgvector — no Qdrant | — |
| Email | `resend.com` API or Postmark | — |
| Error tracker | Sentry (self-hostable plan: cloud free tier first) | latest |
| LLM tracing | Langfuse (self-hosted Docker) | latest |
| Production host | Hetzner CCX23 VPS (4 vCPU, 16 GB RAM, $30/mo) for v1 | — |
| DNS / CDN | Cloudflare (free) | — |

---

## 6. AI specifics (re-emphasised)

| Purpose | Model | Where it appears |
|---|---|---|
| Chat / structured output (heavy) | `gemini-2.5-pro` | question generation, writing scoring, feedback (UZ/EN) |
| Chat / structured output (cheap) | `gemini-2.5-flash` | classify CEFR, juror 1, speaking scoring (multimodal audio in) |
| Juror diversity | `gemini-2.0-flash` | juror 2 in validation panel |
| Embeddings | `gemini-embedding-001` | dedup, semantic search; **always 768 dims** |
| Speech-to-text | `gemini-2.5-flash` (audio input in chat.completions) | speaking section transcription + scoring in one call |
| Text-to-speech | `gemini-2.5-flash-preview-tts` (audio output in chat.completions) | listening prompts (replaces voice actors) |
| Vision (future) | `gemini-2.5-pro` | reading-passage images, diagrams |

**One client, one base URL:**

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=settings.GOOGLE_API_KEY,                       # alias: OPENAI_API_KEY
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)
```

Per-purpose model + temperature + max_tokens are read from `.env` and overridable at runtime via `runtime_config` table — see [`06-ai-pipelines.md`](06-ai-pipelines.md).

---

## 7. Versions to NOT use

- Python 3.13 → fine in dev; ship CI matrix tests both 3.12 and 3.13.
- Node ≤ 20 → some Next 15 features (Turbopack stable) need ≥ 22.
- Tailwind v3 → tokens via `@theme inline` only exist in v4.
- React 18 → we depend on RSC + new `use()` semantics from 19.
- Pydantic v1 → end of life; v2 only.
- Alembic with sync engine → all migrations run via `async_engine_from_config`.

---

## 8. Adding a dependency

1. Open an ADR in `docs/_adr/<NNNN>-<slug>.md` with **Context / Considered / Decision / Consequences**.
2. Get one approval from the other student / maintainer.
3. Add it; pin a major.minor; commit lockfile.
4. Update this doc's table.

A direct PR that changes `package.json` / `pyproject.toml` without a paired ADR may be reverted.

---

## 9. Acceptance

- [ ] `uv sync && pnpm install` succeed on a fresh checkout in under 90 seconds (cached).
- [ ] `uv run mypy .` and `pnpm -r type-check` are both clean on `main`.
- [ ] CI matrix runs Python 3.12 & 3.13, Node 22 & 24.
- [ ] `pip-audit` and `pnpm audit --audit-level=high` clean.
- [ ] No file imports `google.genai` or `langchain` outside `scripts/eval/`.
