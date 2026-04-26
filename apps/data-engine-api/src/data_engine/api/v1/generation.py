"""Admin endpoints for batch generation."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from arq.connections import ArqRedis, RedisSettings, create_pool
from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from data_engine.api.deps import require_roles
from data_engine.db import get_session
from data_engine.models import GenerationJob, QuestionBank
from data_engine.schemas.api import GenerationJobCreate, GenerationJobOut
from data_engine.settings import settings

router = APIRouter(tags=["generation"])

_arq_pool: ArqRedis | None = None


async def _get_arq() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool


@router.post("/generation/jobs", response_model=GenerationJobOut, status_code=201)
async def create_generation_job(
    body: GenerationJobCreate,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> GenerationJobOut:
    bank_id = body.bank_id
    if bank_id is None:
        # default bank
        bank_id = (await db.execute(select(QuestionBank.id).limit(1))).scalar_one_or_none()
        if bank_id is None:
            raise NotFoundError("No question bank exists")

    job_id = (
        await db.execute(
            insert(GenerationJob)
            .values(
                owner_user_id=user.id,
                params={**body.model_dump(), "bank_id": str(bank_id)},
                status="queued",
            )
            .returning(GenerationJob.id)
        )
    ).scalar_one()
    await db.commit()

    arq = await _get_arq()
    await arq.enqueue_job("generate_batch", job_id, _queue_name="arq:data-engine")

    job = (await db.execute(select(GenerationJob).where(GenerationJob.id == job_id))).scalar_one()
    return _job_out(job)


@router.get("/generation/jobs/{job_id}", response_model=GenerationJobOut)
async def get_job(
    job_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[CurrentUser, Depends(require_roles("content_admin", "superadmin"))],
) -> GenerationJobOut:
    job = (
        await db.execute(select(GenerationJob).where(GenerationJob.id == job_id))
    ).scalar_one_or_none()
    if job is None:
        raise NotFoundError(f"Job {job_id} not found")
    return _job_out(job)


def _job_out(j: GenerationJob) -> GenerationJobOut:
    return GenerationJobOut(
        id=j.id,
        status=j.status,
        params=j.params,
        totals=j.totals,
        started_at=j.started_at,
        finished_at=j.finished_at,
        created_at=j.created_at,
    )
