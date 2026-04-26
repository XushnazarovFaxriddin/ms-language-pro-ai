"""arq worker settings — registers tasks for the data-engine queue."""

from arq.connections import RedisSettings

from data_engine.settings import settings


async def healthz_task(ctx) -> dict:
    return {"ok": True}


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions = [healthz_task]
    job_timeout = 300
    keep_result = 3600
    max_jobs = 10
    queue_name = "arq:data-engine"
