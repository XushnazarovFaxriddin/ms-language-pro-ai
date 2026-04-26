"""CEFR text classifier (LLM-based)."""

from __future__ import annotations

from languagepro_llm import LLMRequest, LLMRouter

from data_engine.schemas.llm_io import CefrClassification


async def classify_cefr(router: LLMRouter, text: str) -> CefrClassification:
    req = LLMRequest(
        purpose="classify_cefr",
        prompt_id="classify_cefr/generic",
        variables={"text": text},
        response_schema=CefrClassification.model_json_schema(),
    )
    resp = await router.complete(req)
    if resp.parsed:
        return CefrClassification.model_validate(resp.parsed)
    return CefrClassification(actual_level="B1", confidence=0.0, evidence="parse failure")
