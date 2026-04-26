"""LLM-specific settings — extends BaseAppSettings."""

from pydantic import Field
from pydantic_settings import SettingsConfigDict

from languagepro_common.settings import BaseAppSettings


class LLMSettings(BaseAppSettings):
    """All `LLM_PROFILE_*` envs are read as raw strings; LLMRouter parses them."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",  # accept dynamic LLM_PROFILE_* keys
        case_sensitive=False,
    )

    # Provider keys / endpoint
    OPENAI_API_KEY: str = "AIza..."
    OPENAI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"

    # Per-juror endpoints (optional; default to primary)
    JUROR_2_API_KEY: str | None = None
    JUROR_2_BASE_URL: str | None = None
    JUROR_3_API_KEY: str | None = None
    JUROR_3_BASE_URL: str | None = None

    # Default profiles (model:temperature). Service can override via env.
    LLM_PROFILE_GENERATE_QUESTION: str = "gemini-2.5-pro:0.7"
    LLM_PROFILE_GENERATE_QUESTION_FALLBACK: str = "gemini-2.0-pro:0.7"
    LLM_PROFILE_VALIDATE_QUESTION: str = "gemini-2.5-flash:0.0"
    LLM_PROFILE_VALIDATE_QUESTION_JURY_2: str = "gemini-2.0-flash:0.0"
    LLM_PROFILE_VALIDATE_QUESTION_JURY_3: str = "gemini-2.5-pro:0.0"
    LLM_PROFILE_CLASSIFY_CEFR: str = "gemini-2.5-flash:0.0"
    LLM_PROFILE_SCORE_WRITING: str = "gemini-2.5-pro:0.0"
    LLM_PROFILE_SCORE_WRITING_FALLBACK: str = "gemini-2.0-pro:0.0"
    LLM_PROFILE_SCORE_SPEAKING: str = "gemini-2.5-pro:0.0"
    LLM_PROFILE_FEEDBACK_UZ: str = "gemini-2.5-pro:0.4"
    LLM_PROFILE_FEEDBACK_EN: str = "gemini-2.5-pro:0.4"
    LLM_PROFILE_EMBED: str = "gemini-embedding-001"
    LLM_EMBED_DIMENSIONS: int = 768
    LLM_STT_PROFILE: str = "gemini-2.5-flash:0.0"

    # Behavior
    LLM_CACHE_TTL_SECONDS: int = Field(default=86_400)
    LLM_MAX_RETRIES: int = 3
    LLM_TIMEOUT_SECONDS: int = 120
    LLM_RUNTIME_CONFIG_REFRESH_SECONDS: int = 30

    def profile_for(self, purpose: str) -> str:
        """Lookup profile by purpose name (e.g. 'generate_question')."""
        env_key = f"LLM_PROFILE_{purpose.upper()}"
        return getattr(self, env_key, self.LLM_PROFILE_GENERATE_QUESTION)
