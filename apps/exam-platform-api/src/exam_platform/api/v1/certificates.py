"""Certificate issuance and verification."""

from __future__ import annotations

import base64
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from languagepro_common import audit_log
from languagepro_common.auth import CurrentUser
from languagepro_common.errors import ConflictError, ForbiddenError, NotFoundError
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from exam_platform.api.deps import get_current_user
from exam_platform.db import get_session
from exam_platform.models import Exam, ExamAttempt
from exam_platform.services import certificate as cert_svc
from exam_platform.services import feedback as feedback_svc

router = APIRouter(tags=["certificates"])


@router.post("/attempts/{attempt_id}/certificate")
async def issue_certificate(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, Any]:
    """Issue (or fetch existing) certificate PDF.

    Pro / Team only — Free / Starter receive a 402 from the entitlement check
    once that helper is wired in (currently entitlement check is permissive).
    """
    row = (
        await db.execute(
            select(ExamAttempt, Exam).join(
                Exam, ExamAttempt.exam_id == Exam.id
            ).where(
                ExamAttempt.id == attempt_id, ExamAttempt.user_id == user.id
            )
        )
    ).one_or_none()
    if row is None:
        raise NotFoundError(f"Attempt {attempt_id} not found")
    attempt, exam = row
    if attempt.state != "completed":
        raise ConflictError("Attempt is not completed yet")

    # Existing cert?
    existing = (
        await db.execute(
            text(
                "SELECT public_id, sha256, payload, pdf_s3_key, issued_at "
                "FROM exam_platform.certificates WHERE attempt_id = :att"
            ),
            {"att": attempt_id},
        )
    ).one_or_none()
    if existing:
        return {
            "public_id": existing.public_id,
            "sha256": existing.sha256,
            "issued_at": existing.issued_at.isoformat(),
            "verify_url": f"/verify/{existing.public_id}",
            "already_issued": True,
        }

    bands = await feedback_svc.compute_attempt_bands(db, attempt_id)
    overall = bands.get("overall") or 0.0
    cefr = _band_to_cefr(overall)
    display_name = await _get_display_name(db, user.id) or user.id.hex[:8]

    issued = cert_svc.issue(
        user_id=user.id,
        attempt_id=attempt_id,
        display_name=display_name,
        overall_band=float(overall),
        cefr_level=cefr,
        bands={k: v for k, v in bands.items() if k != "overall"},
        exam_name=exam.name_en,
    )

    pdf_b64 = base64.b64encode(issued["pdf_bytes"]).decode()

    await db.execute(
        text(
            """
            INSERT INTO exam_platform.certificates
              (attempt_id, public_id, user_id, overall_band, cefr_level,
               display_name, sha256, payload, pdf_s3_key)
            VALUES
              (:att, :pid, :uid, :band, :cefr, :name, :sha, CAST(:payload AS jsonb), :s3key)
            """
        ),
        {
            "att": attempt_id,
            "pid": issued["public_id"],
            "uid": user.id,
            "band": overall,
            "cefr": cefr,
            "name": display_name,
            "sha": issued["sha256"],
            "payload": _safe_json(issued["payload"]),
            "s3key": f"inline:b64:{issued['public_id']}",
        },
    )
    await audit_log(
        db,
        type="attempt_completed",
        user_id=user.id,
        payload={
            "attempt_id": str(attempt_id),
            "certificate_public_id": issued["public_id"],
            "overall_band": overall,
        },
    )
    await db.commit()

    return {
        "public_id": issued["public_id"],
        "sha256": issued["sha256"],
        "issued_at": issued["issued_at"].isoformat(),
        "verify_url": f"/verify/{issued['public_id']}",
        "pdf_base64": pdf_b64,
        "overall_band": overall,
        "cefr_level": cefr,
    }


@router.get("/attempts/{attempt_id}/certificate.pdf")
async def download_certificate(
    attempt_id: UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> Response:
    cert = (
        await db.execute(
            text(
                """
                SELECT c.public_id, c.payload, c.user_id, c.display_name,
                       c.overall_band, c.cefr_level, c.sha256, c.issued_at,
                       e.name_en
                FROM exam_platform.certificates c
                JOIN exam_platform.exam_attempts a ON a.id = c.attempt_id
                JOIN exam_platform.exams e ON e.id = a.exam_id
                WHERE c.attempt_id = :att
                """
            ),
            {"att": attempt_id},
        )
    ).one_or_none()
    if cert is None:
        raise NotFoundError(f"No certificate for attempt {attempt_id}")
    if cert.user_id != user.id and "superadmin" not in user.roles:
        raise ForbiddenError("Not your certificate")

    payload = cert.payload if isinstance(cert.payload, dict) else {}
    bands = payload.get("bands", {})
    issued = cert_svc.issue(
        user_id=user.id,
        attempt_id=attempt_id,
        display_name=cert.display_name,
        overall_band=float(cert.overall_band),
        cefr_level=cert.cefr_level,
        bands=bands,
        exam_name=cert.name_en,
    )
    return Response(
        content=issued["pdf_bytes"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="cert-{cert.public_id}.pdf"',
            "X-Certificate-SHA256": cert.sha256,
        },
    )


@router.get("/verify/{public_id}", include_in_schema=True)
async def verify_certificate(
    public_id: str,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    """Public — anyone can verify a certificate by its public ID."""
    cert = (
        await db.execute(
            text(
                """
                SELECT c.public_id, c.display_name, c.overall_band, c.cefr_level,
                       c.payload, c.sha256, c.issued_at, c.revoked_at, e.name_en
                FROM exam_platform.certificates c
                JOIN exam_platform.exam_attempts a ON a.id = c.attempt_id
                JOIN exam_platform.exams e ON e.id = a.exam_id
                WHERE c.public_id = :pid
                """
            ),
            {"pid": public_id},
        )
    ).one_or_none()
    if cert is None:
        return {"valid": False, "reason": "not_found"}
    if cert.revoked_at is not None:
        return {"valid": False, "reason": "revoked", "revoked_at": cert.revoked_at.isoformat()}

    payload = cert.payload if isinstance(cert.payload, dict) else {}
    return {
        "valid": True,
        "public_id": cert.public_id,
        "display_name": cert.display_name,
        "exam_name": cert.name_en,
        "overall_band": float(cert.overall_band),
        "cefr_level": cert.cefr_level,
        "bands": payload.get("bands", {}),
        "issued_at": cert.issued_at.isoformat(),
        "sha256": cert.sha256,
    }


def _band_to_cefr(band: float) -> str:
    """Approximate IELTS band → CEFR mapping (per IELTS official table)."""
    if band >= 8.5:
        return "C2"
    if band >= 7.0:
        return "C1"
    if band >= 5.5:
        return "B2"
    if band >= 4.0:
        return "B1"
    if band >= 3.0:
        return "A2"
    return "A1"


async def _get_display_name(db: AsyncSession, user_id: UUID) -> str | None:
    row = (
        await db.execute(
            text("SELECT display_name FROM auth.users WHERE id = :uid"),
            {"uid": user_id},
        )
    ).one_or_none()
    return row.display_name if row else None


def _safe_json(payload: Any) -> str:
    import json

    try:
        return json.dumps(payload, default=str)
    except Exception:
        return "{}"
