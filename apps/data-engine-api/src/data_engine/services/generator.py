"""Question generation pipeline (Bobomurod)."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4

from languagepro_irt import cold_start_b
from languagepro_llm import LLMRequest, LLMRouter
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.models import (
    CefrLevel,
    Question,
    QuestionEmbedding,
    Skill,
    ValidationResult,
)
from data_engine.schemas.llm_io import QuestionDraft
from data_engine.services.cefr import classify_cefr
from data_engine.services.dedup import find_duplicate
from data_engine.services.jury import multi_jury


@dataclass(frozen=True)
class GenerationOutcome:
    question_id: UUID | None
    status: str  # 'approved' | 'needs_review' | 'rejected_jury' | 'rejected_dup' | 'rejected_level'
    reason: str | None = None


async def generate_one(
    db: AsyncSession,
    router: LLMRouter,
    *,
    bank_id: UUID,
    skill: str,
    cefr_level: str,
    topic: str,
) -> GenerationOutcome:
    skill_row = (await db.execute(select(Skill).where(Skill.code == skill))).scalar_one()
    cefr_row = (
        await db.execute(select(CefrLevel).where(CefrLevel.code == cefr_level))
    ).scalar_one()

    # 1. generate
    gen_req = LLMRequest(
        purpose="generate_question",
        prompt_id="generate_question/mcq_reading",
        variables={"topic": topic, "cefr_level": cefr_level},
        response_schema=QuestionDraft.model_json_schema(),
    )
    gen_resp = await router.complete(gen_req)
    if not gen_resp.parsed:
        return GenerationOutcome(None, "rejected_jury", "generation parse failed")
    draft = QuestionDraft.model_validate(gen_resp.parsed)

    # 2. embed (passage + prompt)
    embed_text = f"{draft.passage}\n\n{draft.prompt}"
    embedding = await router.embed(embed_text)

    # 3. dedup
    dup_id = await find_duplicate(db, embedding, skill_row.id)
    if dup_id is not None:
        return GenerationOutcome(None, "rejected_dup", f"near-duplicate of {dup_id}")

    # 4. multi-jury validation
    payload = {
        "passage": draft.passage,
        "prompt": draft.prompt,
        "options": [o.model_dump() for o in draft.options],
    }
    answer_key = {
        "correct_option_id": draft.correct_option_id,
        "distractor_rationale": draft.distractor_rationale,
    }
    jury = await multi_jury(router, payload, answer_key, target_cefr=cefr_level)

    # 5. CEFR classify (only for approve / needs_review)
    cefr_class = await classify_cefr(router, draft.passage)
    level_match = cefr_class.actual_level == cefr_level

    # 6. decide
    if jury.consensus == "rejected_jury":
        status = "draft"   # save for inspection but mark draft
        reason = "jury rejected"
    elif jury.consensus == "needs_review" or not level_match:
        status = "in_review"
        reason = (
            f"jury={jury.consensus}; cefr_actual={cefr_class.actual_level} "
            f"(target {cefr_level})"
        )
    else:
        status = "approved"
        reason = None

    # 7. cold-start b
    b = cold_start_b(draft.difficulty_self_rating)

    # 8. persist Question
    qid = uuid4()
    await db.execute(
        insert(Question).values(
            id=qid,
            bank_id=bank_id,
            type="mcq_single",
            status=status,
            skill_id=skill_row.id,
            cefr_level_id=cefr_row.id,
            payload=payload,
            answer_key=answer_key,
            difficulty_b=Decimal(str(b)),
            discrimination_a=Decimal("1.0"),
            guessing_c=Decimal("0.25"),
            generated_by_model=gen_resp.model,
            prompt_version_id=gen_resp.prompt_version_id,
            generation_run_id=gen_resp.request_id,
            estimated_seconds=draft.estimated_seconds,
        )
    )

    # 9. persist Embedding
    await db.execute(
        insert(QuestionEmbedding).values(
            question_id=qid,
            embedding=embedding,
            model=router._settings.LLM_PROFILE_EMBED,
        )
    )

    # 10. persist juror verdicts
    for verdict, juror_model in zip(jury.verdicts, jury.juror_models, strict=True):
        await db.execute(
            insert(ValidationResult).values(
                question_id=qid,
                juror_model=juror_model,
                verdict=verdict.verdict,
                reasoning=verdict.reasoning,
                criteria_scores=verdict.criteria_scores,
            )
        )

    await db.commit()

    return GenerationOutcome(qid, status, reason)
