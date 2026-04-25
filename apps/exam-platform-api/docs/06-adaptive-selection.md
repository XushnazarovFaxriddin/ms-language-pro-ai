# 06 — Adaptive Item Selection (consumer side)

## Boundary
- **data-engine** owns item bank + Fisher info computation + `select_next` algorithm
- **exam-platform** maintains `theta` per attempt+skill, calls data-engine, applies stopping rules

## Theta initialization
- Start: `theta = 0` for first item in each skill
- (Optional, Phase 2) Quick placement: 3-question screener before main exam estimates initial theta

## Theta update (after each scored item)

Bayesian Maximum a Posteriori (MAP) estimate, EAP-style:

```python
def update_theta(prior_theta, prior_se,
                 a, b, c, was_correct) -> tuple[float, float]:
    # Discrete posterior over theta grid [-4, 4] step 0.1
    grid = np.arange(-4, 4, 0.1)
    likelihood = np.array([
        prob_correct(t, a, b, c) if was_correct else (1 - prob_correct(t, a, b, c))
        for t in grid
    ])
    prior = norm.pdf(grid, prior_theta, prior_se)
    posterior = likelihood * prior
    posterior /= posterior.sum()
    new_theta = (grid * posterior).sum()
    new_se = np.sqrt(((grid - new_theta) ** 2 * posterior).sum())
    return new_theta, new_se
```

For objective items: use immediately on submit.
For Writing/Speaking: defer until LLM scoring done (use `was_correct = (band >= target_band)` proxy, OR scale band → continuous credit).

## Next-item request
```python
# services/adaptive/next.py
async def get_next_item(attempt_id, skill):
    attempt = await load(attempt_id)
    theta = attempt.theta_estimates[skill]
    seen_ids = await load_seen_ids(attempt_id, skill)
    item = await data_engine_client.get_next_item(
        attempt_id=attempt_id,
        theta=theta,
        skill=skill,
        exclude_ids=seen_ids,
        blueprint_id=attempt.blueprint_id,
    )
    return item
```

## Stopping rules (per section)
1. `attempt_sections.section_index >= blueprint.max_items` → done
2. `theta_se[skill] < 0.3` AND items_used >= min_items → done early
3. Time limit reached → done

`min_items` per blueprint (e.g., 30 for Reading, 8 for Writing-as-2-tasks).

## Edge cases
- Item bank exhausted (no eligible items): return placeholder + flag for content team
- Network error to data-engine: retry 3× then graceful failure (mark item as skipped, no theta update)

## Files
- `services/adaptive/theta.py` — `update_theta`, `prob_correct`
- `services/adaptive/next.py` — orchestration
- `services/adaptive/stopping.py` — stopping rule checks
- `adapters/data_engine/client.py` — HTTP client (S2S JWT)

## Acceptance
- [ ] Theta convergence simulation: 30 items → SE < 0.3 for 80% of synthetic test takers
- [ ] No duplicate items within same attempt (exclude_ids honored)
- [ ] Theta update latency <50ms per item (numpy vectorized)
