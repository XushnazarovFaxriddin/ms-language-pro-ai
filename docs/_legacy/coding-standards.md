# Coding Standards

> **Language**: English (technical reference)
> **Audience**: All contributors.
> **Enforcement**: Pre-commit hooks (`lefthook`) + CI gates. Non-conforming code does not merge.

---

## 1. Repository-wide

### 1.1. File encoding & line endings
- UTF-8, LF (`\n`) line endings (`.gitattributes` enforces).
- No BOM.
- Trailing newline at EOF.

### 1.2. Naming
- Files / folders: `kebab-case` for content, `snake_case` for Python modules, `PascalCase` for React components and TS classes.
- No spaces in filenames.
- No abbreviations unless they're industry standard (`api`, `db`, `id`, `url`).

### 1.3. Commits

Conventional Commits with thesis prefix:

```
<bobo|fax|joint>: <type>(<scope>): <imperative summary>

[optional body]

[optional footer]
```

Examples:
- `bobo: feat(generation): add multi-jury validation pipeline`
- `fax: fix(speaking): handle MediaRecorder mime fallback for Safari`
- `joint: chore(infra): bump Caddy to 2.8`

Types: `feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`.

Subject ≤ 72 chars, lowercase, imperative, no trailing period.

### 1.4. Branching

- `main` is protected. All work via PR.
- Branch naming: `<bobo|fax|joint>/<short-slug>` (e.g., `bobo/jury-validation`).
- Squash-merge by default; preserve linear history.

### 1.5. PR description template

```markdown
## What
<one paragraph: what this PR changes>

## Why
<one paragraph: motivation, link to issue or thesis section>

## Thesis mapping
<which dissertation chapter this contributes to, if any>

## How tested
<commands run, screenshots if UI>

## Risks
<what could break; rollback plan if non-trivial>
```

---

## 2. Python

### 2.1. Versions
- CPython **3.12+** required.
- Use type hints everywhere; PEP 695 generics where helpful.
- `from __future__ import annotations` only when mixing forward refs.

### 2.2. Tooling

| Tool | Config |
|---|---|
| **ruff** (lint + format) | `pyproject.toml` `[tool.ruff]`, line-length 100 |
| **mypy** | `[tool.mypy]` `strict = true` |
| **pytest** | `[tool.pytest.ini_options]`, `asyncio_mode = "auto"` |
| **pip-audit** | CI check |

Run locally: `uv run ruff check . && uv run ruff format --check . && uv run mypy . && uv run pytest`.

### 2.3. Project structure (per FastAPI service)

Hexagonal-ish:

```
src/<package>/
├── api/              # routers (HTTP-only, no business logic)
├── domain/           # pure entities, value objects, no IO
├── services/         # use cases — orchestration, calls adapters
├── adapters/
│   ├── db/           # SQLAlchemy models + repositories
│   ├── llm/          # LLMRouter wrappers
│   └── storage/      # S3 client wrapper
├── jobs/             # arq tasks
├── schemas/          # Pydantic v2 DTOs (request/response)
├── settings.py       # pydantic-settings, single source for env
└── main.py           # FastAPI app factory
```

Services depend on adapters via abstract protocols (Python `Protocol` types) → easy to mock in tests.

### 2.4. Style points

- **Async first**: `async def` for all I/O. Don't mix sync DB calls in handlers.
- **Pydantic v2 ConfigDict**: `model_config = ConfigDict(frozen=True, extra="forbid")` for DTOs.
- **Errors**: Custom domain exceptions in `domain/errors.py`, mapped to HTTP via FastAPI exception handlers in `api/errors.py`.
- **Logging**: `structlog`, never `print`. Bind context: `log = log.bind(attempt_id=...)`. Never log secrets, full essays, or audio bytes.
- **Docstrings**: Only when "why" is non-obvious. Type hints replace param docs.
- **No unused arguments**: prefix with `_` if mandated by interface.
- **No mutable default arguments** (ruff catches this).

### 2.5. Database

- Models in `adapters/db/models.py`. One repository class per aggregate.
- Always `async with session.begin():` for write ops.
- No raw SQL. If absolutely needed, parameterize and add a comment + ADR.
- Migrations: Alembic, **one migration per PR** that touches schema. Migrations must be reversible (`downgrade` populated).

### 2.6. Tests

- pytest, `tests/` mirrors `src/`.
- Coverage target: ≥80% for `services/` and `domain/`. Lower targets OK for `adapters/` (covered by integration tests).
- Use `testcontainers` for real Postgres in integration tests.
- Mock LLM calls in unit tests via `pytest-httpx` or `respx`. Real LLM only in nightly e2e.

---

## 3. TypeScript

### 3.1. Versions
- TS 5.6+, `"strict": true`, `"noUncheckedIndexedAccess": true`.
- ESM only (`"type": "module"`).

### 3.2. Tooling

