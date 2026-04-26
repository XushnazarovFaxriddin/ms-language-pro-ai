# LanguagePro AI — Developer convenience targets

.DEFAULT_GOAL := help
.PHONY: help bootstrap install up down logs ps migrate seed dev clean reset typecheck lint test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

bootstrap: ## Install all required tools (uv, pnpm, lefthook) via brew
	@command -v brew >/dev/null 2>&1 || { echo "❌ Homebrew required: https://brew.sh"; exit 1; }
	@command -v uv >/dev/null 2>&1 || brew install uv
	@command -v pnpm >/dev/null 2>&1 || brew install pnpm
	@command -v node >/dev/null 2>&1 || brew install node@22
	@command -v lefthook >/dev/null 2>&1 || brew install lefthook
	@echo "✅ Tools installed. Next: make install"

install: ## Install dependencies (Python + JS workspaces)
	uv sync
	pnpm install
	@test -f .env || cp .env.example .env && echo "📝 .env created — edit it (set GOOGLE_API_KEY at minimum)"
	@echo "✅ Dependencies installed."

up: ## Start docker stack (postgres, redis, minio, caddy, APIs, workers)
	docker compose -f infra/compose/docker-compose.dev.yml up -d
	@echo "✅ Stack up. Wait ~10s for healthchecks, then: make migrate"

down: ## Stop docker stack
	docker compose -f infra/compose/docker-compose.dev.yml down

logs: ## Tail all docker logs
	docker compose -f infra/compose/docker-compose.dev.yml logs -f --tail=100

ps: ## Show running containers
	docker compose -f infra/compose/docker-compose.dev.yml ps

migrate: ## Run all Alembic migrations
	@set -e; \
	set -a; [ ! -f .env ] || . ./.env; set +a; \
	DB_URL="$${HOST_DATABASE_URL:-postgresql+asyncpg://$${POSTGRES_USER:-languagepro}:$${POSTGRES_PASSWORD:-changeme}@localhost:$${POSTGRES_PORT:-5432}/$${POSTGRES_DB:-languagepro}}"; \
	cd apps/auth-api && DATABASE_URL="$$DB_URL" uv run alembic upgrade head; \
	cd ../data-engine-api && DATABASE_URL="$$DB_URL" uv run alembic upgrade head; \
	cd ../exam-platform-api && DATABASE_URL="$$DB_URL" uv run alembic upgrade head
	@echo "✅ Migrations applied."

seed: ## Seed dev data (taxonomies, demo users, etc.)
	@set -e; \
	set -a; [ ! -f .env ] || . ./.env; set +a; \
	DB_URL="$${HOST_DATABASE_URL:-postgresql+asyncpg://$${POSTGRES_USER:-languagepro}:$${POSTGRES_PASSWORD:-changeme}@localhost:$${POSTGRES_PORT:-5432}/$${POSTGRES_DB:-languagepro}}"; \
	DATABASE_URL="$$DB_URL" uv run python scripts/seed_dev.py
	@echo "✅ Seeded."

dev: ## Start Next.js dev servers (host-side, fast HMR)
	pnpm --parallel --filter landing --filter exam-platform-web --filter data-engine-web dev

typecheck: ## Type-check Python (mypy) + TS (tsc)
	uv run mypy python/ apps/auth-api apps/data-engine-api apps/exam-platform-api
	pnpm -r type-check

lint: ## Lint Python (ruff) + JS
	uv run ruff check .
	pnpm -r lint

test: ## Run all tests (pytest + vitest)
	uv run pytest
	pnpm -r test

reset: ## DESTRUCTIVE: drop all volumes + restart
	docker compose -f infra/compose/docker-compose.dev.yml down -v
	docker compose -f infra/compose/docker-compose.dev.yml up -d
	$(MAKE) migrate

clean: ## Remove build artifacts (no docker)
	find . -type d \( -name '__pycache__' -o -name '.next' -o -name '.turbo' -o -name 'dist' -o -name '.mypy_cache' -o -name '.ruff_cache' -o -name '.pytest_cache' \) -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned."
