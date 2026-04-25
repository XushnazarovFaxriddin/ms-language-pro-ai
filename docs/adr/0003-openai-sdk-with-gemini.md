# ADR 0003 — OpenAI SDK with Gemini Models (No ChatGPT)

- **Status**: Accepted
- **Date**: 2026-04-26
- **Deciders**: Bobomurod, Faxriddin
- **Drives**: All `python/languagepro_llm/` design

## Context

LanguagePro AI requires LLM calls for:

| Purpose | Frequency | Latency budget |
|---|---|---|
| Question generation | Batch (5–500 / hour) | Minutes |
| Multi-jury validation | 3 calls per generated question | Minutes |
| CEFR text classification | Per generated/imported question | Seconds |
| Writing essay scoring | Per essay submission (~20 / day MVP) | < 20 s |
| Speaking scoring (multimodal) | Per speaking response | < 30 s |
| Embedding (deduplication) | Per question | < 5 s |
| Speech-to-text | Per audio recording | < 30 s |
| Feedback generation (UZ/EN) | Per scored response | < 10 s |

We need:
- A **single client library** (not a polyglot of provider SDKs) — easier maintenance for two students.
- Hot-swappable provider/model **without code changes** (env-driven).
- Fallback chain (primary → fallback if rate-limited).
- Cost-effective at thesis scale (target: < $50/month at pilot scale).
- Multimodal: text + audio (for speaking section).

## Considered options

| Option | Pros | Cons |
|---|---|---|
| **A. OpenAI SDK + Google Gemini (OpenAI-compat endpoint)** | Single SDK; Gemini models cheaper than GPT-4o for similar quality; all needs (text, multimodal audio, embeddings) covered; no ChatGPT |
| B. Native Google `google-genai` SDK + OpenAI SDK | Best of both providers | Two SDKs in code; harder abstraction |
| C. LiteLLM | 100+ providers, fallbacks, retries | Yet another dependency layer; harder to debug; less defensible IP for thesis |
| D. LangChain | High-level abstractions | Heavyweight; opinionated; updates fast and breaks code |
| E. ChatGPT (OpenAI GPT-4o + Whisper) | Most popular benchmark | **Excluded by user requirement** — also pricier, separate Whisper call needed |

## Decision

**Option A**: Use the official **`openai`** SDK (Python and JS) as the **only** LLM client. Configure via `base_url` to point at Google's Gemini OpenAI-compatible endpoint:

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=settings.google_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

# Use Gemini model names directly
response = await client.chat.completions.create(
    model="gemini-2.5-pro",
    messages=[...],
    response_format={"type": "json_schema", "json_schema": ...},
)
```

**Models** (default — all Gemini, no ChatGPT):

| Profile | Model | Why |
|---|---|---|
| Generate question | `gemini-2.5-pro` | Best generation quality; structured output supported |
| Validate (jury 1) | `gemini-2.5-flash` | Cheap, fast |
| Validate (jury 2) | `gemini-2.0-flash` | Different family for jury diversity |
| Validate (jury 3) | `gemini-2.5-pro` | High-quality tiebreaker |
| Classify CEFR | `gemini-2.5-flash` | Cheap; classification is easy |
| Score writing | `gemini-2.5-pro` | Quality matters for thesis IRR study |
| Score speaking | `gemini-2.5-flash` (multimodal) | Audio support; cheaper than 2.5-pro for STT-quality |
| Embed | `text-embedding-004` | Native Gemini embeddings, 768-dim |
| Feedback (UZ/EN) | `gemini-2.5-pro` | Multilingual quality crucial |

## Why exclude ChatGPT (OpenAI's GPT-4o family)?

- **User requirement** (explicit): "ChatGPT emas".
- **Cost**: Gemini 2.5 Pro pricing is competitive; 2.5 Flash is significantly cheaper than gpt-4o-mini for similar quality on classification tasks.
- **Multimodal audio**: Gemini 2.5 Flash handles audio natively in one call. With OpenAI we'd need Whisper + separate LLM call (two round trips, two cost lines).
- **Vendor concentration**: Sticking with one vendor (Google) simplifies billing, quota, and data-handling agreements for the dissertation.

## Why OpenAI SDK (not Google's native SDK)?

- The OpenAI SDK has the **most mature ecosystem**: structured output via `response_format`, streaming, batch API patterns, retry logic, type generation, observability hooks.
- Gemini's OpenAI-compat endpoint covers all our needs (`chat.completions`, `embeddings`, multimodal via `messages` content arrays).
- **Future flexibility**: If we ever switch to a different OpenAI-compat provider (Anthropic via OpenRouter, vLLM self-hosted, Together.ai, Groq), only `OPENAI_BASE_URL` changes — no code changes.

## Consequences

- ✅ Single SDK in dependency tree (`openai` for Python, `openai` for TS).
- ✅ Single API key to manage (`GOOGLE_API_KEY`, used as `OPENAI_API_KEY` for the SDK).
- ✅ Provider swap = env var change.
- ✅ Multimodal audio without separate STT layer.
- ⚠️ Some advanced Gemini features (e.g., file API, code execution) not exposed via OpenAI-compat — if we need them, fall back to native `google-genai`. For MVP, OpenAI-compat suffices.
- ⚠️ Multi-jury "diversity" is reduced because all models are Gemini family. Mitigation: use 2.5-pro + 2.5-flash + 2.0-flash → different training cutoffs / capabilities. If thesis needs cross-vendor diversity, juror 3 can swap to a non-Gemini OpenAI-compat provider via `JUROR_3_BASE_URL`.

## Implementation notes

`python/languagepro_llm/router.py` exposes `LLMRouter.complete(req: LLMRequest)` that wraps the SDK call. See `apps/data-engine-api/docs/06-prompt-engineering.md` for the full design and prompt versioning strategy.

## References

- Gemini OpenAI compatibility: https://ai.google.dev/gemini-api/docs/openai
- OpenAI SDK Python: https://github.com/openai/openai-python
- OpenAI SDK JS: https://github.com/openai/openai-node
