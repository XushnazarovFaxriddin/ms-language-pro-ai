"""Shared base settings. Each service extends with its own pydantic-settings class."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseAppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    SERVICE_NAME: str = "unknown"
    NODE_ENV: str = "development"
    PYTHON_ENV: str = "development"

    # Domain / cookies
    APP_DOMAIN: str = "localhost"
    APEX_COOKIE_DOMAIN: str = "localhost"
    AUTH_REFRESH_COOKIE_PATH: str = "/v1/refresh"

    # Postgres
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://languagepro:changeme@postgres:5432/languagepro"
    )

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_LLM_CACHE_DB: int = 1
    REDIS_QUEUE_DB: int = 2

    # JWT
    AUTH_JWT_SECRET: str = "replace_with_64_byte_hex"  # noqa: S105
    AUTH_JWT_ALGORITHM: str = "HS256"
    AUTH_ACCESS_TOKEN_TTL_SECONDS: int = 900
    AUTH_REFRESH_TOKEN_TTL_SECONDS: int = 2_592_000

    # S2S
    S2S_SHARED_SECRET: str = "replace_with_64_byte_hex"  # noqa: S105
    S2S_TOKEN_TTL_SECONDS: int = 300

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # "json" or "console"

    # Observability
    SENTRY_DSN: str | None = None

    @property
    def is_dev(self) -> bool:
        return self.PYTHON_ENV == "development"
