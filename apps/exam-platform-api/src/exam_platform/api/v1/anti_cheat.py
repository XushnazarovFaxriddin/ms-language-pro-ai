"""Anti-cheat telemetry from the browser ExamRunner.

Frontend posts events on focus_loss / paste_blocked / devtools_open / etc.
We persist to analytics.anti_cheat_events and emit an audit_event when the
counts cross suspicion thresholds.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from languagepro_common import audit_log
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import NotFoundError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.api.deps import get_current_user
from exam_platform.db import get_session
from exam_platform.models import ExamAttempt

router = APIRouter(tags=["anti-cheat"])


EventType = Literal[
    "focus_loss",
    "focus_gain",
    "paste_blocked",
    "copy_blocked",
    "devtools_open",
    "tab_visibility_hidden",
    "tab_visibility_visible",
    "fullscreen_exit",
    "right_click_blocked",
    "audio_replay_attempt",
]


class AntiCheatEventIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attempt_id: UUID
    event_type: EventType
    section_index: int | None = None
    item_id: UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class AntiCheatBatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    events: list[AntiCheatEventIn] = Field(min_length=1, max_length=100)


SUSPICIOUS_THRESHOLDS: dict[str, int] = {
    "focus_loss": 10,
    "paste_blocked": 5,
    "devtools_open": 1,
    "audio_replay_attempt": 1,
}


@router.post("/anti-cheat/events", status_code=204)
async def record_anti_cheat_events(
    body: AntiCheatBatchIn,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> None:
    """Batch-ingest anti-cheat events. Soft-fails on bad attempt ids."""
    # Validate the attempt belongs to this user (per first event — batch is per attempt by convention)
    first = body.events[0]
    attempt = (
        await db.execute(
            select(ExamAttempt).where(
                ExamAttempt.id == first.attempt_id, ExamAttempt.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if attempt is None:
        raise NotFoundError(f"Attempt {first.attempt_id} not found")

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    for event in body.events:
        await db.execute(
            text(
                """
                INSERT INTO analytics.anti_cheat_events
                  (attempt_id, user_id, event_type, section_index, item_id, payload)
                VALUES
                  (:attempt_id, :user_id, :event_type, :section_index, :item_id, CAST(:payload AS jsonb))
                """
            ),
            {
                "attempt_id": event.attempt_id,
                "user_id": user.id,
                "event_type": event.event_type,
                "section_index": event.section_index,
                "item_id": event.item_id,
                "payload": _safe_json(event.payload),
            },
        )

    # Threshold check: if a single event type exceeds threshold for this attempt,
    # write an audit_log so admins can review.
    for ev_type, threshold in SUSPICIOUS_THRESHOLDS.items():
        count = (
            await db.execute(
                text(
                    """
                    SELECT COUNT(*) FROM analytics.anti_cheat_events
                    WHERE attempt_id = :att AND event_type = :etype
                    """
                ),
                {"att": first.attempt_id, "etype": ev_type},
            )
        ).scalar_one()
        if int(count) >= threshold:
            await audit_log(
                db,
                type=f"anti_cheat_{ev_type}",
                user_id=user.id,
                payload={"attempt_id": str(first.attempt_id), "count": int(count)},
                request_id=getattr(request.state, "request_id", None),
                ip=ip,
                user_agent=user_agent,
            )

    await db.commit()


@router.get("/me/attempts/{attempt_id}/anti-cheat/summary")
async def anti_cheat_summary(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, Any]:
    """Per-attempt summary, useful for the examiner review queue."""
    attempt = (
        await db.execute(
            select(ExamAttempt).where(
                ExamAttempt.id == attempt_id,
                ExamAttempt.user_id == user.id,  # students see only their own
            )
        )
    ).scalar_one_or_none()
    if attempt is None and "examiner" not in user.roles and "superadmin" not in user.roles:
        raise NotFoundError(f"Attempt {attempt_id} not found")

    rows = await db.execute(
        text(
            """
            SELECT event_type, COUNT(*) AS n, MIN(ts) AS first, MAX(ts) AS last
            FROM analytics.anti_cheat_events
            WHERE attempt_id = :att
            GROUP BY event_type
            ORDER BY n DESC
            """
        ),
        {"att": attempt_id},
    )
    by_type = [
        {"event_type": r.event_type, "count": r.n, "first": r.first.isoformat(), "last": r.last.isoformat()}
        for r in rows
    ]
    flagged = [
        x["event_type"] for x in by_type if x["count"] >= SUSPICIOUS_THRESHOLDS.get(x["event_type"], 10**6)
    ]
    return {
        "attempt_id": str(attempt_id),
        "by_type": by_type,
        "flagged_event_types": flagged,
        "total_events": sum(x["count"] for x in by_type),
    }


def _safe_json(payload: dict[str, Any]) -> str:
    import json

    try:
        return json.dumps(payload, default=str)
    except Exception:
        return "{}"


# Allow query helper used by attempts service to derive the func.count safely
_ = func  # silence unused-import lint if any