| Tool | Config |
|---|---|
| **Biome** | format only, replaces Prettier |
| **ESLint** flat config | `@languagepro/config-eslint` |
| **TypeScript** | `@languagepro/config-tsconfig` (base, next, library) |

Run locally: `pnpm lint && pnpm type-check && pnpm test`.

### 3.3. Project structure (Next.js app)

```
src/
├── app/                     # App Router routes
│   └── [locale]/...         # next-intl segment
├── components/              # app-specific
├── features/                # feature-sliced (exam-runner, results)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── api.ts
│       └── types.ts
├── lib/                     # cross-cutting helpers (api client, auth)
├── server/                  # Server Actions, server-only utils
└── styles/
```

### 3.4. Style points

- **RSC default**: components are server-side unless they need interactivity. `'use client'` only when needed.
- **Server Actions** for mutations where possible; TanStack Query only for paginated lists or polling.
- **No `any`** except at trust boundaries (e.g., `JSON.parse` return).
- **No default exports** for components (named exports only — better refactoring).
- **Form validation**: `react-hook-form` + `zod`. Schemas live in `features/<feature>/schemas.ts`.
- **i18n**: never hardcode user-facing strings; use `useTranslations()` from `next-intl`.
- **No CSS modules**: Tailwind v4 + CSS variables only. `cn()` helper for conditional classes.
- **Accessibility**: WCAG AA. All interactive elements have `aria-*` where Tailwind/shadcn doesn't already provide.

### 3.5. Tests

- Vitest for unit, Playwright for E2E.
- Test Server Actions with `node:test` runner or by extracting business logic into pure functions.
- Critical paths must have E2E (full IELTS Reading attempt, Writing scoring round trip).

---

## 4. SQL & migrations

- One Alembic migration per schema change.
- Naming: `YYYYMMDDHHMM_<author>_<slug>.py` (e.g., `202604261430_bobo_add_calibration_runs.py`).
- All schemas explicit: `op.create_table('questions', schema='data_engine', ...)`.
- Use `op.execute()` only for non-DDL ops (data backfills); accompany with a comment explaining why.
- Never drop columns without first deploying a release that stops writing to them.

---

## 5. API design (FastAPI)

- Versioned URL: `/v1/...`.
- Path params lower kebab; query params lower snake.
- Response models always typed (FastAPI's `response_model=`).
- Use `status_code=201` for creation, `204` for delete.
- Pagination: cursor-based (see [`api-contracts.md`](api-contracts.md)).
- Errors: RFC 9457 Problem Details (see same doc).
- OpenAPI tags grouped by resource (`questions`, `attempts`, ...).

---

## 6. Frontend UX standards

- Loading states: skeleton placeholders (shadcn Skeleton), not spinners (except for short-lived actions).
- Errors: toast for transient, inline for form fields, full page only for crashes.
- Empty states: always have a hint (next action) and an illustration where space allows.
- Animations: `tailwind-animate`, < 200ms, respect `prefers-reduced-motion`.
- Forms: validate on blur (not on every keystroke), submit disabled while validating.

---

## 7. Documentation in code

- Don't document obvious things. Type hints + good names replace prose.
- Document **why** non-obvious choices were made.
- Public functions / classes: 1-line `"""<verb> <object>."""` summary, no padding.
- ADRs for non-obvious architecture decisions: `docs/adr/NNNN-<slug>.md`.

---

## 8. Performance budgets

| Surface | Budget |
|---|---|
| `exam-platform-web` Next.js JS bundle (per route) | ≤ 200 KB gz initial |
| Lighthouse Performance | ≥ 85 |
| FastAPI p95 navigation endpoint | < 300 ms |
| LLM scoring p95 (writing) | < 20 s |
| Audio upload (200 MB max) | progressive (tus.io if > 5 min recording) |

CI fails if budgets regress > 10%.

---

## 9. CI gates (must pass to merge)

1. `pnpm lint` (Biome + ESLint)
2. `pnpm type-check` (tsc --noEmit)
3. `uv run ruff check .`
4. `uv run mypy .`
5. `uv run pytest --cov` (≥80% on `services/`)
6. `pnpm test` (Vitest)
7. `pnpm playwright test --project=e2e-smoke` (smoke subset; full E2E nightly)
8. Migration up + down works against fresh Postgres
9. `pnpm audit --audit-level=high` and `pip-audit` clean
10. Lighthouse smoke (mobile, slow 3G profile) ≥ 85

---

## 10. Code review etiquette

- Reviews over Slack/in-person are fine but **must be summarized in a PR comment**.
- Use suggested-edit feature for trivial changes.
- "nit:" prefix for non-blocking style comments; "blocker:" for things that must change.
- Don't approve a PR you didn't read line-by-line.
- Author resolves comments only when actually addressed; reviewer re-resolves if not satisfied.

---

_Last reviewed: 2026-04-26 by joint authors._
