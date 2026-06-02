# LanguagePro AI

Production-ready IELTS / CEFR English assessment platform for `aiexam.uz`.

The implementation contract lives in [docs/README.md](docs/README.md). Code in
`apps/`, `packages/`, and `python/` is useful reference, but the root docs are the
source of truth on every disagreement.

## What This Is

LanguagePro AI helps learners take adaptive English exams, receive Gemini-powered
feedback in Uzbek and English, and track progress over time. The product targets
Uzbekistan first, with Click / Payme / Stripe billing planned for Phase 4.

## Monorepo

```text
desertation/
├── apps/
│   ├── landing/                # aiexam.uz marketing
│   ├── exam-platform-web/      # app.aiexam.uz student app
│   ├── data-engine-web/        # admin.aiexam.uz content admin
│   ├── auth-api/               # shared SSO
│   ├── data-engine-api/        # question banks, generation, analytics
│   └── exam-platform-api/      # attempts, scoring, certificates
├── packages/                   # @languagepro/{ui,contracts,i18n,config-*}
├── python/                     # languagepro_{common,llm,irt}
├── prompts/                    # runtime LLM YAML templates
├── infra/                      # compose, caddy, docker
└── docs/                       # production engineering spec
```

## Hard Rules

- Gemini only through the official `openai` SDK.
- UZ + EN user-facing surfaces.
- Light + dark themes through design tokens only.
- Payments and billing stay in Phase 4.
- Commit messages cite the relevant doc section.

## Local Development

```bash
make bootstrap
make install
make up
make migrate
make seed
make dev
```

Primary local URLs:

- `http://localhost:3000` - landing
- `http://localhost:3001` - student app (app.localhost via Caddy)
- `http://localhost:3002` - admin app (admin.localhost via Caddy)
- `http://localhost:8002/v1/docs` - auth API
- `http://localhost:8000/v1/docs` - data engine API
- `http://localhost:8001/v1/docs` - exam platform API
- `http://localhost:9001` - MinIO S3 console

## Development Credentials

> **⚠️ These are for local development only. Never use in production.**

After running `make seed`, the following accounts are available:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Student | `student@aiexam.uz` | `student12345` | Exam platform (port 3001) |
| Admin | `admin@aiexam.uz` | `admin12345` | Both platforms |
| Content Admin | `bobomurod@aiexam.uz` | `content12345` | Content Studio (port 3002) |

**MinIO Console**: `minioadmin` / `minioadmin_change_in_prod`

**API Key**: Set `GOOGLE_API_KEY` in `.env` before using LLM features (generation, scoring, feedback).

## Read First

- [docs/00-product-spec.md](docs/00-product-spec.md)
- [docs/01-tech-stack.md](docs/01-tech-stack.md)
- [docs/02-architecture.md](docs/02-architecture.md)
- [docs/12-roadmap-and-phases.md](docs/12-roadmap-and-phases.md)

Legacy dissertation-era docs were moved to [docs/_legacy](docs/_legacy/).
