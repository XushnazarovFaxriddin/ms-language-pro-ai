"""LLMRouter — uses `openai` SDK, points at Gemini's OpenAI-compatible endpoint.

Single client library, model swap via env (`LLM_PROFILE_<PURPOSE>=<model>:<temp>`).
**ChatGPT (OpenAI GPT-*) is intentionally not used — Gemini only.**
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass
from decimal import Decimal
from importlib import import_module
from typing import Any, Literal
from uuid import UUID, uuid4

from languagepro_common.logging import get_logger
from openai import APIError, AsyncOpenAI, RateLimitError
from pydantic import BaseModel
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from languagepro_llm.cost import CostLogger, compute_cost
from languagepro_llm.prompts import PromptRegistry, RenderedPrompt
from languagepro_llm.settings import LLMSettings

log = get_logger(__name__)

Purpose = Literal[
    "generate_question",
    "validate_question",
    "score_writing",
    "score_speaking",
    "classify_cefr",
    "feedback",
    "embed",
    "stt",
]


@dataclass(frozen=True)
class LLMProfile:
    model: str
    temperature: float
    api_key: str | None = None  # default = OPENAI_API_KEY
    base_url: str | None = None  # default = OPENAI_BASE_URL

    @classmethod
    def parse(cls, raw: str, *, default_api_key: str, default_base_url: str) -> LLMProfile:
        """Format: 'model:temperature' (provider implicit via base_url)."""
        if ":" in raw:
            model, temp_str = raw.rsplit(":", 1)
            try:
                temp = float(temp_str)
            except ValueError:
                model = raw
                temp = 0.0
        else:
            model = raw
            temp = 0.0
        return cls(
            model=model, temperature=temp, api_key=default_api_key, base_url=default_base_url
        )


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMRequest(BaseModel):
    purpose: Purpose
    prompt_id: str  # "<purpose>/<sub_purpose>"
    variables: dict[str, Any] = {}
    response_schema: dict[str, Any] | None = None  # JSON schema dict
    profile_override: str | None = None  # raw "model:temp" override
    max_tokens: int | None = None
    audio_input: bytes | None = None  # for multimodal speaking/STT
    audio_format: str = "wav"
    # Context for cost log:
    user_id: UUID | None = None
    attempt_id: UUID | None = None
    question_id: UUID | None = None


class LLMResponse(BaseModel):
    request_id: UUID
    content: str  # raw text or JSON string
    parsed: Any | None = None  # parsed JSON if response_schema provided
    model: str
    usage: TokenUsage
    cost_usd: Decimal
    latency_ms: int
    cache_hit: bool = False
    prompt_version_id: str | None = None


class LLMRouter:
    """Stateful router. Service constructs once and injects into services/jobs."""

    def __init__(
        self,
        settings: LLMSettings,
        prompts: PromptRegistry,
        cost_logger: CostLogger | None = None,
    ):
        self._settings = settings
        self._prompts = prompts
        self._cost_logger = cost_logger or CostLogger()
        self._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )

    # ------------------------------------------------------------------ chat
    async def complete(self, req: LLMRequest) -> LLMResponse:
        purpose, sub_purpose = self._split_prompt_id(req.prompt_id)
        rendered = self._prompts.render(purpose, sub_purpose, req.variables)
        profile = self._resolve_profile(req)
        response_schema = req.response_schema or self._schema_from_ref(rendered.response_schema_ref)
        effective_req = req.model_copy(update={"response_schema": response_schema})

        request_id = uuid4()
        log.info(
            "llm_request",
            request_id=str(request_id),
            purpose=req.purpose,
            model=profile.model,
            prompt_version=f"{purpose}/{sub_purpose}/v{rendered.prompt_version.version}",
        )

        t0 = time.perf_counter()
        try:
            content, usage = await self._do_chat(profile, rendered, effective_req)
        except Exception as e:
            log.exception("llm_request_failed", request_id=str(request_id), error=str(e))
            raise
        latency_ms = int((time.perf_counter() - t0) * 1000)

        parsed = self._maybe_parse(content, response_schema)
        cost = compute_cost(profile.model, usage.prompt_tokens, usage.completion_tokens)
        await self._cost_logger.record(
            request_id=request_id,
            purpose=req.purpose,
            provider="gemini",
            model=profile.model,
            prompt_version_id=f"{purpose}/{sub_purpose}/v{rendered.prompt_version.version}",
            tokens_in=usage.prompt_tokens,
            tokens_out=usage.completion_tokens,
            cost_usd=cost,
            latency_ms=latency_ms,
            cache_hit=False,
            user_id=req.user_id,
            attempt_id=req.attempt_id,
            question_id=req.question_id,
            status="success",
        )
        return LLMResponse(
            request_id=request_id,
            content=content,
            parsed=parsed,
            model=profile.model,
            usage=usage,
            cost_usd=cost,
            latency_ms=latency_ms,
            prompt_version_id=f"{purpose}/{sub_purpose}/v{rendered.prompt_version.version}",
        )

    @retry(
        retry=retry_if_exception_type((RateLimitError, APIError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, max=10),
        reraise=True,
    )
    async def _do_chat(
        self, profile: LLMProfile, rendered: RenderedPrompt, req: LLMRequest
    ) -> tuple[str, TokenUsage]:
        kwargs: dict[str, Any] = {
            "model": profile.model,
            "messages": self._maybe_inject_audio(rendered.messages, req),
            "temperature": profile.temperature,
        }
        if req.max_tokens is not None:
            kwargs["max_tokens"] = req.max_tokens
        if req.response_schema is not None:
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "structured_output",
                    "schema": req.response_schema,
                    "strict": True,
                },
            }
        resp = await self._client.chat.completions.create(**kwargs)
        content = resp.choices[0].message.content or ""
        u = resp.usage
        usage = TokenUsage(
            prompt_tokens=getattr(u, "prompt_tokens", 0) if u else 0,
            completion_tokens=getattr(u, "completion_tokens", 0) if u else 0,
            total_tokens=getattr(u, "total_tokens", 0) if u else 0,
        )
        return content, usage

    # ------------------------------------------------------------- embeddings
    async def embed(
        self,
        text: str,
        *,
        model: str | None = None,
        dimensions: int | None = None,
    ) -> list[float]:
        """Embed text via Gemini embedding model (default `gemini-embedding-001`).

        `gemini-embedding-001` supports Matryoshka truncation; pass `dimensions`
        to get a smaller vector (e.g. 768 for pgvector(768) column).
        """
        m = model or self._settings.LLM_PROFILE_EMBED
        d = dimensions or self._settings.LLM_EMBED_DIMENSIONS
        kwargs: dict[str, Any] = {"model": m, "input": text}
        if d:
            kwargs["dimensions"] = d
        resp = await self._client.embeddings.create(**kwargs)
        tokens_in = getattr(resp.usage, "prompt_tokens", 0) if resp.usage else 0
        await self._cost_logger.record(
            request_id=uuid4(),
            purpose="embed",
            provider="gemini",
            model=m,
            tokens_in=tokens_in,
            tokens_out=0,
            cost_usd=compute_cost(m, tokens_in, 0),
            latency_ms=0,
            cache_hit=False,
            status="success",
        )
        return resp.data[0].embedding

    # -------------------------------------------------------------- internals
    def _resolve_profile(self, req: LLMRequest) -> LLMProfile:
        raw = req.profile_override or self._settings.profile_for(req.purpose)
        return LLMProfile.parse(
            raw,
            default_api_key=self._settings.OPENAI_API_KEY,
            default_base_url=self._settings.OPENAI_BASE_URL,
        )

    @staticmethod
    def _split_prompt_id(prompt_id: str) -> tuple[str, str]:
        parts = prompt_id.split("/", 1)
        if len(parts) != 2:
            raise ValueError(f"prompt_id must be 'purpose/sub_purpose', got {prompt_id!r}")
        return parts[0], parts[1]

    @staticmethod
    def _maybe_parse(content: str, schema: dict[str, Any] | None) -> Any | None:
        if schema is None:
            return None
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            log.warning("llm_json_parse_failed", content_preview=content[:200])
            return None

    @staticmethod
    def _schema_from_ref(ref: str | None) -> dict[str, Any] | None:
        """Resolve `package.module.Model` refs from prompt YAML into JSON Schema."""
        if not ref:
            return None
        module_name, class_name = ref.rsplit(".", 1)
        model_cls = getattr(import_module(module_name), class_name)
        if not isinstance(model_cls, type) or not issubclass(model_cls, BaseModel):
            raise TypeError(f"{ref} must point to a pydantic BaseModel subclass")
        return model_cls.model_json_schema()

    @staticmethod
    def _maybe_inject_audio(
        messages: list[dict[str, Any]], req: LLMRequest
    ) -> list[dict[str, Any]]:
        if not req.audio_input:
            return messages
        # Multimodal: replace last user message text with content array including audio
        import base64

        b64 = base64.b64encode(req.audio_input).decode()
        last = messages[-1]
        text_part = last["content"] if isinstance(last["content"], str) else ""
        last["content"] = [
            {"type": "text", "text": text_part},
            {"type": "input_audio", "input_audio": {"data": b64, "format": req.audio_format}},
        ]
        return messages

    @staticmethod
    def cache_key(
        model: str,
        messages: list[dict[str, Any]],
        schema: dict[str, Any] | None,
    ) -> str:
        payload = json.dumps(
            {"m": model, "msgs": messages, "schema": schema}, sort_keys=True, default=str
        )
        return "llm:" + hashlib.sha256(payload.encode()).hexdigest()
