"""AI conversation partner endpoints."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from languagepro_llm import LLMRouter
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.api.deps import get_current_user
from exam_platform.db import get_session
from exam_platform.schemas import (
    ConversationSessionCreate,
    ConversationSessionOut,
    ConversationTurnCreate,
    ConversationTurnOut,
)
from exam_platform.services import conversation as conversation_svc
from exam_platform.services.router_factory import get_router

router = APIRouter(tags=["conversation"])


@router.get("/practice/conversation/sessions/active")
async def active_session(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, Any] | None:
    """Most recent active session + its turns. Returns null if none."""
    result = await conversation_svc.get_active_session(db, user_id=user.id)
    if result is None:
        return None
    session, turns = result
    return {
        "session": session.model_dump(mode="json"),
        "turns": [t.model_dump(mode="json") for t in turns],
    }


@router.get("/practice/conversation/sessions/{session_id}")
async def get_session_with_turns(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, Any]:
    session, turns = await conversation_svc.get_session_with_turns(
        db, user_id=user.id, session_id=session_id
    )
    return {
        "session": session.model_dump(mode="json"),
        "turns": [t.model_dump(mode="json") for t in turns],
    }


@router.post(
    "/practice/conversation/sessions", response_model=ConversationSessionOut, status_code=201
)
async def start_session(
    body: ConversationSessionCreate,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ConversationSessionOut:
    return await conversation_svc.start_session(db, user_id=user.id, body=body)


@router.post(
    "/practice/conversation/sessions/{session_id}/turns",
    response_model=ConversationTurnOut,
    status_code=201,
)
async def add_turn(
    session_id: UUID,
    body: ConversationTurnCreate,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    router_client: Annotated[LLMRouter, Depends(get_router)],
) -> ConversationTurnOut:
    return await conversation_svc.add_turn(
        db,
        router_client,
        user_id=user.id,
        session_id=session_id,
        body=body,
    )


@router.post(
    "/practice/conversation/sessions/{session_id}/end", response_model=ConversationSessionOut
)
async def end_session(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ConversationSessionOut:
    return await conversation_svc.end_session(db, user_id=user.id, session_id=session_id)
