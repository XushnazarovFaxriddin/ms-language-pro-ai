# Contributor Guide

> **Til**: O'zbek (asosiy) + English (terminal commands)
> **Auditoriya**: Loyihaga yangi qo'shilayotgan rivojlantiruvchi (yoki kelajakdagi o'zingiz).
> **Maqsad**: 30 daqiqa ichida lokal muhitni ishga tushirish va birinchi PR yuborish.

---

## 1. Old shartlar (Prerequisites)

| Asbob | Versiya | O'rnatish |
|---|---|---|
| **macOS / Linux** | — | (Windows: WSL2 ishlating) |
| **Docker Desktop** | 4.30+ | https://www.docker.com/products/docker-desktop |
| **Node.js** | 22 LTS | `nvm install 22 && nvm use 22` |
| **pnpm** | 9.x | `corepack enable && corepack use pnpm@latest` |
| **Python** | 3.12+ | `uv python install 3.12` |
| **uv** | 0.5+ | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Git** | 2.40+ | `brew install git` |
| **VS Code** | latest | `brew install --cask visual-studio-code` (recommended) |
| **lefthook** | latest | `brew install lefthook` (Linux: `go install github.com/evilmartians/lefthook@latest`) |

VS Code uchun tavsiya etilgan kengaytmalar `.vscode/extensions.json`'da ro'yxatga olingan.

---

## 2. Loyihani klonlash va o'rnatish

```bash
# 1. Klon
git clone <repo-url> languagepro-ai
cd languagepro-ai

# 2. Environment fayl
cp .env.example .env

# 3. .env'ni to'ldiring
# Eng muhim:
#   GOOGLE_API_KEY=AIza...      ← Google AI Studio'dan oling
#   AUTH_JWT_SECRET=$(openssl rand -hex 32)
#   S2S_SHARED_SECRET=$(openssl rand -hex 32)
#   POSTGRES_PASSWORD=$(openssl rand -hex 16)

# 4. JS bog'liqliklari
pnpm install

# 5. Python workspace
uv sync

# 6. Pre-commit hooklarni o'rnatish
lefthook install

# 7. Docker servislarini ko'tarish (DB, Redis, MinIO, Caddy)
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis minio caddy

# 8. DB migratsiyalari
uv run alembic -c apps/auth-api/alembic.ini upgrade head
uv run alembic -c apps/data-engine-api/alembic.ini upgrade head
uv run alembic -c apps/exam-platform-api/alembic.ini upgrade head

# 9. Seed ma'lumotlar (taxonomies, demo questions, demo user)
uv run python scripts/seed_dev.py

# 10. Hammasini birga ishga tushirish (Turborepo + Procfile)
docker compose -f infra/compose/docker-compose.dev.yml up auth-api data-engine-api exam-platform-api
# Yoki alohida-alohida — ko'proq logs uchun:
# Terminal 1: cd apps/auth-api && uv run fastapi dev src/auth_api/main.py
# Terminal 2: cd apps/data-engine-api && uv run fastapi dev src/data_engine/main.py
# Terminal 3: cd apps/exam-platform-api && uv run fastapi dev src/exam_platform/main.py
# Terminal 4: pnpm dev (barcha web ilovalar)
```

URL'lar (Caddy lokalda hammasini routing qiladi):

| URL | Servis |
|---|---|
| http://localhost | landing |
| http://app.localhost | exam-platform-web |
| http://data-engine.localhost | data-engine-web |
| http://api.localhost/auth/v1/docs | auth-api Swagger |
| http://api.localhost/data/v1/docs | data-engine-api Swagger |
| http://api.localhost/exam/v1/docs | exam-platform-api Swagger |
| http://minio.localhost | MinIO console (login: minioadmin / minioadmin) |

> **macOS xush kelibsiz**: `*.localhost` avtomatik DNS orqali `127.0.0.1` ga ishlaydi (RFC 6761).

---

## 3. Birinchi PR

```bash
# Branch yaratish
git checkout -b bobo/my-first-feature   # yoki fax/, joint/

# Kodni o'zgartiring, testlar yozing

# Lokal sifat tekshiruvi (lefthook avtomatik chaqiradi, lekin qo'lda ham mumkin)
pnpm lint
pnpm type-check
pnpm test
uv run ruff check .
uv run mypy .
uv run pytest

# Kommit (Conventional Commits formatida)
git add .
git commit -m "bobo: feat(generation): add cefr classifier service"

# Push va PR ochish
git push -u origin bobo/my-first-feature
gh pr create --fill --web
```

PR description template `.github/pull_request_template.md`'da. Cross-thesis fayllar uchun ikkalasidan ham approve kerak (`docs/thesis-coordination.md`).

---

## 4. Yangi servis qo'shish

Loyihaga yangi mikroservis qo'shish (kamdan-kam — odatda mavjudini kengaytiramiz):

