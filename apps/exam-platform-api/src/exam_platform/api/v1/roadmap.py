"""Personal roadmap endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from languagepro_llm import LLMRouter
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.api.deps import get_current_user
from exam_platform.db import get_session
from exam_platform.schemas import RoadmapOut, RoadmapRegenerateRequest, TodayRoadmapOut
from exam_platform.services import roadmap as roadmap_svc
from exam_platform.services.router_factory import get_router

router = APIRouter(tags=["roadmap"])


@router.get("/me/roadmap", response_model=RoadmapOut)
async def active_roadmap(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> RoadmapOut:
    return await roadmap_svc.get_active_roadmap(db, user_id=user.id)


@router.post("/me/roadmap/regenerate", response_model=RoadmapOut)
async def regenerate_roadmap(
    body: RoadmapRegenerateRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    router_client: Annotated[LLMRouter, Depends(get_router)],
) -> RoadmapOut:
    return await roadmap_svc.regenerate_roadmap(
        db,
        router_client,
        user_id=user.id,
        body=body,
    )


@router.get("/me/roadmap/today", response_model=TodayRoadmapOut)
async def today_roadmap(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> TodayRoadmapOut:
    return await roadmap_svc.get_today_roadmap(db, user_id=user.id)
