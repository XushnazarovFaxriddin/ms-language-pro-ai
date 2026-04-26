# ADR 0004 — arq for Background Jobs (vs. Celery / RQ)

- **Status**: Accepted
- **Date**: 2026-04-26
- **Deciders**: Bobomurod, Faxriddin

## Context

We have async background jobs in both backends:

**data-engine** (Bobomurod):
- Question batch generation (LLM-bound, minutes)
- Multi-jury validation (parallel LLM calls)
- Embedding + duplicate detection
- Nightly IRT recalibration (CPU-bound, py-irt)

**exam-platform** (Faxriddin):
- Speaking audio scoring (multimodal LLM)
- Writing essay scoring
- Certificate PDF rendering
- Bulk result export

All API code is `async/await` (FastAPI). We need a job runner that:
- Plays well with asyncio (no thread-pool wrapping)
- Has a small dependency footprint
- Is easy to debug locally
- Doesn't require a heavy broker (RabbitMQ) — Redis is enough at our scale

## Considered options

| Option | Pros | Cons |
|---|---|---|
| **A. arq** | Native asyncio, Redis-only, ~1k LOC, simple decorator API, perfect for FastAPI | Smaller community, less battle-tested at >10k jobs/min |
| B. Celery | Industry standard, mature, pluggable brokers | Sync-first, asyncio support is bolted-on, heavy, broker abstraction overkill |
| C. RQ | Simple, Python-native | Sync; bolt-on async support |
| D. Dramatiq | Async, well-designed | Less common; smaller ecosystem |
| E. APScheduler | Built-in scheduling | Not designed for distributed work |
| F. Inngest / Temporal | Workflow-as-code, retries built in | External service or heavy self-host; over-engineered |

## Decision

**Option A**: `arq`. One Redis instance serves session cache + LLM cache + arq queue (separate logical DBs).

Rationale:
- Our scale is small (< 100 jobs/min at pilot, < 1k at year 1). Celery's complexity buys no value.
- Native asyncio: no `delay()` vs `apply_async()` confusion, no thread-pool gotchas with FastAPI.
- Single dependency: just adds `arq` package and uses existing Redis.
- Code is small enough to read end-to-end if debugging is needed.

## Consequences

- ✅ One Redis covers cache + queue. One worker process per service (`arq` worker).
- ✅ Type-safe job invocation: `await ctx.enqueue_job("score_writing", attempt_id, response_id)`.
- ✅ Built-in retries with exponential backoff.
- ⚠️ No fancy scheduling (cron). For nightly IRT recalibration, we use `arq`'s built-in `cron` jobs (sufficient).
- ⚠️ No multi-broker (Redis-only). If we ever need RabbitMQ semantics (priorities, fanout), would need to migrate.
- ⚠️ Smaller community than Celery → fewer Stack Overflow answers. Mitigation: code is small; read the source.

## Implementation notes

- One `arq.Worker` per FastAPI service (separate Docker container).
- Job functions live in `src/<service>/jobs/<name>.py`.
- Dependencies (DB session, LLM router) injected via `arq.cron`'s `ctx`.
- Settings: `max_jobs=10`, `job_timeout=300`, `keep_result=3600`.
- Monitoring: arq has built-in `arq.cli` health check; we additionally export Prometheus metrics via custom hook.

## References

- arq: https://github.com/python-arq/arq
- arq docs: https://arq-docs.helpmanual.io/
