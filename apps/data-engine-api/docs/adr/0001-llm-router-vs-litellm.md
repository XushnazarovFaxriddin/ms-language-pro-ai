# ADR DE-0001 — LLM Router built on `openai` SDK directly

- **Status**: Accepted
- **Date**: 2026-04-26

## Context
Need LLM client. Repo-level ADR 0003 mandates OpenAI SDK + Gemini.

## Considered
- LiteLLM — extra layer, harder to debug, less defensible IP for thesis
- LangChain — heavyweight, frequent breaking changes
- Native `openai` SDK with thin wrapper

## Decision
Thin `LLMRouter` class over `openai` SDK. Lives in `python/languagepro_llm/router.py`. Provides:
- `complete(LLMRequest) -> LLMResponse` — chat/structured output
- `embed(text) -> vector`
- Per-purpose profile (model, temperature) via `.env` + DB hot-swap
- Fallback chain (try profile → fallback profile)
- Redis cache (key: `sha256(profile,prompt,schema)`)
- Cost log to `analytics.llm_calls`

## Consequences
- Defensible thesis IP — students wrote the abstraction
- Easy to debug (read 200-line file)
- Stays close to OpenAI SDK semantics
