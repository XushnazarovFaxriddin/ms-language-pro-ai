"""LLM-backed generators for practice and listening content."""

from __future__ import annotations

from languagepro_common.errors import ValidationError
from languagepro_llm import LLMRequest, LLMRouter

from data_engine.schemas.api import DrillGenerateRequest, ListeningPassageGenerateRequest
from data_engine.schemas.llm_io import DrillDraft, ListeningPassage


async def generate_drill_draft(
    router: LLMRouter,
    body: DrillGenerateRequest,
) -> tuple[DrillDraft, str, str | None]:
    resp = await router.complete(
        LLMRequest(
            purpose="generate_question",
            prompt_id="generate_question/drill_generate",
            variables=body.model_dump(mode="json"),
        )
    )
    if resp.parsed is None:
        raise ValidationError("Drill draft response did not match schema")
    return DrillDraft.model_validate(resp.parsed), resp.model, resp.prompt_version_id


async def generate_listening_passage(
    router: LLMRouter,
    body: ListeningPassageGenerateRequest,
) -> tuple[ListeningPassage, str, str | None]:
    resp = await router.complete(
        LLMRequest(
            purpose="generate_question",
            prompt_id="generate_question/listening_passage",
            variables=body.model_dump(mode="json"),
        )
    )
    if resp.parsed is None:
        raise ValidationError("Listening passage response did not match schema")
    return ListeningPassage.model_validate(resp.parsed), resp.model, resp.prompt_version_id
