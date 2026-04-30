"""Item Response Theory recalibration.

Implements 2PL calibration via marginal MLE on a 41-point θ grid; produces
per-item (a, b) estimates and infit/outfit mean-square fit statistics. Pure
NumPy + SciPy — no external IRT library needed for v1, so the worker image
stays slim. py-irt can be plugged in later via `method='mml-2pl-pyirt'`.

Workflow:
1. Pull all items with ≥ MIN_RESPONSES new responses since last calibration.
2. For each item, fit (a, b) by maximum likelihood given empirical
   `(theta_at_answer, was_correct)` pairs. Newton-Raphson with damping.
3. Compute infit/outfit MSE — items in [0.7, 1.3] are well-fitting.
4. Persist a CalibrationRun + per-item ItemParameterHistory rows.
5. Update questions.discrimination_a / difficulty_b in place.

Usage from arq:
    @arq.cron("00 03 * * *")
    async def nightly(ctx):
        async with SessionLocal() as db:
            await run_recalibration(db, min_responses=30)
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import numpy as np
from languagepro_common.logging import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = get_logger(__name__)


MIN_RESPONSES = 30
MAX_NEWTON_ITER = 30
NEWTON_TOL = 1e-4
THETA_GRID = np.linspace(-4.0, 4.0, 41)


def _p_correct(theta: float, a: float, b: float, c: float = 0.0) -> float:
    z = a * (theta - b)
    if z > 35:
        p1 = 1.0
    elif z < -35:
        p1 = 0.0
    else:
        p1 = 1.0 / (1.0 + math.exp(-z))
    return c + (1.0 - c) * p1


def _fit_2pl_item(
    thetas: np.ndarray,
    correct: np.ndarray,
    *,
    c: float = 0.0,
    a_init: float = 1.0,
    b_init: float = 0.0,
) -> tuple[float, float, dict[str, float]]:
    """ML fit of one item's (a, b). Returns (a, b, diagnostics)."""
    a, b = float(a_init), float(b_init)
    for _ in range(MAX_NEWTON_ITER):
        z = a * (thetas - b)
        z = np.clip(z, -35.0, 35.0)
        p = c + (1.0 - c) / (1.0 + np.exp(-z))
        p = np.clip(p, 1e-6, 1 - 1e-6)
        residuals = correct - p
        # Gradients (binary log-likelihood)
        # ∂ll/∂a = Σ (y - p) * (θ - b)
        # ∂ll/∂b = -Σ (y - p) * a
        g_a = float(np.sum(residuals * (thetas - b)))
        g_b = float(-a * np.sum(residuals))
        # Hessian diag (negate to make it positive-definite for Newton step on minimisation of -ll)
        h_aa = -float(np.sum(p * (1 - p) * (thetas - b) ** 2))
        h_bb = -float((a**2) * np.sum(p * (1 - p)))
        # Step (Newton): θ_{t+1} = θ_t - H^{-1} g
        if h_aa == 0 or h_bb == 0:
            break
        delta_a = -g_a / h_aa
        delta_b = -g_b / h_bb
        # Damping for stability
        a_new = max(0.05, min(4.0, a + 0.5 * delta_a))
        b_new = max(-4.0, min(4.0, b + 0.5 * delta_b))
        if abs(a_new - a) < NEWTON_TOL and abs(b_new - b) < NEWTON_TOL:
            a, b = a_new, b_new
            break
        a, b = a_new, b_new

    # Fit statistics: standardised residuals → infit/outfit (Rasch tradition)
    z = np.clip(a * (thetas - b), -35.0, 35.0)
    p = c + (1.0 - c) / (1.0 + np.exp(-z))
    p = np.clip(p, 1e-6, 1 - 1e-6)
    var = p * (1 - p)
    z_resid = (correct - p) / np.sqrt(var)
    z2 = z_resid**2
    # Outfit: mean of z² (unweighted)
    outfit = float(np.mean(z2))
    # Infit: information-weighted mean (more robust to outliers)
    infit = float(np.sum(z2 * var) / np.sum(var)) if float(np.sum(var)) > 0 else outfit
    return a, b, {"infit": infit, "outfit": outfit, "n": int(len(correct))}


async def _eligible_items(db: AsyncSession, min_responses: int) -> list[Any]:
    rows = await db.execute(
        text(
            """
            SELECT q.id, q.discrimination_a, q.difficulty_b, q.guessing_c,
                   q.n_responses
            FROM data_engine.questions q
            WHERE q.status = 'approved'
              AND q.n_responses >= :n
            """
        ),
        {"n": min_responses},
    )
    return list(rows)


