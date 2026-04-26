"""pgvector-based duplicate detection over question_embeddings."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DUPLICATE_SIMILARITY_THRESHOLD = 0.92  # cosine_distance < 0.08


async def find_duplicate(
    db: AsyncSession, embedding: list[float], skill_id: int
) -> UUID | None:
    """Return the question_id of a near-duplicate within the same skill, if any."""
    sql = text("""
        SELECT q.id
        FROM data_engine.questions q
        JOIN data_engine.question_embeddings e ON e.question_id = q.id
        WHERE q.skill_id = :skill_id
          AND q.status IN ('approved', 'published', 'in_review')
          AND (1 - (e.embedding <=> CAST(:emb AS vector))) > :threshold
        ORDER BY e.embedding <=> CAST(:emb AS vector)
        LIMIT 1
    """)
    row = (
        await db.execute(
            sql,
            {
                "skill_id": skill_id,
                "emb": str(embedding),  # pgvector accepts text repr
                "threshold": DUPLICATE_SIMILARITY_THRESHOLD,
            },
        )
    ).fetchone()
    return row[0] if row else None
