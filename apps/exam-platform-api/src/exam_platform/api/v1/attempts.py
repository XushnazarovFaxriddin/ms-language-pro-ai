"""Student-facing attempt endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.adapters.data_engine.client import DataEngineClient
from exam_platform.api.deps import get_current_user, get_data_engine_client
from exam_platform.db import get_session
from exam_platform.models import ExamAttempt
from exam_platform.schemas import (
    AttemptOut,
    StartAttemptRequest,
    StartAttemptResponse,
    SubmitResponseIn,
    SubmitResponseOut,
)
from exam_platform.services import attempt as attempt_svc
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError

router = APIRouter(tags=["attempts"])


@router.post("/attempts", response_model=StartAttemptResponse, status_code=201)
async def start(
    body: StartAttemptRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    de: Annotated[DataEngineClient, Depends(get_data_engine_client)],
) -> StartAttemptResponse:
    return await attempt_svc.start_attempt(
        db, de, user_id=user.id, blueprint_code=body.blueprint_code, locale=body.locale
    )


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
async def get_attempt(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> AttemptOut:
    row = (
        await db.execute(
            select(ExamAttempt).where(
                ExamAttempt.id == attempt_id, ExamAttempt.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    return AttemptOut(
        id=row.id,
        state=row.state,
        blueprint_snapshot=row.blueprint_snapshot,
        theta_estimates={k: float(v) for k, v in row.theta_estimates.items()},
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


@router.post("/attempts/{attempt_id}/responses", response_model=SubmitResponseOut)
async def submit(
    attempt_id: UUID,
    body: SubmitResponseIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    de: Annotated[DataEngineClient, Depends(get_data_engine_client)],
) -> SubmitResponseOut:
    return await attempt_svc.submit_response(
        db, de,
        user_id=user.id,
        attempt_id=attempt_id,
        item_id=body.item_id,
        item_type=body.type,
        mcq_choice_id=body.mcq_choice_id,
        text_answer=body.text_answer,
        audio_s3_key=body.audio_s3_key,
        time_ms=body.time_ms,
    )
