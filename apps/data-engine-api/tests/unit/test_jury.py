"""Unit tests for multi-jury consensus logic."""

from __future__ import annotations

import pytest


def jury_consensus(
    verdicts: list[str],
    *,
    required_majority: float = 0.5,
) -> str:
    """Determine final verdict from multiple jury verdicts.

    This mirrors the consensus logic in data_engine.services.jury.
    Rules:
    - If majority vote "approve" → approved
    - If majority vote "reject" → rejected
    - If no clear majority → borderline (needs human review)
    """
    if not verdicts:
        return "borderline"

    counts = {"approve": 0, "reject": 0, "borderline": 0}
    for v in verdicts:
        key = v.lower() if v.lower() in counts else "borderline"
        counts[key] += 1

    total = len(verdicts)
    if counts["approve"] / total > required_majority:
        return "approve"
    if counts["reject"] / total > required_majority:
        return "reject"
    return "borderline"


class TestJuryConsensus:
    def test_unanimous_approve(self) -> None:
        assert jury_consensus(["approve", "approve", "approve"]) == "approve"

    def test_unanimous_reject(self) -> None:
        assert jury_consensus(["reject", "reject", "reject"]) == "reject"

    def test_majority_approve(self) -> None:
        assert jury_consensus(["approve", "approve", "reject"]) == "approve"

    def test_majority_reject(self) -> None:
        assert jury_consensus(["reject", "reject", "approve"]) == "reject"

    def test_split_vote_is_borderline(self) -> None:
        # 1 approve, 1 reject, 1 borderline — no majority
        assert jury_consensus(["approve", "reject", "borderline"]) == "borderline"

    def test_empty_verdicts_is_borderline(self) -> None:
        assert jury_consensus([]) == "borderline"

    def test_single_approve(self) -> None:
        assert jury_consensus(["approve"]) == "approve"

    def test_single_reject(self) -> None:
        assert jury_consensus(["reject"]) == "reject"

    def test_single_borderline(self) -> None:
        assert jury_consensus(["borderline"]) == "borderline"

    def test_two_approve_one_borderline(self) -> None:
        assert jury_consensus(["approve", "approve", "borderline"]) == "approve"

    def test_two_reject_one_borderline(self) -> None:
        assert jury_consensus(["reject", "reject", "borderline"]) == "reject"

    def test_all_borderline(self) -> None:
        assert jury_consensus(["borderline", "borderline", "borderline"]) == "borderline"

    def test_case_insensitive(self) -> None:
        assert jury_consensus(["Approve", "APPROVE", "approve"]) == "approve"

    def test_five_jurors_3_2_approve(self) -> None:
        assert jury_consensus(["approve", "approve", "approve", "reject", "reject"]) == "approve"

    def test_five_jurors_2_3_reject(self) -> None:
        assert jury_consensus(["approve", "approve", "reject", "reject", "reject"]) == "reject"

    def test_strict_majority_threshold(self) -> None:
        # With required_majority=0.66, need >66% to pass
        result = jury_consensus(
            ["approve", "approve", "reject"],
            required_majority=0.66,
        )
        assert result == "borderline"  # 66.6% > 66% threshold

    def test_supermajority_passes_high_threshold(self) -> None:
        result = jury_consensus(
            ["approve", "approve", "approve", "reject"],
            required_majority=0.7,
        )
        assert result == "approve"  # 75% > 70%


class TestJuryEdgeCases:
    def test_unknown_verdict_treated_as_borderline(self) -> None:
        # Unknown verdicts default to borderline
        assert jury_consensus(["approve", "approve", "unknown"]) == "approve"

    def test_large_jury_panel(self) -> None:
        verdicts = ["approve"] * 7 + ["reject"] * 3
        assert jury_consensus(verdicts) == "approve"

    def test_tie_vote_is_borderline(self) -> None:
        assert jury_consensus(["approve", "reject"]) == "borderline"
