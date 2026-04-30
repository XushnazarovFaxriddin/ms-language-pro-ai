"""Nightly IRT recalibration + weekly DIF analysis cron jobs.

Run by arq worker. Wired into WorkerSettings.cron_jobs in data_engine.jobs.__init__.
"""

from __future__ import annotations

from typing import Any

from data_engine.db import SessionLocal
from data_engine.services.calibration import run_dif_analysis, run_recalibration
from languagepro_common.logging import get_logger

log = get_logger(__name__)


async def nightly_recalibration(ctx: dict[str, Any]) -> dict[str, Any]:
    """Refit 2PL parameters for items with ≥30 new responses since last run."""
    async with SessionLocal() as db:
        result = await run_recalibration(db, min_responses=30)
        await db.commit()
    log.info("nightly_recalibration_done", **{k: result[k] for k in ("items_fit", "items_skipped", "run_id") if k in result})
    return result


async def weekly_dif_analysis(ctx: dict[str, Any]) -> dict[str, Any]:
    """Mantel-Haenszel DIF: compare item performance across L1 groups (uz vs other)."""
    async with SessionLocal() as db:
        result = await run_dif_analysis(db, group_a="uz", group_b="other")
        await db.commit()
    log.info("weekly_dif_done", findings=result.get("findings", 0), flagged=result.get("flagged", 0))
    return result
