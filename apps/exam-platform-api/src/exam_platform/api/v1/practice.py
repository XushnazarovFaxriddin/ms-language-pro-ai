"""Practice mode endpoints for SRS cards, drills, and mastery."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from languagepro_common.auth import CurrentUser
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.api.deps import get_current_user
from exam_platform.db import get_session
from exam_platform.schemas import (
    DrillAttemptComplete,
    DrillAttemptCreate,
    DrillAttemptOut,
    DrillItemSubmit,
    MasteryOut,
    SRSCardOut,
    SRSGradeRequest,
)
from exam_platform.services import practice as practice_svc

router = APIRouter(tags=["practice"])


@router.get("/me/srs/queue", response_model=list[SRSCardOut])
async def srs_queue(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: int = Query(default=20, ge=1, le=100),
) -> list[SRSCardOut]:
    return await practice_svc.get_srs_queue(db, user_id=user.id, limit=limit)


@router.post("/me/srs/grade", response_model=SRSCardOut)
async def grade_srs_card(
    body: SRSGradeRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> SRSCardOut:
    return await practice_svc.grade_srs_card(db, user_id=user.id, body=body)


@router.get("/me/mastery", response_model=list[MasteryOut])
async def mastery(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: int = Query(default=100, ge=1, le=500),
) -> list[MasteryOut]:
    return await practice_svc.get_mastery(db, user_id=user.id, limit=limit)


@router.post(
    "/practice/drills/{drill_id}/attempts",
    response_model=DrillAttemptOut,
    status_code=201,
)
async def start_drill_attempt(
    drill_id: UUID,
    body: DrillAttemptCreate,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DrillAttemptOut:
    return await practice_svc.start_drill_attempt(
        db,
        user_id=user.id,
        drill_id=drill_id,
        body=body,
    )


@router.post(
    "/practice/drills/{drill_id}/attempts/{attempt_id}/items",
    response_model=DrillAttemptOut,
)
async def submit_drill_item(
    drill_id: UUID,
    attempt_id: UUID,
    body: DrillItemSubmit,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DrillAttemptOut:
    return await practice_svc.submit_drill_item(
        db,
        user_id=user.id,
        drill_id=drill_id,
        attempt_id=attempt_id,
        body=body,
    )


@router.post(
    "/practice/drills/{drill_id}/attempts/{attempt_id}/complete",
    response_model=DrillAttemptOut,
)
async def complete_drill_attempt(
    drill_id: UUID,
    attempt_id: UUID,
    body: DrillAttemptComplete,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DrillAttemptOut:
    return await practice_svc.complete_drill_attempt(
        db,
        user_id=user.id,
        drill_id=drill_id,
        attempt_id=attempt_id,
        body=body,
    )
