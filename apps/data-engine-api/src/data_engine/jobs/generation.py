"""Batch generation arq job.

Run: GET /generation/jobs/{id} to watch totals update.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update

from data_engine.db import SessionLocal
from data_engine.models import GenerationJob
from data_engine.services.generator import generate_one
from data_engine.services.router_factory import get_router
from languagepro_common.logging import get_logger

log = get_logger(__name__)


async def generate_batch(ctx, job_id: UUID) -> dict:
    router = get_router()
    async with SessionLocal() as db:
        job = (
            await db.execute(select(GenerationJob).where(GenerationJob.id == job_id))
        ).scalar_one()
        params = job.params
        await db.execute(
            update(GenerationJob)
            .where(GenerationJob.id == job_id)
            .values(status="running", started_at=datetime.now(UTC))
        )
        await db.commit()

    totals = {"approved": 0, "in_review": 0, "rejected_dup": 0, "rejected_jury": 0, "draft": 0}
    bank_id = UUID(params["bank_id"])
    skill = params["skill"]
    cefr = params["cefr_level"]
    topic = params["topic"]
    count = int(params["count"])

    for i in range(count):
        try:
            async with SessionLocal() as db:
                outcome = await generate_one(
                    db, router, bank_id=bank_id, skill=skill, cefr_level=cefr, topic=topic
                )
            key = outcome.status if outcome.status in totals else "draft"
            totals[key] = totals.get(key, 0) + 1
            log.info("generation_outcome", i=i, status=outcome.status, qid=str(outcome.question_id))
        except Exception as e:
            log.exception("generation_failed", i=i, error=str(e))
            totals.setdefault("error", 0)
            totals["error"] += 1

        # Periodic progress flush
        if (i + 1) % 5 == 0 or i == count - 1:
            async with SessionLocal() as db:
                await db.execute(
                    update(GenerationJob)
                    .where(GenerationJob.id == job_id)
                    .values(totals=totals)
                )
                await db.commit()

    async with SessionLocal() as db:
        await db.execute(
            update(GenerationJob)
            .where(GenerationJob.id == job_id)
            .values(status="done", finished_at=datetime.now(UTC), totals=totals)
        )
        await db.commit()
    return totals
