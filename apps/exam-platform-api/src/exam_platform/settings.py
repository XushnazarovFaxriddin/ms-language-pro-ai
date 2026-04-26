from pydantic_settings import SettingsConfigDict

from languagepro_llm.settings import LLMSettings


class Settings(LLMSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    SERVICE_NAME: str = "exam-platform-api"
    AUTH_JWT_ISSUER: str = "auth.aiexam.uz"
    AUTH_JWT_AUDIENCE: str = "aiexam.uz"

    DATA_ENGINE_API_URL: str = "http://data-engine-api:8000"
    PROMPTS_DIR: str = "/app/prompts"

    S3_ENDPOINT: str = "http://minio:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_AUDIO: str = "audio-recordings"


settings = Settings()
