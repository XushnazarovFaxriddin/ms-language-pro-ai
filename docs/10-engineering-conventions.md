# 10 — Engineering Conventions

> **TL;DR.** Strict types end-to-end (mypy strict, TS `strict + noUncheckedIndexedAccess`). One linter per language: `ruff` for Python, `biome` for JS, `eslint` flat for Next-specific rules. Conventional Commits. Trunk-based dev with short-lived branches; squash-merge into `main`. Every PR runs lint + type-check + unit tests + a smoke E2E. CI fails on any regression. Pre-commit via `lefthook`. Coverage targets: ≥80% on backend `services/`, smoke E2E for every critical flow.

---

## 1. Repository hygiene

- Encoding UTF-8, LF line endings (`.gitattributes` enforces), trailing newline at EOF, no BOM.
- File names: `kebab-case` for content, `snake_case` for Python modules, `PascalCase` for React components, `camelCase` for TS utilities.
- No `.DS_Store`, IDE configs, secrets, or cache files committed.
- `.env` is gitignored. `.env.example` is committed and kept current.

---

## 2. Branch & commit workflow

- Trunk-based. Long-lived: `main` (protected). Branch names: `<scope>/<short-slug>` (e.g. `auth/refresh-rotation`, `web/exam-runner-mic-level`).
- One feature per branch. Squash-merge into `main`. Linear history; no merge commits.
- Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `build`, `ci`):

```
feat(api): add /exam/v1/me/entitlements per docs/04-api-contracts.md §4.1

  - returns plan + remaining quotas
  - powered by check_entitlement()
```

- Subject ≤ 72 chars, lowercase, imperative, no trailing period. Body wraps at 100 chars.
- Reference docs in commit body (`per docs/<x>.md §<n>`) — keeps the implementation traceable.

---

## 3. PR rules

- Every PR has a title (Conventional) and a body filled per `.github/pull_request_template.md`:

```markdown
## What
<one paragraph: what changes>

## Why
<one paragraph: motivation, link to issue/spec>

## How tested
<commands run; screenshots if UI>

## Risks / rollback
<what could break; rollback plan if non-trivial>
```

- Reviewer expectations: line-by-line read, suggest changes via review UI, "nit:" prefix for non-blocking, "blocker:" prefix for must-fix.
- Author resolves comments only after addressing them; reviewer re-resolves if not satisfied.
- PR ≤ 600 changed lines as a guideline; if larger, attach a reading guide.

---

## 4. Python conventions (3.12+)

### Project layout (per FastAPI service)

```
src/<package>/
├── api/                # routers (HTTP-only; one file per resource)
│   ├── deps.py         # auth deps, db dep, current_user, S2S guards
│   ├── errors.py       # exception handlers
│   └── v1/
├── domain/             # pure entities, value objects, no IO
├── services/           # use cases — orchestrate adapters
├── adapters/
│   ├── db/             # SQLAlchemy models + repositories
│   ├── llm/            # LLMRouter wiring
│   ├── storage/        # S3 client wrapper
│   └── http/           # outbound HTTP clients (data-engine, payment providers)
├── jobs/               # arq tasks
├── schemas/            # Pydantic v2 DTOs (request/response/internal)
├── settings.py         # pydantic-settings
└── main.py             # FastAPI app factory + lifespan
```

### Tooling

| Tool | Config | Run |
|---|---|---|
| `ruff` (lint + format) | `pyproject.toml [tool.ruff]` | `uv run ruff check . && uv run ruff format --check .` |
| `mypy` | `[tool.mypy]` `strict = true` | `uv run mypy .` |
| `pytest` | `[tool.pytest.ini_options]` | `uv run pytest` |
| `pip-audit` | — | CI |

`pyproject.toml` `[tool.ruff.lint]` selects: `E,W,F,I,B,C4,UP,ASYNC,S,RUF`.

### Style rules

- **Async first**: `async def` for all I/O. Don't mix sync DB calls in handlers.
- **Pydantic v2**: `model_config = ConfigDict(extra="forbid", frozen=True)` for DTOs unless mutation needed.
- **Errors**: subclass `AppError` in `python/languagepro_common/errors.py`; never raise `HTTPException` directly outside `api/`.
- **Logging**: `structlog`, never `print`. Bind context: `log = log.bind(attempt_id=str(id))`. Never log secrets, full essays, or audio bytes.
- **Docstrings**: only when "why" is non-obvious. Type hints replace param docs.
- **No mutable default arguments** (ruff catches this).
- **No raw SQL** in business code. If absolutely needed, parameterise with `:name` placeholders and add a comment.
- **Database sessions**: always `async with` or via FastAPI dependency. Never long-lived globals.
- **Imports**: absolute, `ruff` enforces ordering.
- **Lines**: 100-char soft limit (ruff format).

