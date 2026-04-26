from pydantic_settings import SettingsConfigDict

from languagepro_common.settings import BaseAppSettings


class Settings(BaseAppSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    SERVICE_NAME: str = "auth-api"

    AUTH_JWT_ISSUER: str = "auth.aiexam.uz"
    AUTH_JWT_AUDIENCE: str = "aiexam.uz"

    GOOGLE_OAUTH_CLIENT_ID: str | None = None
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = None
    GOOGLE_OAUTH_REDIRECT_URI: str | None = None


settings = Settings()
