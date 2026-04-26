from pydantic_settings import SettingsConfigDict

from languagepro_llm.settings import LLMSettings


class Settings(LLMSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    SERVICE_NAME: str = "data-engine-api"
    AUTH_JWT_ISSUER: str = "auth.aiexam.uz"
    AUTH_JWT_AUDIENCE: str = "aiexam.uz"

    PROMPTS_DIR: str = "/app/prompts"


settings = Settings()