### Service boundaries

```
api/v1/foo.py  →  services/foo.py  →  adapters/db/repositories/foo.py
                                  →  adapters/llm/...
                                  →  adapters/http/...
```

Routers parse + validate + call a single service function. Services orchestrate adapters and contain business rules. Adapters wrap external systems.

---

## 5. TypeScript conventions

### Project layout (per Next.js app)

```
src/
├── app/
│   ├── [locale]/...
│   └── api/                    # only edge routes / webhooks
├── components/                 # app-specific
├── features/                   # feature-sliced
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── api.ts              # client functions calling our API
│       ├── schemas.ts          # zod
│       └── types.ts
├── lib/                        # cross-cutting (api client, auth helpers)
├── server/                     # Server Actions, server-only utils
└── styles/
```

### Tooling

| Tool | Config | Run |
|---|---|---|
| TypeScript | `@languagepro/config-tsconfig/next.json` | `pnpm -r type-check` |
| Biome (format + lint) | `biome.json` | `pnpm biome check .` |
| ESLint flat | `@languagepro/config-eslint/next` | `pnpm -r lint` |

### Style rules

- **RSC default**: components are server-side unless they need interactivity. `'use client'` only when required.
- **Server Actions** for mutations where possible; TanStack Query only for paginated/filtered lists or polling.
- **No `any`** except at trust boundaries (e.g. `JSON.parse` return).
- **No default exports** for components (named exports — better refactoring; default exports OK only for `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`).
- **Form validation**: `react-hook-form` + `zod`. Schemas live in `features/<feature>/schemas.ts`.
- **i18n**: never hardcode user-facing strings; use `useTranslations()` from `next-intl`. Build fails if a string literal in JSX is longer than one character and isn't a translation key.
- **CSS**: Tailwind v4 + design tokens only. `cn()` for conditional classes. No `style={{...}}` except dynamic values from JS.
- **Accessibility**: WCAG AA. Keyboard nav and `aria-*` per [`08-design-system.md`](08-design-system.md) §11.
- **No barrel imports** of large packages — `import { Button } from '@languagepro/ui'` ✓; `import * as UI from '@languagepro/ui'` ✗.

### File naming

- Components: `PascalCase.tsx`.
- Utilities: `camelCase.ts`.
- Pages / layouts (Next): lowercase per Next conventions.
- Feature folder: `feature-name` (kebab).

---

## 6. SQL & migrations

- One Alembic migration per schema change.
- Filename: `YYYYMMDDHHMM_<author>_<slug>.py`.
- Both `upgrade()` and `downgrade()` populated.
- Schema-qualified names everywhere: `op.create_table('foo', ..., schema='exam_platform')`.
- Data backfills via `op.execute()` with a comment explaining intent.
- Never drop a column without first deploying a release that stops writing to it.
- All Postgres extensions installed by `scripts/init-db.sql`, never inside a migration.

---

## 7. API design (FastAPI)

- Versioned URL: `/v1/...`.
- Path params lower-kebab; query params lower-snake.
- Response models always typed (FastAPI `response_model=`).
- Errors: RFC 9457 Problem Details (see [`04-api-contracts.md`](04-api-contracts.md) §1).
- Pagination: cursor-based.
- Status codes: `201` for creation, `204` for delete / no-content, `202` for async accepted.
- OpenAPI tags grouped by resource.

---

## 8. Frontend UX standards

- Loading: skeletons, not spinners (except for short actions).
- Errors: toast for transient, inline for form fields, full-page only for crashes.
- Empty states: see [`08-design-system.md`](08-design-system.md) §13.
- Animations: per design system; respect `prefers-reduced-motion`.
- Forms: validate on blur; submit disabled while validating.
- Optimistic updates: only for clearly-reversible actions (favourite, mark read). Never for mutations that affect billing or scoring.

---

## 9. Documentation in code

- Don't document obvious things. Type hints + good names replace prose.
- Document **why** non-obvious choices were made (`# We retry 3× because Gemini sometimes 503s during peak hours`).
- Public functions / classes: 1-line `"""<verb> <object>."""` summary.
- ADRs for non-obvious architecture decisions: `docs/_adr/NNNN-<slug>.md`.

---

## 10. Testing

### Layout (Python)

