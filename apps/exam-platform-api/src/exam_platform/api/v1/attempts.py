"""Student-facing attempt endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from arq.connections import ArqRedis, RedisSettings, create_pool
from fastapi import APIRouter, Depends
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError
from languagepro_common.logging import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.adapters.data_engine.client import DataEngineClient
from exam_platform.api.deps import get_current_user, get_data_engine_client
from exam_platform.db import get_session
from exam_platform.models import Exam, ExamAttempt
from exam_platform.schemas import (
    AttemptListItem,
    AttemptOut,
    NextItemResponse,
    StartAttemptRequest,
    StartAttemptResponse,
    SubmitResponseIn,
    SubmitResponseOut,
)
from exam_platform.services import attempt as attempt_svc
from exam_platform.services import feedback as feedback_svc
from exam_platform.settings import settings

router = APIRouter(tags=["attempts"])
log = get_logger(__name__)

_arq_pool: ArqRedis | None = None


async def _get_arq() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool


@router.post("/attempts", response_model=StartAttemptResponse, status_code=201)
async def start(
    body: StartAttemptRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    de: Annotated[DataEngineClient, Depends(get_data_engine_client)],
) -> StartAttemptResponse:
    return await attempt_svc.start_attempt(
        db, de, user_id=user.id, blueprint_code=body.blueprint_code, locale=body.locale
    )


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
async def get_attempt(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> AttemptOut:
    row = (
        await db.execute(
            select(ExamAttempt).where(ExamAttempt.id == attempt_id, ExamAttempt.user_id == user.id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    return AttemptOut(
        id=row.id,
        state=row.state,
        blueprint_snapshot=row.blueprint_snapshot,
        current_section_index=row.current_section_index,
        current_item=attempt_svc.item_from_snapshot(row.current_item_snapshot),
        theta_estimates={k: float(v) for k, v in row.theta_estimates.items()},
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


@router.get("/attempts", response_model=list[AttemptListItem])
async def list_attempts(
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    limit: int = 50,
    offset: int = 0,
) -> list[AttemptListItem]:
    # Clamp limit to prevent abuse
    limit = min(limit, 100)
    offset = max(offset, 0)

    stmt = (
        select(ExamAttempt, Exam)
        .join(Exam, ExamAttempt.exam_id == Exam.id)
        .where(ExamAttempt.user_id == user.id)
        .order_by(ExamAttempt.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Batch-compute bands for completed attempts (avoid N+1 query)
    completed_ids = [att.id for att, _ in rows if att.state == "completed"]
    bands_map: dict[str, float | None] = {}
    if completed_ids:
        # Compute all bands in parallel-ish (still async but avoids N sequential queries)
        import asyncio
        band_results = await asyncio.gather(
            *[feedback_svc.compute_attempt_bands(db, aid) for aid in completed_ids]
        )
        for aid, bands in zip(completed_ids, band_results):
            bands_map[str(aid)] = bands.get("overall")

    items = []
    for att, exam in rows:
        items.append(
            AttemptListItem(
                id=att.id,
                exam_id=exam.id,
                exam_name_uz=exam.name_uz,
                exam_name_en=exam.name_en,
                blueprint_code=exam.blueprint_code,
                state=att.state,
                score=bands_map.get(str(att.id)),
                started_at=att.started_at,
                finished_at=att.finished_at,
            )
        )
    return items


@router.get("/attempts/{attempt_id}/next-item", response_model=NextItemResponse)
async def next_item(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    de: Annotated[DataEngineClient, Depends(get_data_engine_client)],
) -> NextItemResponse:
    return await attempt_svc.next_item_for_attempt(
        db,
        de,
        user_id=user.id,
        attempt_id=attempt_id,
    )


@router.post("/attempts/{attempt_id}/responses", response_model=SubmitResponseOut)
async def submit(
    attempt_id: UUID,
    body: SubmitResponseIn,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
    de: Annotated[DataEngineClient, Depends(get_data_engine_client)],
) -> SubmitResponseOut:
    out = await attempt_svc.submit_response(
        db,
        de,
        user_id=user.id,
        attempt_id=attempt_id,
        item_id=body.item_id,
        item_type=body.type,
        mcq_choice_id=body.mcq_choice_id,
        text_answer=body.text_answer,
        audio_s3_key=body.audio_s3_key,
        audio_base64=body.audio_base64,
        audio_format=body.audio_format,
        time_ms=body.time_ms,
    )
    if body.text_answer and body.type.startswith("writing_"):
        try:
            arq = await _get_arq()
            await arq.enqueue_job(
                "analyse_writing",
                str(out.response_id),
                str(user.id),
                _queue_name="arq:exam-platform",
            )
        except Exception as exc:
            log.warning(
                "analyse_writing_enqueue_failed",
                attempt_id=str(attempt_id),
                response_id=str(out.response_id),
                error=str(exc),
            )
    return out


@router.post("/attempts/{attempt_id}/abandon", status_code=204)
async def abandon(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> None:
    await attempt_svc.abandon_attempt(db, user_id=user.id, attempt_id=attempt_id)

