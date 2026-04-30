"""Audit log writer + analytics.audit_events schema helper.

Use from any service:
    from languagepro_common.audit import audit_log
    await audit_log(db, user_id=user.id, type="login_success", payload={"ip": ip})

The table lives in `analytics.audit_events` and is created by a shared migration
(see apps/data-engine-api/alembic/versions/*_audit_events.py).

Indexed on `(ts)`, `(user_id, ts)`, `(type, ts)` — fast for forensics.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from languagepro_common.logging import get_logger

log = get_logger(__name__)


SAFE_TYPES = frozenset(
    {
        # Auth
        "signup",
        "login_success",
        "login_failed",
        "logout",
        "refresh_success",
        "refresh_replay_detected",
        "password_changed",
        "role_granted",
        "role_revoked",
        "oauth_linked",
        "account_deleted",
        # Exam
        "attempt_started",
        "attempt_completed",
        "attempt_abandoned",
        "section_completed",
        "anti_cheat_focus_loss",
        "anti_cheat_paste_blocked",
        "anti_cheat_devtools_open",
        # Content
        "question_approved",
        "question_rejected",
        "generation_job_started",
        "generation_job_finished",
        "prompt_template_changed",
        "llm_config_changed",
        # Billing
        "checkout_started",
        "subscription_changed",
        "payment_succeeded",
        "payment_failed",
        # Admin
        "manual_grade_override",
        "api_key_created",
        "api_key_revoked",
        "entitlement_override_granted",
    }
)


async def audit_log(
    db: AsyncSession,
    *,
    type: str,
    user_id: UUID | None = None,
    payload: dict[str, Any] | None = None,
    request_id: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    commit: bool = False,
) -> None:
    """Append an immutable audit event. Never raise — log failures, swallow errors.

    Pass `commit=True` only when the caller is certain no further work in the
    same transaction depends on its rollback semantics. Defaults to deferred
    commit (caller's responsibility).
    """
    if type not in SAFE_TYPES:
        log.warning("audit_log_unknown_type", type=type)
    try:
        await db.execute(
            text(
                """
                INSERT INTO analytics.audit_events
                  (type, user_id, payload, request_id, ip, user_agent)
                VALUES
                  (:type, :user_id, :payload, :request_id, :ip, :user_agent)
                """
            ),
            {
                "type": type,
                "user_id": user_id,
                "payload": _safe_json(payload or {}),
                "request_id": request_id,
                "ip": ip,
                "user_agent": (user_agent or "")[:512],
            },
        )
        if commit:
            await db.commit()
    except Exception as exc:  # never raise from audit
        log.warning("audit_log_failed", type=type, error=str(exc))


def _safe_json(payload: dict[str, Any]) -> str:
    """Drop obvious PII keys before persisting."""
    import json

    REDACTED = {"password", "current_password", "new_password", "token", "refresh_token", "card", "cvv"}
    cleaned = {k: ("[REDACTED]" if k.lower() in REDACTED else v) for k, v in payload.items()}
    try:
        return json.dumps(cleaned, default=str)
    except Exception:
        return "{}"
