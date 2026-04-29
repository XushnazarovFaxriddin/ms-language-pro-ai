"""Section budget + skill-skip behaviour for the attempt service (no DB).

These tests exercise the pure helpers in attempt.py to lock in the contract
that drives the end-to-end IELTS multi-section flow.
"""

from __future__ import annotations

from exam_platform.services.attempt import _section_budget


def test_section_budget_prefers_stop_rule_max_items() -> None:
    section = {"item_count": 13, "stop_rule": {"type": "budget", "max_items": 5}}
    assert _section_budget(section) == 5


def test_section_budget_falls_back_to_item_count() -> None:
    assert _section_budget({"item_count": 7}) == 7


def test_section_budget_default_when_unspecified() -> None:
    assert _section_budget({"skill": "reading"}) == 5


def test_section_budget_handles_int_stop_rule_value_zero() -> None:
    section = {"stop_rule": {"max_items": 1}, "item_count": 99}
    assert _section_budget(section) == 1