1. `apps/<servis-nomi>/` papkasi yarating (FastAPI bo'lsa, mavjud ikkita API'dan ko'chirib bashlang).
2. Root `pyproject.toml` `[tool.uv.workspace] members` ro'yxatiga qo'shing.
3. `infra/compose/docker-compose.dev.yml`'ga servis bloki qo'shing.
4. `infra/caddy/Caddyfile`'ga subdomain routing qo'shing.
5. `.env.example`'ga yangi env vars qo'shing.
6. `apps/<servis-nomi>/docs/`'da kamida `00-overview.md`, `01-architecture.md`, `02-api-spec.md` yozing.
7. ADR yozing: `docs/adr/NNNN-add-<servis-nomi>.md`.
8. PR yuboring — joint review.

---

## 5. Yangi feature qo'shish (mavjud servisda)

1. Mas'uliyat tekshiruvi: `docs/thesis-coordination.md` § 2 RACI matritsasi — siz egasimi yoki joint?
2. Branch ochish: `<owner>/feat-<slug>`.
3. Agar yangi API endpoint bo'lsa — `packages/contracts/`'da TS tip avval (yoki FastAPI router → OpenAPI → `pnpm contracts:generate` → TS tiplar).
4. Backend kod (Python) → tests → migration (kerak bo'lsa) → frontend kod (TS) → tests.
5. `docs/`'da o'zgargan qismlarni yangilang.
6. Thesis mapping: `apps/<owner>/docs/09-thesis-mapping.md` (yoki `10-`)'ga yangi qator qo'shing.
7. Lokal E2E ishga tushiring: `pnpm playwright test`.
8. PR.

---

## 6. Lokal debugging

### 6.1. Backend (FastAPI)

```bash
# Logs
docker compose logs -f data-engine-api

# Replay LLM call (Langfuse'da)
# Open http://langfuse.localhost va trace ID'ni qidiring

# DB konsoli
docker compose exec postgres psql -U languagepro -d languagepro

# Redis konsoli
docker compose exec redis redis-cli

# arq job runner status
docker compose logs -f data-engine-worker
```

### 6.2. Frontend (Next.js)

```bash
# Browser DevTools — React DevTools, Network tab
# Server Actions log'lari `pnpm dev` terminalida ko'rinadi
# RSC payload tekshirish: Network tab → "?_rsc=..." requests

# Type check
cd apps/exam-platform-web && pnpm type-check

# Single test
pnpm vitest src/features/exam-runner/__tests__/timer.test.tsx
```

### 6.3. E2E (Playwright)

```bash
# Headed (browser ko'rinadi)
pnpm playwright test --headed

# Faqat smoke
pnpm playwright test --project=e2e-smoke

# Inspector (qadam-baqadam)
PWDEBUG=1 pnpm playwright test exam-runner.spec.ts
```

---

## 7. Tipik muammolar (FAQ)

### "PostgreSQL connection refused"
- `docker compose ps` — postgres `Up` ekanligini tekshiring.
- `.env` `POSTGRES_HOST=postgres` (Docker network ichidan), yoki `localhost` (host'dan).

### "OPENAI_BASE_URL not reachable / 401"
- `GOOGLE_API_KEY` to'g'ri ekanligini tekshiring.
- `OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/` (oxiridagi `/` MUHIM!).
- Quota: https://aistudio.google.com/apikey.

### "Migration tarix konflikt"
- `alembic heads` — bir nechta head bo'lsa, manual merge qiling: `alembic merge -m "merge heads" head1 head2`.
- Migration buyrug'i o'zgargandan keyin `alembic upgrade head`.

### "Cookie subdomain bo'ylab ishlamayapti"
- `.env` `APEX_COOKIE_DOMAIN=.localhost` ekanligini tekshiring.
- Brauzer uchun: faqat HTTP'da `Secure` flag bo'lmasligi kerak (lokal yo'lda Caddy faqat HTTP).

### "pnpm install hatosi"
- Node 22.x ishlatayotganingizni tekshiring: `node -v`.
- `rm -rf node_modules .pnpm-store && pnpm install`.

### "uv sync slow"
- Birinchi marta — bu normal (Pyro, py-irt og'ir). Keyingi marta cache'dan keladi.

---

## 8. Foydali komandalar

```bash
# Format hammasini bir marta
pnpm format && uv run ruff format .

# Tip generator (FastAPI OpenAPI → TS)
pnpm contracts:generate

# Diagrammalarni renderlash (CI ham qiladi)
./scripts/render-diagrams.sh

# Yangi prompt versiyasi qo'shish
./scripts/new-prompt.sh score_writing

# DB ni nolga reset qilish
./scripts/reset-db.sh

# Demo ma'lumotlarni qayta seed qilish
uv run python scripts/seed_dev.py --reset

# Faqat o'zgargan testlarni ishga tushirish (Turborepo)
turbo test --filter='[HEAD~1]'
```

---

## 9. Ko'p marta yiqiladigan xatolar (yangilarga maslahat)

1. **`.env`'ni commit qilmaslik** — `.gitignore`'da, lekin baribir tekshiring.
2. **Migration o'zgargandan keyin downgrade ham yozish** — Alembic generator `op.drop_column(...)` ni avtomatik to'g'ri qilmaydi.
3. **Cross-thesis o'zgarishlarda ikkalasi review qilishi** — odatda PR'ni yopayotganda eslab qoladi.
4. **API contract o'zgartirishni avval ADR yozib, keyin amal qilish** — TS tipi noto'g'ri bo'lsa, frontend buziladi.
5. **LLM xarajatini kuzatib turish** — Langfuse dashboard'i ochiq turing. Bir nochalakat batch generation $5+ qilishi mumkin.

---

## 10. Yordam

- Slack/Telegram guruh: <link>
- Code review savollari: PR commentlarida @bobo yoki @fax mention qiling.
- Arxitektura savollari: `docs/`'ni avval qarab chiqing, keyin guruhda so'rang.
- Ilmiy rahbar bilan yarim oylik (bi-weekly) sync.

---

_Last reviewed: 2026-04-26 by joint authors. Refresh after week 2 stack stabilizes._
