"""Theta update (EAP) and cold-start b mapping."""

from __future__ import annotations

import numpy as np

from languagepro_irt.fisher import prob_correct


def cold_start_b(llm_difficulty_rating: int) -> float:
    """Map LLM 1–9 self-rating → z-scale b ([-3, +3])."""
    rating = max(1, min(9, llm_difficulty_rating))
    return (rating - 5) * 0.75


def update_theta_eap(
    prior_theta: float,
    prior_se: float,
    a: float,
    b: float,
    c: float,
    was_correct: bool,
    grid_low: float = -4.0,
    grid_high: float = 4.0,
    grid_step: float = 0.05,
) -> tuple[float, float]:
    """Discrete-grid Expected A Posteriori update. Returns (theta, se)."""
    grid = np.arange(grid_low, grid_high + grid_step, grid_step)
    likelihood = np.array(
        [
            (
                prob_correct(float(t), a, b, c)
                if was_correct
                else 1.0 - prob_correct(float(t), a, b, c)
            )
            for t in grid
        ]
    )
    # Gaussian prior
    prior_se_safe = max(prior_se, 0.05)
    prior = np.exp(-0.5 * ((grid - prior_theta) / prior_se_safe) ** 2)
    prior /= prior.sum()
    posterior = likelihood * prior
    posterior /= posterior.sum() if posterior.sum() > 0 else 1.0
    new_theta = float((grid * posterior).sum())
    var = float(((grid - new_theta) ** 2 * posterior).sum())
    new_se = float(np.sqrt(max(var, 1e-6)))
    return new_theta, new_se
