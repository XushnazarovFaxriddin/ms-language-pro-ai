"""arq worker settings — registers tasks for the data-engine queue.

Includes:
- generate_batch: question generation batch (one-shot)
- nightly_recalibration: IRT 2PL refit, daily 02:00 UTC
- weekly_dif_analysis: Mantel-Haenszel DIF analysis, Sunday 03:00 UTC
"""

from __future__ import annotations

from typing import Any, ClassVar

from arq import cron
from arq.connections import RedisSettings

from data_engine.jobs.calibration import nightly_recalibration, weekly_dif_analysis
from data_engine.jobs.generation import generate_batch
from data_engine.settings import settings


async def healthz_task(ctx: dict[str, Any]) -> dict[str, bool]:
    return {"ok": True}


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions: ClassVar[list[Any]] = [
        healthz_task,
        generate_batch,
        nightly_recalibration,
        weekly_dif_analysis,
    ]
    cron_jobs: ClassVar[list[Any]] = [
        # 02:00 UTC daily — fewest active users
        cron(nightly_recalibration, hour={2}, minute={0}, run_at_startup=False),
        # Sunday 03:00 UTC weekly
        cron(weekly_dif_analysis, weekday="sun", hour={3}, minute={0}, run_at_startup=False),
    ]
    job_timeout = 600
    keep_result = 86_400
    max_jobs = 10
    queue_name = "arq:data-engine"
