"""S2S/admin: /v1/exams/blueprints — list and fetch."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_s2s
from data_engine.db import get_session
from data_engine.models import ExamBlueprint
from data_engine.schemas.api import ExamBlueprintOut
from languagepro_common.errors import NotFoundError

router = APIRouter(tags=["blueprints"])


@router.get("/exams/blueprints", response_model=list[ExamBlueprintOut])
async def list_blueprints(
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("blueprints:read"))],
) -> list[ExamBlueprintOut]:
    rows = (await db.execute(select(ExamBlueprint).where(ExamBlueprint.is_active.is_(True)))).scalars().all()
    return [
        ExamBlueprintOut(
            id=r.id, code=r.code, name_uz=r.name_uz, name_en=r.name_en, sections=r.sections
        )
        for r in rows
    ]


@router.get("/exams/blueprints/{code}", response_model=ExamBlueprintOut)
async def get_blueprint(
    code: str,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_s2s("blueprints:read"))],
) -> ExamBlueprintOut:
    row = (
        await db.execute(select(ExamBlueprint).where(ExamBlueprint.code == code))
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Blueprint {code} not found")
    return ExamBlueprintOut(
        id=row.id, code=row.code, name_uz=row.name_uz, name_en=row.name_en, sections=row.sections
    )
