"""2PL probability + Fisher information + max-info item selector."""

from __future__ import annotations

import math
from collections.abc import Iterable
from typing import Generic, TypeVar

T = TypeVar("T")


def prob_correct(theta: float, a: float, b: float, c: float = 0.0) -> float:
    """3PL with optional fixed c (guessing). Set c=0 for pure 2PL."""
    z = a * (theta - b)
    # numerical safety
    if z > 35:
        p1 = 1.0
    elif z < -35:
        p1 = 0.0
    else:
        p1 = 1.0 / (1.0 + math.exp(-z))
    return c + (1.0 - c) * p1


def fisher_information(theta: float, a: float, b: float, c: float = 0.0) -> float:
    """I(θ) for 3PL/2PL. For 2PL (c=0): I = a^2 * P * (1-P)."""
    p = prob_correct(theta, a, b, c)
    if p <= 0 or p >= 1:
        return 0.0
    q = 1.0 - p
    if c == 0.0:
        return (a**2) * p * q
    # 3PL with constant c
    return (a**2) * (q / p) * ((p - c) / (1.0 - c)) ** 2


class _Item(Generic[T]):
    def __init__(self, id_: T, a: float, b: float, c: float = 0.0):
        self.id = id_
        self.a = a
        self.b = b
        self.c = c


def select_max_info(
    candidates: Iterable[_Item[T]],
    theta: float,
    *,
    excluded: set[T] | None = None,
) -> _Item[T] | None:
    """Greedy: pick item with maximum Fisher information at current theta.

    Tie-break: deterministic by id hash so identical thetas don't get identical
    items (helps with parallel attempts seeing different sequences).
    """
    excluded = excluded or set()
    best: _Item[T] | None = None
    best_info = -1.0
    for item in candidates:
        if item.id in excluded:
            continue
        info = fisher_information(theta, item.a, item.b, item.c)
        if info > best_info:
            best_info = info
            best = item
        elif info == best_info and best is not None:
            # tie-break by id hash
            if hash(item.id) > hash(best.id):
                best = item
    return best
