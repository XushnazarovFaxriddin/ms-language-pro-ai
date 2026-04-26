"""S2S endpoints: /items/next, /items/{id}, /items/{id}/key, /items/{id}/response."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles, require_s2s
from languagepro_common.auth import CurrentUser
from data_engine.db import get_session
from data_engine.schemas.api import (
    AnswerKeyOut,
    ItemOut,
    ItemPayload,
    NextItemOut,
    ResponseEventIn,
)
from data_engine.services.items import get_answer_key, select_next_item
from languagepro_common.errors import NotFoundError

router = APIRouter(tags=["items"])


@router.get("/items/next", response_model=NextItemOut)
async def next_item(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("items:next"))],
    skill: str = Query(...),
    theta: float = Query(0.0),
    exclude_ids: list[UUID] = Query(default_factory=list, alias="exclude_ids[]"),
    attempt_id: UUID | None = Query(default=None),
) -> NextItemOut:
    item = await select_next_item(db, theta=theta, skill=skill, exclude_ids=exclude_ids)
    if item is None:
        raise NotFoundError(f"No approved items available for skill={skill}")
    return NextItemOut(
        item=ItemOut(
            id=item.id,
            type=item.type,
            skill=item.skill_code,
            cefr_level=item.cefr_code,
            payload=ItemPayload.model_validate(item.payload),
            estimated_seconds=item.estimated_seconds,
        ),
        selection_metadata={"a": item.a, "b": item.b, "c": item.c, "theta": theta},
    )


@router.get("/items/{item_id}/key", response_model=AnswerKeyOut)
async def item_key(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("items:key"))],
) -> AnswerKeyOut:
    key = await get_answer_key(db, item_id)
    if key is None:
        raise NotFoundError(f"Item {item_id} not found")
    return AnswerKeyOut(
        correct_option_id=key.get("correct_option_id"),
        rationale=str(key.get("distractor_rationale", "")),
        raw=key,
    )


@router.post("/items/{item_id}/response", status_code=204)
async def record_response(
    item_id: UUID,
    body: ResponseEventIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("responses:write"))],
) -> None:
    """Empirical response captured for IRT recalibration.

    Phase 1: write to analytics.item_response_data (added in next migration).
    Stub for now — increments n_responses.
    """
    from sqlalchemy import update

    from data_engine.models import Question

    await db.execute(
        update(Question)
        .where(Question.id == item_id)
        .values(n_responses=Question.n_responses + 1)
    )
    await db.commit()


# -------- Admin endpoints --------

@router.get("/items", response_model=list[ItemOut])
async def list_items(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
    status: str | None = Query(None),
    skill: str | None = Query(None),
    cefr: str | None = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
) -> list[ItemOut]:
    from sqlalchemy import select
    from data_engine.models import Question, Skill, CefrLevel

    stmt = (
        select(Question, Skill.code.label("skill_code"), CefrLevel.code.label("cefr_code"))
        .join(Skill, Question.skill_id == Skill.id)
        .join(CefrLevel, Question.cefr_level_id == CefrLevel.id)
    )
    if status:
        stmt = stmt.where(Question.status == status)
    if skill:
        stmt = stmt.where(Skill.code == skill)
    if cefr:
        stmt = stmt.where(CefrLevel.code == cefr)
    
    stmt = stmt.order_by(Question.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    
    items = []
    for row in result:
        q, s_code, c_code = row
        items.append(ItemOut(
            id=q.id,
            type=q.type,
            skill=s_code,
            cefr_level=c_code,
            payload=ItemPayload.model_validate(q.payload),
            estimated_seconds=q.estimated_seconds,
        ))
    return items