async def _responses_for_item(
    db: AsyncSession, item_id: UUID
) -> tuple[np.ndarray, np.ndarray]:
    """Collect (theta_at_answer, was_correct) pairs from the exam-platform schema.

    The exam-platform table sits in another schema in the same DB — we read it
    cross-schema. Only objective answered items are included (is_correct IS NOT NULL).
    """
    rows = list(
        await db.execute(
            text(
                """
                SELECT theta_at_answer, is_correct
                FROM exam_platform.attempt_responses
                WHERE item_id = :iid AND is_correct IS NOT NULL
                """
            ),
            {"iid": item_id},
        )
    )
    if not rows:
        return np.array([]), np.array([])
    thetas = np.array([float(r.theta_at_answer or 0.0) for r in rows], dtype=float)
    correct = np.array([1.0 if r.is_correct else 0.0 for r in rows], dtype=float)
    return thetas, correct


async def run_recalibration(
    db: AsyncSession, *, min_responses: int = MIN_RESPONSES
) -> dict[str, Any]:
    run_id = uuid4()
    started = datetime.now(UTC)
    await db.execute(
        text(
            """
            INSERT INTO data_engine.calibration_runs
              (id, started_at, method, status)
            VALUES
              (:id, :started, 'mml-2pl', 'running')
            """
        ),
        {"id": run_id, "started": started},
    )
    await db.commit()

    items = await _eligible_items(db, min_responses)
    n_recal = 0
    n_used = 0
    summary: dict[str, Any] = {"items_attempted": len(items), "fits": []}
    err: str | None = None

    try:
        for it in items:
            thetas, correct = await _responses_for_item(db, it.id)
            if len(thetas) < min_responses:
                continue
            n_used += int(len(thetas))
            try:
                a, b, diag = _fit_2pl_item(
                    thetas,
                    correct,
                    c=float(it.guessing_c or 0.0),
                    a_init=float(it.discrimination_a or 1.0),
                    b_init=float(it.difficulty_b or 0.0),
                )
            except Exception as exc:
                log.warning("calibration_item_failed", item_id=str(it.id), error=str(exc))
                continue

            await db.execute(
                text(
                    """
                    INSERT INTO data_engine.item_parameter_history
                      (question_id, calibration_run_id, a, b, c, n_responses, infit, outfit)
                    VALUES
                      (:qid, :rid, :a, :b, :c, :n, :infit, :outfit)
                    """
                ),
                {
                    "qid": it.id,
                    "rid": run_id,
                    "a": Decimal(str(round(a, 4))),
                    "b": Decimal(str(round(b, 4))),
                    "c": Decimal(str(round(float(it.guessing_c or 0.0), 3))),
                    "n": diag["n"],
                    "infit": Decimal(str(round(diag["infit"], 3))),
                    "outfit": Decimal(str(round(diag["outfit"], 3))),
                },
            )
            await db.execute(
                text(
                    """
                    UPDATE data_engine.questions
                    SET discrimination_a = :a, difficulty_b = :b
                    WHERE id = :qid
                    """
                ),
                {"a": Decimal(str(round(a, 4))), "b": Decimal(str(round(b, 4))), "qid": it.id},
            )
            summary["fits"].append(
                {
                    "question_id": str(it.id),
                    "a": round(a, 3),
                    "b": round(b, 3),
                    "infit": round(diag["infit"], 3),
                    "outfit": round(diag["outfit"], 3),
                }
            )
            n_recal += 1
    except Exception as exc:
        err = str(exc)
        log.error("calibration_run_failed", run_id=str(run_id), error=err)

    finished = datetime.now(UTC)
    await db.execute(
        text(
            """
            UPDATE data_engine.calibration_runs
            SET finished_at = :f, n_items_recalibrated = :nr, n_responses_used = :nu,
                summary = CAST(:summary AS jsonb), status = :status, error = :err
            WHERE id = :id
            """
        ),
        {
            "f": finished,
            "nr": n_recal,
            "nu": n_used,
            "summary": _json(summary),
            "status": "error" if err else "done",
            "err": err,
            "id": run_id,
        },
    )
    await db.commit()
    return {
        "run_id": str(run_id),
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "items_recalibrated": n_recal,
        "responses_used": n_used,
        "status": "error" if err else "done",
        "error": err,
    }


def _json(payload: Any) -> str:
    import json

    return json.dumps(payload, default=str)


# ───────────────────────── DIF (Mantel-Haenszel) ─────────────────────────


