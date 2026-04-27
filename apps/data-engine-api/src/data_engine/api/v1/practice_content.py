"""Admin generation endpoints for practice catalogue content."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from languagepro_llm import LLMRouter

from data_engine.api.deps import require_roles
from data_engine.schemas.api import (
    DrillGenerateOut,
    DrillGenerateRequest,
    ListeningPassageGenerateOut,
    ListeningPassageGenerateRequest,
)
from data_engine.services.practice_content import (
    generate_drill_draft,
    generate_listening_passage,
)
from data_engine.services.router_factory import get_router

router = APIRouter(tags=["practice-content"])


@router.post("/drills/generate", response_model=DrillGenerateOut)
async def generate_drill(
    body: DrillGenerateRequest,
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    router_client: Annotated[LLMRouter, Depends(get_router)],
) -> DrillGenerateOut:
    draft, model, prompt_version_id = await generate_drill_draft(router_client, body)
    return DrillGenerateOut(
        draft=draft,
        model=model,
        prompt_version_id=prompt_version_id,
    )


@router.post("/listening-passages/generate", response_model=ListeningPassageGenerateOut)
async def generate_listening_passage_draft(
    body: ListeningPassageGenerateRequest,
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    router_client: Annotated[LLMRouter, Depends(get_router)],
) -> ListeningPassageGenerateOut:
    passage, model, prompt_version_id = await generate_listening_passage(router_client, body)
    return ListeningPassageGenerateOut(
        passage=passage,
        model=model,
        prompt_version_id=prompt_version_id,
    )
