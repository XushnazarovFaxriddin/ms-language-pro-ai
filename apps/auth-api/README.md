# auth-api

> **Owner**: Joint
> **Stack**: Python 3.12 · FastAPI · SQLAlchemy 2.0 · Argon2 · JWT · Authlib (OAuth)

Shared SSO authentication service. Issues JWT cookies on `.languagepro.ai` apex domain.

## Run locally
```bash
uv sync
uv run alembic -c alembic.ini upgrade head
uv run fastapi dev src/auth_api/main.py --port 8002
```

## Docs
[`docs/`](docs/) — JWT cookie strategy, refresh rotation, OAuth flow.
Cross-cutting: [`/docs/adr/0005-shared-sso-auth.md`](../../docs/adr/0005-shared-sso-auth.md), [`/docs/security.md`](../../docs/security.md).
