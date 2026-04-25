# 05 — IRT 2PL Calibration

## Model
P(correct | θ, a, b) = 1 / (1 + exp(-a · (θ - b)))

- `θ` (theta): student ability, latent
- `b`: item difficulty
- `a`: item discrimination (default 1.0 cold-start)
- `c`: guessing (constant per type: 0.25 for 4-option MCQ, 0 for cloze) — 3PL with fixed `c`

## Cold start (new item)
LLM generation step returns `difficulty_self_rating` (1-9). Map:
```python
def cold_start_b(rating: int) -> float:
    # 1-9 → -3..+3 z-scale, linear
    return (rating - 5) * 0.75
```
`a = 1.0`, `c` per type table.

## Recalibration (nightly arq cron)
Triggered when `questions.n_responses % 30 == 0` since last calibration.

```python
# services/calibration/recalibrate.py
from py_irt.dataset import Dataset
from py_irt.training import IrtModelTrainer

async def recalibrate_batch(item_ids: list[UUID]):
    rows = await read_responses(item_ids)  # from analytics.item_response_data
    ds = Dataset.from_pandas(rows, item_id_col="question_id",
                             user_id_col="user_id", correct_col="is_correct")
    trainer = IrtModelTrainer(model_type="2pl", dataset=ds)
    trainer.train(epochs=2000)
    for item_id, params in trainer.export_params().items():
        await save_item_params(item_id, a=params.a, b=params.b)
        await write_history(item_id, ...)  # item_parameters_history
```

## Item selection (real-time, in `/v1/items/next`)
Maximum Fisher Information at current θ:
```python
def fisher_info(theta, a, b, c=0.0):
    p = c + (1 - c) / (1 + math.exp(-a * (theta - b)))
    q = 1 - p
    return (a ** 2) * (q / p) * ((p - c) / (1 - c)) ** 2

async def select_next(theta: float, skill: str,
                      exclude_ids: set[UUID]) -> Question:
    candidates = await fetch_candidates(skill, exclude_ids, status='approved')
    return max(candidates, key=lambda q: fisher_info(theta, q.a, q.b, q.c))
    # tie-break: pseudo-random by hash(theta || q.id)
```

## Stopping (consumer-side; data-engine just provides items)
Consumer (exam-platform) stops section when:
- `SE(θ) < 0.3`, OR
- `n_items_in_section >= blueprint.max_items`

θ update: see `apps/exam-platform-api/docs/06-adaptive-selection.md`.

## Files
- `services/calibration/recalibrate.py` — nightly job
- `services/calibration/selection.py` — Fisher info, `select_next`
- `python/languagepro_irt/engine.py` — `py-irt` wrapper (shared)
- `python/languagepro_irt/fisher.py` — pure functions

## Acceptance
- [ ] Cold-start `b` distribution roughly normal(0, 1) on 100 items
- [ ] After 30 responses per item, recalibration shifts `b` by avg |Δb| > 0.1
- [ ] `select_next` returns item with max Fisher info in <50ms (with index)
- [ ] θ tracking simulation: 30 items → SE(θ) < 0.3 in ≥80% of synthetic cases
