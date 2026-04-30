"""IRT 2PL fitter + Cohen's kappa unit tests."""

from __future__ import annotations

import math

import numpy as np

from data_engine.services.calibration import _fit_2pl_item, _p_correct, cohens_kappa


def test_p_correct_2pl_at_b_equals_0_5() -> None:
    # When θ == b and a > 0, the response curve crosses 0.5 (no guessing).
    assert math.isclose(_p_correct(theta=1.0, a=1.5, b=1.0, c=0.0), 0.5, abs_tol=1e-9)


def test_p_correct_3pl_floor_is_c() -> None:
    # As θ → -∞, P approaches the guessing parameter c.
    assert _p_correct(theta=-10.0, a=1.0, b=0.0, c=0.25) > 0.24


def test_fit_2pl_recovers_known_parameters() -> None:
    # Simulate from a known model, then refit; the estimate should be close.
    rng = np.random.default_rng(42)
    true_a, true_b = 1.4, -0.6
    thetas = rng.uniform(-2.5, 2.5, size=600)
    probs = np.array([_p_correct(t, true_a, true_b) for t in thetas])
    correct = (rng.uniform(size=len(thetas)) < probs).astype(float)
    a_hat, b_hat, diag = _fit_2pl_item(thetas, correct, c=0.0)
    assert abs(a_hat - true_a) < 0.5
    assert abs(b_hat - true_b) < 0.5
    assert diag["n"] == len(thetas)
    assert 0.5 < diag["infit"] < 1.5


def test_cohens_kappa_perfect_agreement_is_one() -> None:
    bands = [5.0, 5.5, 6.0, 6.5, 7.0]
    out = cohens_kappa(bands, bands)
    assert out["kappa"] >= 0.999
    assert out["mae"] == 0.0


def test_cohens_kappa_off_by_half_band_is_high() -> None:
    a = [5.0, 5.5, 6.0, 6.5, 7.0]
    b = [5.5, 6.0, 6.5, 7.0, 7.5]
    out = cohens_kappa(a, b)
    # Off-by-one ordinal step → still substantial agreement under quadratic weighting
    assert out["kappa"] > 0.5
    assert out["mae"] == 0.5
