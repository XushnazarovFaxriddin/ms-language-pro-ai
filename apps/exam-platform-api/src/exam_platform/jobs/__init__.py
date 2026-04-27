"""arq worker for exam-platform: scoring, certificate render, etc."""

from datetime import date
from typing import Any, ClassVar, Literal, cast
from uuid import UUID

from arq.connections import RedisSettings

from exam_platform.db import SessionLocal
from exam_platform.schemas import AnalyseWritingRequest, RoadmapRegenerateRequest
from exam_platform.services.feedback import analyse_writing_response
from exam_platform.services.roadmap import regenerate_roadmap
from exam_platform.services.router_factory import get_router
from exam_platform.settings import settings


async def healthz_task(ctx: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True}


async def analyse_writing(
    ctx: dict[str, Any],
    response_id: str,
    user_id: str,
) -> dict[str, Any]:
    async with SessionLocal() as db:
        artifacts = await analyse_writing_response(
            db,
            get_router(),
            user_id=UUID(user_id),
            response_id=UUID(response_id),
            body=AnalyseWritingRequest(),
        )
    return {"ok": True, "artifacts": len(artifacts)}


async def regenerate_user_roadmap(
    ctx: dict[str, Any],
    user_id: str,
    target_date: str,
    target_band: float = 7.0,
    weekly_hours: int = 5,
    focus_skill: str = "writing",
    weeks_until_target: int = 8,
) -> dict[str, Any]:
    skill = cast(Literal["listening", "reading", "writing", "speaking"], focus_skill)
    async with SessionLocal() as db:
        roadmap = await regenerate_roadmap(
            db,
            get_router(),
            user_id=UUID(user_id),
            body=RoadmapRegenerateRequest(
                target_band=target_band,
                target_date=date.fromisoformat(target_date),
                weekly_hours=weekly_hours,
                focus_skill=skill,
                weeks_until_target=weeks_until_target,
            ),
        )
    return {"ok": True, "roadmap_id": str(roadmap.id)}


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions: ClassVar[list[Any]] = [healthz_task, analyse_writing, regenerate_user_roadmap]
    job_timeout = 300
    keep_result = 3600
    max_jobs = 10
    queue_name = "arq:exam-platform"
