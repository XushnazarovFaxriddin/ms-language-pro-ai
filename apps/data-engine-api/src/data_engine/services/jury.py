"""Multi-jury validation: 3 LLM jurors vote on a question."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from languagepro_llm import LLMRequest, LLMRouter

from data_engine.schemas.llm_io import JuryVerdict


@dataclass(frozen=True)
class JuryDecision:
    verdicts: list[JuryVerdict]
    juror_models: list[str]
    consensus: str  # approve | needs_review | rejected_jury


JUROR_PROFILE_KEYS = (
    "validate_question",          # primary (gemini-2.5-flash)
    "validate_question_jury_2",   # gemini-2.0-flash
    "validate_question_jury_3",   # gemini-2.5-pro
)


async def multi_jury(
    router: LLMRouter, question_payload: dict, answer_key: dict, target_cefr: str
) -> JuryDecision:
    async def _one(profile_purpose: str) -> tuple[JuryVerdict, str]:
        # The LLMRouter looks up the env var by purpose name.
        req = LLMRequest(
            purpose="validate_question",
            prompt_id="validate_question/generic",
            variables={
                "question_payload": question_payload,
                "answer_key": answer_key,
                "target_cefr": target_cefr,
            },
            response_schema=JuryVerdict.model_json_schema(),
            profile_override=getattr(router._settings, f"LLM_PROFILE_{profile_purpose.upper()}", None)
            or router._settings.LLM_PROFILE_VALIDATE_QUESTION,
        )
        resp = await router.complete(req)
        verdict = (
            JuryVerdict.model_validate(resp.parsed)
            if resp.parsed
            else JuryVerdict(verdict="reject", reasoning="parse failure", criteria_scores={})
        )
        return verdict, resp.model

    pairs = await asyncio.gather(*(_one(k) for k in JUROR_PROFILE_KEYS))
    verdicts = [p[0] for p in pairs]
    models = [p[1] for p in pairs]
    approves = sum(v.verdict == "approve" for v in verdicts)

    if approves == 3:
        consensus = "approve"
    elif approves >= 2:
        consensus = "needs_review"
    else:
        consensus = "rejected_jury"

    return JuryDecision(verdicts=verdicts, juror_models=models, consensus=consensus)
