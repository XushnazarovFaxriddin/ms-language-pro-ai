"""Per-call cost computation. Pricing seeded; refreshed manually when Google updates rates.

Prices are USD per 1M tokens (input / output).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class ModelPricing:
    model: str
    input_per_1m_usd: Decimal
    output_per_1m_usd: Decimal


# Reference prices (Q2 2026) — adjust quarterly. See
# https://ai.google.dev/gemini-api/docs/pricing
DEFAULT_PRICING: dict[str, ModelPricing] = {
    "gemini-2.5-pro": ModelPricing(
        model="gemini-2.5-pro",
        input_per_1m_usd=Decimal("1.25"),
        output_per_1m_usd=Decimal("10.00"),
    ),
    "gemini-2.5-flash": ModelPricing(
        model="gemini-2.5-flash",
        input_per_1m_usd=Decimal("0.30"),
        output_per_1m_usd=Decimal("2.50"),
    ),
    "gemini-2.0-pro": ModelPricing(
        model="gemini-2.0-pro",
        input_per_1m_usd=Decimal("1.25"),
        output_per_1m_usd=Decimal("5.00"),
    ),
    "gemini-2.0-flash": ModelPricing(
        model="gemini-2.0-flash",
        input_per_1m_usd=Decimal("0.10"),
        output_per_1m_usd=Decimal("0.40"),
    ),
    "gemini-embedding-001": ModelPricing(
        model="gemini-embedding-001",
        input_per_1m_usd=Decimal("0.15"),
        output_per_1m_usd=Decimal("0.0"),
    ),
}


def compute_cost(model: str, tokens_in: int, tokens_out: int) -> Decimal:
    pricing = DEFAULT_PRICING.get(model)
    if pricing is None:
        return Decimal("0")
    return (
        Decimal(tokens_in) / Decimal(1_000_000) * pricing.input_per_1m_usd
        + Decimal(tokens_out) / Decimal(1_000_000) * pricing.output_per_1m_usd
    ).quantize(Decimal("0.000001"))


class CostLoggerSink(Protocol):
    """Implementations write to analytics.llm_calls or stdout."""

    async def record(self, **kwargs) -> None: ...


class CostLogger:
    """Wraps a sink; can be no-op or DB-backed."""

    def __init__(self, sink: CostLoggerSink | None = None):
        self._sink = sink

    async def record(self, **kwargs) -> None:
        if self._sink is not None:
            await self._sink.record(**kwargs)
