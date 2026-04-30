"""Certificate generator: produces a valid PDF with a stable SHA-256."""

from __future__ import annotations

from uuid import uuid4

from exam_platform.services.certificate import _band_to_cefr_helper as _maybe  # noqa: F401
from exam_platform.services.certificate import issue


def test_issue_produces_pdf_bytes_and_sha256() -> None:
    out = issue(
        user_id=uuid4(),
        attempt_id=uuid4(),
        display_name="Aziza Karimova",
        overall_band=7.0,
        cefr_level="C1",
        bands={"reading": 7.5, "listening": 7.0, "writing": 6.5, "speaking": 7.0},
        exam_name="IELTS Academic Full Test",
    )
    assert out["pdf_bytes"]
    assert out["pdf_bytes"][:5] == b"%PDF-"
    assert len(out["sha256"]) == 64
    assert len(out["public_id"]) == 10
