"""Item selection (S2S `/items/next`)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from languagepro_irt import fisher_information
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.models import CefrLevel, Question, Skill


@dataclass(frozen=True)
class ItemRow:
    id: UUID
    type: str
    skill_code: str
    cefr_code: str
    payload: dict
    estimated_seconds: int
    a: float
    b: float
    c: float


async def select_next_item(
    db: AsyncSession,
    *,
    theta: float,
    skill: str,
    exclude_ids: list[UUID] | None = None,
) -> ItemRow | None:
    """Pick item with maximum Fisher information at theta among approved items."""
    exclude_ids = exclude_ids or []
    q = (
        select(
            Question.id,
            Question.type,
            Skill.code,
            CefrLevel.code,
            Question.payload,
            Question.estimated_seconds,
            Question.discrimination_a,
            Question.difficulty_b,
            Question.guessing_c,
        )
        .join(Skill, Skill.id == Question.skill_id)
        .join(CefrLevel, CefrLevel.id == Question.cefr_level_id)
        .where(
            Question.status.in_(("approved", "published")),
            Skill.code == skill,
        )
    )
    if exclude_ids:
        q = q.where(Question.id.notin_(exclude_ids))
    rows = (await db.execute(q)).all()
    if not rows:
        return None

    best: ItemRow | None = None
    best_info = -1.0
    for row in rows:
        a, b, c = float(row[6]), float(row[7]), float(row[8])
        info = fisher_information(theta, a, b, c)
        if info > best_info:
            best_info = info
            best = ItemRow(
                id=row[0],
                type=row[1],
                skill_code=row[2],
                cefr_code=row[3],
                payload=row[4],
                estimated_seconds=row[5],
                a=a, b=b, c=c,
            )
    return best


async def get_answer_key(db: AsyncSession, item_id: UUID) -> dict | None:
    row = (
        await db.execute(select(Question.answer_key).where(Question.id == item_id))
    ).scalar_one_or_none()
    return row
