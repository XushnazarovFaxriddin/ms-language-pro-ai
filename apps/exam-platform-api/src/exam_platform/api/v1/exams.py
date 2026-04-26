"""Public exam list."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.db import get_session
from exam_platform.models import Exam

router = APIRouter(tags=["exams"])


@router.get("/exams")
async def list_exams(
    db: Annotated[AsyncSession, Depends(get_session)],
) -> list[dict]:
    rows = (await db.execute(select(Exam).where(Exam.is_active.is_(True)))).scalars().all()
    return [
        {
            "id": str(r.id),
            "blueprint_code": r.blueprint_code,
            "name_uz": r.name_uz,
            "name_en": r.name_en,
        }
        for r in rows
    ]