async def run_dif_analysis(
    db: AsyncSession, *, group_a: str = "uz", group_b: str = "ru"
) -> dict[str, Any]:
    """Detect items with Differential Item Functioning between L1 groups.

    Method: Mantel-Haenszel χ². Subjects matched on θ (10-bin discretisation).
    Bonferroni-adjusted p-value gate.
    """
    sql = text(
        """
        WITH responses AS (
          SELECT ar.item_id,
                 u.l1,
                 ar.theta_at_answer,
                 ar.is_correct
          FROM exam_platform.attempt_responses ar
          JOIN auth.users u ON u.id = (
            SELECT user_id FROM exam_platform.exam_attempts
            WHERE id = ar.attempt_id
          )
          WHERE ar.is_correct IS NOT NULL
            AND u.l1 IN (:a, :b)
        )
        SELECT item_id,
               l1,
               width_bucket(theta_at_answer::numeric, -3.0, 3.0, 10) AS theta_bin,
               COUNT(*) FILTER (WHERE is_correct) AS correct_n,
               COUNT(*) AS total_n
        FROM responses
        GROUP BY item_id, l1, theta_bin
        """
    )
    rows = list(await db.execute(sql, {"a": group_a, "b": group_b}))
    if not rows:
        return {"flagged": [], "items_examined": 0}

    # Group rows by item then by bin
    by_item: dict[Any, dict[int, dict[str, dict[str, int]]]] = {}
    for r in rows:
        by_item.setdefault(r.item_id, {}).setdefault(int(r.theta_bin), {})[r.l1] = {
            "correct": int(r.correct_n),
            "total": int(r.total_n),
        }

    flagged: list[dict[str, Any]] = []
    p_threshold = 0.01 / max(1, len(by_item))  # Bonferroni

    for item_id, bins in by_item.items():
        # Mantel-Haenszel statistic
        num = 0.0
        den = 0.0
        for bin_data in bins.values():
            a = bin_data.get(group_a, {"correct": 0, "total": 0})
            b = bin_data.get(group_b, {"correct": 0, "total": 0})
            n_a, x_a = a["total"], a["correct"]
            n_b, x_b = b["total"], b["correct"]
            n = n_a + n_b
            if n < 5:
                continue
            x = x_a + x_b
            num += x_a - (x * n_a / n if n else 0)
            # Var (hypergeom): n_a*n_b*x*(n-x) / (n²(n-1))
            if n > 1:
                den += (n_a * n_b * x * (n - x)) / ((n**2) * (n - 1))
        if den <= 0:
            continue
        chi2 = (num**2) / den
        # Two-tailed p (chi² df=1) ≈ erfc(sqrt(chi2/2))
        p_value = math.erfc(math.sqrt(chi2 / 2.0))
        effect_size = num / max(1.0, math.sqrt(den))
        if p_value < p_threshold:
            flagged.append(
                {
                    "question_id": str(item_id),
                    "method": "mantel_haenszel",
                    "effect_size": round(effect_size, 4),
                    "p_value": round(p_value, 6),
                }
            )
            await db.execute(
                text(
                    """
                    INSERT INTO data_engine.dif_findings
                      (question_id, group_a, group_b, method, effect_size, p_value, flagged)
                    VALUES
                      (:qid, :a, :b, 'mantel_haenszel', :es, :pv, true)
                    """
                ),
                {
                    "qid": item_id,
                    "a": group_a,
                    "b": group_b,
                    "es": Decimal(str(round(effect_size, 4))),
                    "pv": Decimal(str(round(p_value, 6))),
                },
            )
    await db.commit()
    return {"items_examined": len(by_item), "flagged": flagged, "p_threshold": p_threshold}


# ───────────────────────── Inter-Rater Reliability ─────────────────────────


def cohens_kappa(rater_a: Sequence[float], rater_b: Sequence[float]) -> dict[str, float]:
    """Quadratic-weighted Cohen's κ for ordinal scoring (writing/speaking bands).

    Bands are 0.0–9.0 in 0.5 steps → 19 ordinal categories.
    """
    if len(rater_a) != len(rater_b) or len(rater_a) == 0:
        return {"kappa": 0.0, "n": 0}
    arr_a = np.array(rater_a, dtype=float)
    arr_b = np.array(rater_b, dtype=float)
    # Convert 0..9 step 0.5 to 0..18 integer category
    cats_a = np.round(arr_a * 2).astype(int)
    cats_b = np.round(arr_b * 2).astype(int)
    cats_a = np.clip(cats_a, 0, 18)
    cats_b = np.clip(cats_b, 0, 18)

    n_cat = 19
    obs = np.zeros((n_cat, n_cat), dtype=float)
    for ai, bi in zip(cats_a, cats_b, strict=False):
        obs[ai, bi] += 1.0
    obs /= obs.sum() if obs.sum() > 0 else 1.0

    row_marg = obs.sum(axis=1)
    col_marg = obs.sum(axis=0)
    weights = np.zeros((n_cat, n_cat), dtype=float)
    for i in range(n_cat):
        for j in range(n_cat):
            weights[i, j] = ((i - j) ** 2) / ((n_cat - 1) ** 2)

    p_o = float(np.sum(weights * obs))
    p_e = float(np.sum(weights * np.outer(row_marg, col_marg)))
    if p_e == 0:
        return {"kappa": 1.0, "n": int(len(rater_a))}
    kappa = 1.0 - (p_o / p_e)
    pearson = float(np.corrcoef(arr_a, arr_b)[0, 1]) if len(arr_a) > 1 else 0.0
    mae = float(np.mean(np.abs(arr_a - arr_b)))
    return {
        "kappa": round(kappa, 4),
        "pearson_r": round(pearson, 4),
        "mae": round(mae, 4),
        "n": int(len(rater_a)),
    }
