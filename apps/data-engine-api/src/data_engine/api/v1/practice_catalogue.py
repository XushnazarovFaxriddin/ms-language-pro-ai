"""Admin CRUD endpoints for drills, error taxonomy, and conversation topics."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles
from data_engine.db import get_session
from data_engine.models import ConversationTopic, Drill, ErrorTaxonomy
from data_engine.schemas.api import (
    ConversationTopicIn,
    ConversationTopicOut,
    ConversationTopicPatch,
    DrillIn,
    DrillOut,
    DrillPatch,
    ErrorTaxonomyIn,
    ErrorTaxonomyOut,
    ErrorTaxonomyPatch,
)

router = APIRouter(tags=["practice-catalogue"])

AdminUser = Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))]


@router.get("/error-taxonomy", response_model=list[ErrorTaxonomyOut])
async def list_error_taxonomy(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
    skill: str | None = Query(default=None),
    layer: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[ErrorTaxonomyOut]:
    stmt = select(ErrorTaxonomy)
    if skill:
        stmt = stmt.where(ErrorTaxonomy.skill == skill)
    if layer:
        stmt = stmt.where(ErrorTaxonomy.layer == layer)
    rows = (
        await db.execute(stmt.order_by(ErrorTaxonomy.code.asc()).limit(limit).offset(offset))
    ).scalars()
    return [_taxonomy_out(row) for row in rows]


@router.post("/error-taxonomy", response_model=ErrorTaxonomyOut, status_code=201)
async def create_error_taxonomy(
    body: ErrorTaxonomyIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
) -> ErrorTaxonomyOut:
    await db.execute(insert(ErrorTaxonomy).values(**body.model_dump(mode="json")))
    await db.commit()
    row = await _get_taxonomy(db, body.code)
    return _taxonomy_out(row)


@router.patch("/error-taxonomy/{code}", response_model=ErrorTaxonomyOut)
async def patch_error_taxonomy(
    code: str,
    body: ErrorTaxonomyPatch,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
) -> ErrorTaxonomyOut:
    values = body.model_dump(exclude_unset=True, mode="json")
    if values:
        await db.execute(update(ErrorTaxonomy).where(ErrorTaxonomy.code == code).values(**values))
        await db.commit()
    row = await _get_taxonomy(db, code)
    return _taxonomy_out(row)


@router.get("/drills", response_model=list[DrillOut])
async def list_drills(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
    skill: str | None = Query(default=None),
    cefr_level: str | None = Query(default=None),
    target_code: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[DrillOut]:
    stmt = select(Drill)
    if skill:
        stmt = stmt.where(Drill.skill == skill)
    if cefr_level:
        stmt = stmt.where(Drill.cefr_level == cefr_level)
    if target_code:
        stmt = stmt.where(Drill.target_codes.contains([target_code]))
    rows = (
        await db.execute(stmt.order_by(Drill.created_at.desc()).limit(limit).offset(offset))
    ).scalars()
    return [_drill_out(row) for row in rows]


@router.post("/drills", response_model=DrillOut, status_code=201)
async def create_drill(
    body: DrillIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
) -> DrillOut:
    drill_id = (
        await db.execute(insert(Drill).values(**body.model_dump(mode="json")).returning(Drill.id))
    ).scalar_one()
    await db.commit()
    row = await _get_drill(db, drill_id)
    return _drill_out(row)


@router.patch("/drills/{drill_id}", response_model=DrillOut)
async def patch_drill(
    drill_id: UUID,
    body: DrillPatch,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
) -> DrillOut:
    values = body.model_dump(exclude_unset=True, mode="json")
    if values:
        await db.execute(update(Drill).where(Drill.id == drill_id).values(**values))
        await db.commit()
    row = await _get_drill(db, drill_id)
    return _drill_out(row)


@router.get("/conversation-topics", response_model=list[ConversationTopicOut])
async def list_conversation_topics(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
    cefr_level: str | None = Query(default=None),
    kind: str | None = Query(default=None),
    active_only: bool = Query(default=True),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[ConversationTopicOut]:
    stmt = select(ConversationTopic)
    if cefr_level:
        stmt = stmt.where(ConversationTopic.cefr_level == cefr_level)
    if kind:
        stmt = stmt.where(ConversationTopic.kind == kind)
    if active_only:
        stmt = stmt.where(ConversationTopic.is_active.is_(True))
    rows = (
        await db.execute(
            stmt.order_by(ConversationTopic.created_at.desc()).limit(limit).offset(offset)
        )
    ).scalars()
    return [_topic_out(row) for row in rows]


@router.post("/conversation-topics", response_model=ConversationTopicOut, status_code=201)
async def create_conversation_topic(
    body: ConversationTopicIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
) -> ConversationTopicOut:
    topic_id = (
        await db.execute(
            insert(ConversationTopic)
            .values(**body.model_dump(mode="json"))
            .returning(ConversationTopic.id)
        )
    ).scalar_one()
    await db.commit()
    row = await _get_topic(db, topic_id)
    return _topic_out(row)


@router.patch("/conversation-topics/{topic_id}", response_model=ConversationTopicOut)
async def patch_conversation_topic(
    topic_id: UUID,
    body: ConversationTopicPatch,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: AdminUser,
) -> ConversationTopicOut:
    values = body.model_dump(exclude_unset=True, mode="json")
    if values:
        await db.execute(
            update(ConversationTopic).where(ConversationTopic.id == topic_id).values(**values)
        )
        await db.commit()
    row = await _get_topic(db, topic_id)
    return _topic_out(row)


async def _get_taxonomy(db: AsyncSession, code: str) -> ErrorTaxonomy:
    row = (
        await db.execute(select(ErrorTaxonomy).where(ErrorTaxonomy.code == code))
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Error taxonomy code {code} not found")
    return row


async def _get_drill(db: AsyncSession, drill_id: UUID) -> Drill:
    row = (await db.execute(select(Drill).where(Drill.id == drill_id))).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Drill {drill_id} not found")
    return row


async def _get_topic(db: AsyncSession, topic_id: UUID) -> ConversationTopic:
    row = (
        await db.execute(select(ConversationTopic).where(ConversationTopic.id == topic_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Conversation topic {topic_id} not found")
    return row


def _taxonomy_out(row: ErrorTaxonomy) -> ErrorTaxonomyOut:
    return ErrorTaxonomyOut(
        code=row.code,
        skill=row.skill,
        layer=row.layer,
        severity=row.severity,
        explanation_uz=row.explanation_uz,
        explanation_en=row.explanation_en,
        example_correct=row.example_correct,
        example_wrong=row.example_wrong,
        recommended_drill_ids=row.recommended_drill_ids,
    )


def _drill_out(row: Drill) -> DrillOut:
    return DrillOut(
        id=row.id,
        code=row.code,
        skill=row.skill,
        target_codes=row.target_codes,
        cefr_level=row.cefr_level,
        duration_minutes=row.duration_minutes,
        payload=row.payload,
        variant_count=row.variant_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _topic_out(row: ConversationTopic) -> ConversationTopicOut:
    return ConversationTopicOut(
        id=row.id,
        code=row.code,
        title_uz=row.title_uz,
        title_en=row.title_en,
        prompt=row.prompt,
        cefr_level=row.cefr_level,
        kind=row.kind,
        is_active=row.is_active,
        created_at=row.created_at,
    )