```
tests/
├── unit/
│   ├── services/
│   ├── domain/
│   └── adapters/
├── integration/
│   ├── api/                    # full HTTP via httpx + AsyncClient
│   └── jobs/
└── conftest.py
```

### Python tooling

- `pytest`, `pytest-asyncio` (auto mode), `pytest-cov`, `testcontainers` (real Postgres in integration), `respx` (mock httpx), custom `mock_llm` fixture.
- Coverage thresholds: ≥ 80% on `services/`, ≥ 60% on `adapters/`.
- One assertion per test where possible. Arrange / Act / Assert blocks separated by blank line.
- Test names: `test_<unit>_<scenario>_<expected>`. e.g. `test_login_with_wrong_password_returns_401`.

### TypeScript / Next

- Vitest for unit; Playwright for E2E.
- Critical paths must have E2E:
  1. Sign up → log in → take Reading mini → see results.
  2. Admin generates 3 questions → see them in `/banks`.
  3. Free user hits paywall on Speaking → upgrade modal opens.
  4. Subscription cancellation flow.

### Load tests (k6)

- Target: 50 concurrent attempts, p95 navigation < 500ms, p95 LLM scoring < 30s.
- Runs weekly in CI; on-demand before pilot launches.

---

## 11. CI pipeline (GitHub Actions)

`.github/workflows/ci.yml`:

```
on: [pull_request, push to main]
jobs:
  python-checks:
    matrix: [3.12, 3.13]
    steps:
      - uv sync
      - ruff check
      - ruff format --check
      - mypy .
      - pytest --cov (≥ 80% gate on services/)
      - pip-audit
  ts-checks:
    matrix: [22, 24]
    steps:
      - pnpm install --frozen-lockfile
      - pnpm -r type-check
      - pnpm biome check .
      - pnpm -r lint
      - pnpm -r test
      - pnpm audit --audit-level=high
  e2e-smoke:
    services: postgres, redis, minio
    steps:
      - docker compose up …
      - uv run alembic upgrade head (×3 services)
      - uv run python scripts/seed_dev.py
      - pnpm install
      - pnpm playwright test --project=e2e-smoke
```

Required check gate on `main`. CI must complete in < 8 minutes.

---

## 12. Pre-commit (lefthook)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    ruff:
      glob: "*.py"
      run: uv run ruff check {staged_files} && uv run ruff format --check {staged_files}
    mypy:
      glob: "*.py"
      run: uv run mypy {staged_files}
    biome:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm biome check {staged_files}
    typecheck:
      glob: "*.{ts,tsx}"
      run: pnpm -r type-check
commit-msg:
  commands:
    conventional:
      run: npx --no-install commitlint --edit {1}
```

Install: `lefthook install`. Bypass with `--no-verify` only for emergencies; explain in commit body.

---

## 13. Performance budgets

| Surface | Budget |
|---|---|
| Next bundle (initial route, gz) | ≤ 200 KB |
| Lighthouse Performance (mobile) | ≥ 85 on landing, ≥ 90 on `/exams` |
| FastAPI p95 navigation endpoint | < 300 ms |
| LLM scoring p95 (writing) | < 20 s |
| LLM scoring p95 (speaking) | < 30 s |
| Audio upload (200 MB max) | progressive (tus.io if > 5 min) |
| DB query p95 (admin tables) | < 100 ms (with indexes) |

CI fails if budgets regress > 10%.

---

## 14. Security checklist (every PR touching auth / data)

- [ ] No secrets in code; env vars only.
- [ ] All input validated by Pydantic / Zod.
- [ ] All output sanitised (React escapes; Markdown via DOMPurify).
- [ ] All mutations require `Idempotency-Key` and CSRF token.
- [ ] All cross-schema reads explicit; no implicit `JOIN` across services' DB privileges.
- [ ] Logs scrubbed of PII (no full essays, no passwords, no tokens, no card numbers).
- [ ] OWASP Top 10 reviewed (see [`05-auth-and-rbac.md`](05-auth-and-rbac.md) §14).

---

## 15. Acceptance

- [ ] `make bootstrap && make install` succeeds on a fresh machine in < 5 minutes.
- [ ] CI green on `main` continuously.
- [ ] Coverage badge shows ≥ 80% on `services/` for every Python service.
- [ ] No `any` in production TS files (excluding `.test.ts`).
- [ ] No raw SQL in production Python files (excluding migrations).
- [ ] No `print()` or `console.log()` in production paths.
- [ ] All migrations have working `downgrade()` (verified by `alembic downgrade base` in CI).
- [ ] All TODOs reference an issue: `# TODO(LP-123): ...`.
