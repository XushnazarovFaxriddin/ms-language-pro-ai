"""Layered feedback endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from languagepro_common.auth import CurrentUser
from languagepro_llm import LLMRouter
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.api.deps import get_current_user
from exam_platform.db import get_session
from exam_platform.schemas import (
    AnalyseWritingRequest,
    AttemptFeedbackOut,
    FeedbackArtifactOut,
    FeedbackOverviewRequest,
    ResponseFeedbackOut,
)
from exam_platform.services import feedback as feedback_svc
from exam_platform.services.router_factory import get_router

router = APIRouter(tags=["feedback"])


@router.get("/attempts/{attempt_id}/feedback", response_model=AttemptFeedbackOut)
async def attempt_feedback(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    layer: str | None = Query(default=None),
) -> AttemptFeedbackOut:
    artifacts = await feedback_svc.get_attempt_artifacts(
        db,
        user_id=user.id,
        attempt_id=attempt_id,
        layer=layer,
    )
    return AttemptFeedbackOut(attempt_id=attempt_id, artifacts=artifacts)


@router.get("/me/feedback/recent", response_model=list[AttemptFeedbackOut])
async def recent_feedback(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: int = Query(default=5, ge=1, le=20),
) -> list[AttemptFeedbackOut]:
    recent = await feedback_svc.get_recent_attempt_feedback(
        db,
        user_id=user.id,
        limit=limit,
    )
    return [
        AttemptFeedbackOut(attempt_id=attempt_id, artifacts=artifacts)
        for attempt_id, artifacts in recent
    ]


@router.get("/responses/{response_id}/feedback", response_model=ResponseFeedbackOut)
async def response_feedback(
    response_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    layer: str | None = Query(default=None),
) -> ResponseFeedbackOut:
    artifacts = await feedback_svc.get_response_artifacts(
        db,
        user_id=user.id,
        response_id=response_id,
        layer=layer,
    )
    return ResponseFeedbackOut(response_id=response_id, artifacts=artifacts)


@router.post(
    "/attempts/{attempt_id}/feedback/overview",
    response_model=FeedbackArtifactOut,
)
async def feedback_overview(
    attempt_id: UUID,
    body: FeedbackOverviewRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    router_client: Annotated[LLMRouter, Depends(get_router)],
) -> FeedbackArtifactOut:
    return await feedback_svc.generate_attempt_overview(
        db,
        router_client,
        user_id=user.id,
        attempt_id=attempt_id,
        body=body,
    )


@router.post(
    "/responses/{response_id}/feedback/analyse-writing", response_model=ResponseFeedbackOut
)
async def analyse_writing(
    response_id: UUID,
    body: AnalyseWritingRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    router_client: Annotated[LLMRouter, Depends(get_router)],
) -> ResponseFeedbackOut:
    artifacts = await feedback_svc.analyse_writing_response(
        db,
        router_client,
        user_id=user.id,
        response_id=response_id,
        body=body,
    )
    return ResponseFeedbackOut(response_id=response_id, artifacts=artifacts)


@router.get("/responses/{response_id}/text-analysis", response_model=ResponseFeedbackOut)
async def text_analysis(
    response_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ResponseFeedbackOut:
    artifacts = await feedback_svc.get_response_artifacts(
        db,
        user_id=user.id,
        response_id=response_id,
    )
    text_layers = [a for a in artifacts if a.layer in {"sentence", "word", "spacy_doc"}]
    return ResponseFeedbackOut(response_id=response_id, artifacts=text_layers)


@router.get("/responses/{response_id}/sentence-feedback", response_model=ResponseFeedbackOut)
async def sentence_feedback(
    response_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ResponseFeedbackOut:
    artifacts = await feedback_svc.get_response_artifacts(
        db,
        user_id=user.id,
        response_id=response_id,
        layer="sentence",
    )
    return ResponseFeedbackOut(response_id=response_id, artifacts=artifacts)


@router.get("/responses/{response_id}/phoneme-feedback", response_model=ResponseFeedbackOut)
async def phoneme_feedback(
    response_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ResponseFeedbackOut:
    artifacts = await feedback_svc.get_response_artifacts(
        db,
        user_id=user.id,
        response_id=response_id,
        layer="phoneme",
    )
    return ResponseFeedbackOut(response_id=response_id, artifacts=artifacts)


@router.get("/responses/{response_id}/word-upgrades", response_model=ResponseFeedbackOut)
async def word_upgrades(
    response_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ResponseFeedbackOut:
    artifacts = await feedback_svc.get_response_artifacts(
        db,
        user_id=user.id,
        response_id=response_id,
        layer="word",
    )
    return ResponseFeedbackOut(response_id=response_id, artifacts=artifacts)
