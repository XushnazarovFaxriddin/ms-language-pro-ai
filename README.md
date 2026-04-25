# LanguagePro AI

> Sun'iy intellekt arxitekturalari yordamida xorijiy tilini bilish darajasini aniqlash platformasi.
> AI-powered IELTS & CEFR online assessment platform.

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](#litsenziya)
[![Status](https://img.shields.io/badge/status-pre--MVP-orange.svg)](#)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](#)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](#)

**LanguagePro AI** — Buxoro Davlat Universiteti talabalari tomonidan ishlab chiqilayotgan, dastur guvohnomasi bilan ro'yxatdan o'tkazilgan onlayn til baholash platformasi. IELTS Academic (Band 0–9) va CEFR (A1–C2) standartlariga moslashtirilgan, AI yordamida adaptiv test, avtomatik baholash va shaxsiylashtirilgan fikr-mulohaza beradi.

---

## Mualliflar (Authors)

Loyiha **2 ta magistrlik dissertatsiyasi** doirasida ishlab chiqilmoqda — bitta kod, ikki alohida himoya:

| Talaba | Mavzu | Hissasi | Subdomen |
|---|---|---|---|
| **Ismatov Bobomurod Raxmat o'g'li** | _Sun'iy intellekt arxitekturasi yordamida xorijiy tilni bilish darajasini aniqlash platformasining ma'lumotlar manbaini shakllantirish_ | Ma'lumotlar bazasi: AI orqali savollar generatsiya, multi-jury validatsiya, CEFR klassifikatsiya, IRT 2PL kalibratsiya | `data-engine.languagepro.ai` |
| **Xushnazarov Faxriddin Farhod o'g'li** | _Sun'iy intellekt arxitekturalari yordamida xorijiy tilini bilish darajasini aniqlash platformasini ishlab chiqish_ | Imtihon platformasi: adaptiv test runner, audio (Whisper), writing/speaking LLM scoring, sertifikatlar | `app.languagepro.ai` |

Yo'nalish: **70610101 — Kompyuter tizimlari va ularning dasturiy ta'minoti (sohalar bo'yichа)**

---

## Loyiha tarkibi (Monorepo)

```
desertation/
├── apps/
│   ├── landing/                # languagepro.ai — marketing landing
│   ├── data-engine-web/        # data-engine.languagepro.ai — Bobomurod admin UI
│   ├── data-engine-api/        # Bobomurod FastAPI backend
│   ├── exam-platform-web/      # app.languagepro.ai — Faxriddin student UI
│   ├── exam-platform-api/      # Faxriddin FastAPI backend
│   └── auth-api/               # Shared SSO (joint ownership)
├── packages/                   # @languagepro/{ui,contracts,i18n,config-*}
├── python/                     # languagepro_{llm,irt,common}
├── infra/                      # docker, compose, caddy, k8s
├── prompts/                    # Versioned LLM prompt templates (yaml)
├── docs/                       # Repo-level shared docs
└── .github/workflows/          # CI
```

To'liq arxitektura: [`docs/system-overview.md`](docs/system-overview.md).

---

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 15 (App Router, RSC), TypeScript, Tailwind v4, shadcn/ui, next-intl |
| Backend | Python FastAPI 0.115+, Pydantic v2, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 17 + pgvector |
| Cache/Queue | Redis 7 + arq |
| Storage | MinIO (dev), S3-compatible (prod) |
| LLM | OpenAI GPT-4o + Google Gemini 2.0 (LiteLLM gateway) |
| STT | OpenAI Whisper |
| IRT | py-irt (Pyro), 2PL model |
| Tooling | uv (Python), pnpm + Turborepo (JS) |
| Deploy | Docker Compose, Caddy 2 |
| Observability | Sentry, structlog, Langfuse |

---

## Lokal ishga tushirish

> **Diqqat**: Ushbu monorepo hozirda **Phase 0 (hujjatlash bosqichi)**'da. Kod hali ishga tushiriladigan holatda emas. Reja: `/Users/fxf/.claude/plans/biz-sen-bilan-magisterlik-tidy-newell.md`.

Implementatsiya boshlangach:

```bash
# 1. Clone va kirish
git clone <repo-url> languagepro-ai
cd languagepro-ai

# 2. Environment
cp .env.example .env
# .env'ni to'ldiring (OPENAI_API_KEY, GOOGLE_API_KEY, ...)

# 3. JS dependencies
pnpm install

# 4. Python dependencies (uv workspace)
uv sync

# 5. Servislarni ko'tarish
docker compose -f infra/compose/docker-compose.dev.yml up -d

# 6. DB migratsiya
uv run alembic -c apps/auth-api/alembic.ini upgrade head
uv run alembic -c apps/data-engine-api/alembic.ini upgrade head
uv run alembic -c apps/exam-platform-api/alembic.ini upgrade head

# 7. Dev server (Turborepo barcha web ilovalarni boshlaydi)
pnpm dev
```

Subdomen xaritasi (Caddy avtomatik konfiguratsiya):
- http://localhost — landing
- http://app.localhost — exam platform
- http://data-engine.localhost — admin
- http://api.localhost/{auth,data,exam}/v1/* — API'lar

---

## Hujjatlar

### Repo-level
- [`docs/system-overview.md`](docs/system-overview.md) — to'liq tizim arxitekturasi
- [`docs/api-contracts.md`](docs/api-contracts.md) — servislararo API shartnomalari
- [`docs/contributor-guide.md`](docs/contributor-guide.md) — qanday hissa qo'shish
- [`docs/thesis-coordination.md`](docs/thesis-coordination.md) — kim nimaga javobgar
- [`docs/data-licensing.md`](docs/data-licensing.md) — ma'lumotlar litsenziyasi
- [`docs/security.md`](docs/security.md) — threat model
- [`docs/coding-standards.md`](docs/coding-standards.md) — kod standartlari
- [`docs/glossary-uz-en.md`](docs/glossary-uz-en.md) — atamalar lug'ati
- [`docs/adr/`](docs/adr/) — Architecture Decision Records

### Per-project
- [`apps/data-engine-api/docs/`](apps/data-engine-api/docs/) — Bobomurod loyihasi (11 fayl + 5 ADR)
- [`apps/exam-platform-api/docs/`](apps/exam-platform-api/docs/) — Faxriddin loyihasi (12 fayl + 4 ADR)
- [`apps/data-engine-web/docs/`](apps/data-engine-web/docs/) — admin UI hujjatlari
- [`apps/exam-platform-web/docs/`](apps/exam-platform-web/docs/) — student UI hujjatlari

---

## Yo'l xaritasi (Roadmap)

| Phase | Davr | Holat |
|---|---|---|
| **Phase 0** — Docs & skeleton | 1-hafta | 🟡 In progress |
| **Phase 1** — Core scaffolding | 2-hafta | ⏳ |
| **Phase 2** — Question pipeline + Exam runner E2E | 3–6 haftalar | ⏳ |
| **Phase 3** — LLM scoring + IRT + i18n | 7–9 haftalar | ⏳ |
| **Phase 4** — Pilot + thesis writing | 10–11 haftalar | ⏳ |
| **Phase 5** — Defense | 12-hafta | ⏳ |

Batafsil: `docs/system-overview.md` § Phased Delivery.

---

## Litsenziya

Mualliflik huquqi © 2026 Ismatov Bobomurod & Xushnazarov Faxriddin.
Dastur guvohnomasi: **LanguagePro AI** (O'zbekiston Respublikasi Adliya vazirligi).

Akademik foydalanish va manba sifatida iqtiboslash uchun ochiq. Tijoriy foydalanish — mualliflar ruxsati bilan.

---

## Aloqa

- **Faxriddin Xushnazarov**: xushnazarov1555@gmail.com
- **Universitet**: Buxoro Davlat Universiteti, Kompyuter ilmlari fakulteti
