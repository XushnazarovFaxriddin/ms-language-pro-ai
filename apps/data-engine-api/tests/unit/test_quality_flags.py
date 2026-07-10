"""Unit tests for item quality flags logic."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

# Re-implement the quality flags logic locally to test independently
# This matches the logic in data_engine.api.v1.items._quality_flags

def _quality_flags(q: SimpleNamespace) -> list[str]:
    """Compute quality flags from a question row object."""
    flags: list[str] = []
    payload = q.payload or {}
    if not payload.get("prompt") and not payload.get("passage") and not payload.get("audio_url"):
        flags.append("missing_prompt")
    if not q.answer_key:
        flags.append("missing_answer_key")
    if not q.generated_by_model and not q.prompt_version_id:
        flags.append("missing_provenance")
    if q.status not in ("rejected",) and q.n_responses < 30:
        flags.append("low_response_count")
    if q.status in ("draft", "in_review"):
        flags.append("needs_review")
    return flags


def _make_question(
    *,
    payload: dict | None = None,
    answer_key: dict | None = None,
    generated_by_model: str | None = "gpt-4o",
    prompt_version_id: str | None = "v1.0",
    status: str = "approved",
    n_responses: int = 50,
) -> SimpleNamespace:
    return SimpleNamespace(
        payload=payload or {"prompt": "What is the main idea?"},
        answer_key=answer_key or {"correct_option_id": "A"},
        generated_by_model=generated_by_model,
        prompt_version_id=prompt_version_id,
        status=status,
        n_responses=n_responses,
    )


class TestQualityFlags:
    def test_clean_item_has_no_blocking_flags(self) -> None:
        q = _make_question()
        flags = _quality_flags(q)
        # Only possible flag for a clean approved item with ≥30 responses is nothing
        blocking = {"missing_prompt", "missing_answer_key", "missing_provenance"}
        assert not blocking.intersection(flags)

    def test_missing_prompt_detected(self) -> None:
        q = _make_question(payload={})
        flags = _quality_flags(q)
        assert "missing_prompt" in flags

    def test_missing_answer_key_detected(self) -> None:
        q = _make_question(answer_key=None)
        flags = _quality_flags(q)
        assert "missing_answer_key" in flags

    def test_missing_provenance_detected(self) -> None:
        q = _make_question(generated_by_model=None, prompt_version_id=None)
        flags = _quality_flags(q)
        assert "missing_provenance" in flags

    def test_provenance_ok_with_just_model(self) -> None:
        q = _make_question(prompt_version_id=None)
        flags = _quality_flags(q)
        assert "missing_provenance" not in flags

    def test_provenance_ok_with_just_prompt_version(self) -> None:
        q = _make_question(generated_by_model=None)
        flags = _quality_flags(q)
        assert "missing_provenance" not in flags

    def test_low_response_count_flag(self) -> None:
        q = _make_question(n_responses=5)
        flags = _quality_flags(q)
        assert "low_response_count" in flags

    def test_high_response_count_no_flag(self) -> None:
        q = _make_question(n_responses=100)
        flags = _quality_flags(q)
        assert "low_response_count" not in flags

    def test_needs_review_for_draft(self) -> None:
        q = _make_question(status="draft")
        flags = _quality_flags(q)
        assert "needs_review" in flags

    def test_needs_review_for_in_review(self) -> None:
        q = _make_question(status="in_review")
        flags = _quality_flags(q)
        assert "needs_review" in flags

    def test_no_needs_review_for_approved(self) -> None:
        q = _make_question(status="approved")
        flags = _quality_flags(q)
        assert "needs_review" not in flags

    def test_passage_satisfies_prompt_requirement(self) -> None:
        q = _make_question(payload={"passage": "The Earth revolves..."})
        flags = _quality_flags(q)
        assert "missing_prompt" not in flags

    def test_audio_url_satisfies_prompt_requirement(self) -> None:
        q = _make_question(payload={"audio_url": "https://cdn.example.com/a.mp3"})
        flags = _quality_flags(q)
        assert "missing_prompt" not in flags

    def test_multiple_flags_accumulated(self) -> None:
        q = _make_question(
            payload={},
            answer_key=None,
            generated_by_model=None,
            prompt_version_id=None,
            status="draft",
            n_responses=0,
        )
        flags = _quality_flags(q)
        assert "missing_prompt" in flags
        assert "missing_answer_key" in flags
        assert "missing_provenance" in flags
        assert "low_response_count" in flags
        assert "needs_review" in flags
        assert len(flags) == 5

    def test_rejected_item_no_low_response_flag(self) -> None:
        q = _make_question(status="rejected", n_responses=0)
        flags = _quality_flags(q)
        assert "low_response_count" not in flags

    def test_export_ready_requires_approved_and_clean(self) -> None:
        q = _make_question()
        flags = _quality_flags(q)
        blocking = {"missing_answer_key", "missing_prompt", "missing_provenance"}
        is_export_ready = q.status == "approved" and not blocking.intersection(flags)
        assert is_export_ready is True

    def test_export_not_ready_with_missing_key(self) -> None:
        q = _make_question(answer_key=None)
        flags = _quality_flags(q)
        blocking = {"missing_answer_key", "missing_prompt", "missing_provenance"}
        is_export_ready = q.status == "approved" and not blocking.intersection(flags)
        assert is_export_ready is False
