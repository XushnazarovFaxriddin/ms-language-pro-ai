# ADR DE-0002 — arq for background jobs

- **Status**: Accepted
- **Date**: 2026-04-26
- **Refines**: `/docs/adr/0004-arq-over-celery.md` for data-engine specifics

## Decision
Use `arq`. Single worker container per FastAPI service. Redis-backed.

## Job inventory (data-engine)
| Job | Trigger | Avg duration |
|---|---|---|
| `generate_batch` | API POST `/generation/jobs` | 1-15 min |
| `validate_jury` | inline within `generate_batch` | parallel ~5s |
| `embed_question` | inline within `generate_batch` | <2s |
| `recalibrate_items` | cron nightly 03:00 UTC | 5-30 min |
| `export_responses_csv` | researcher API | 10s-2min |

## Files
- `src/data_engine/jobs/__init__.py` — `WorkerSettings`
- `src/data_engine/jobs/generation.py`, `calibration.py`, `exports.py`

## Run
```bash
uv run arq src.data_engine.jobs.WorkerSettings
```
