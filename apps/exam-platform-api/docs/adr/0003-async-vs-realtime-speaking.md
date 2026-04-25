# ADR EP-0003 — Async speaking scoring for MVP (realtime in Phase 2)

- **Status**: Accepted (MVP); Phase 2 deferred
- **Date**: 2026-04-26

## Context
IELTS Speaking test traditionally is realtime conversation with examiner. Modern AI platforms (Duolingo English Test) use realtime AI examiner. Trade-offs:

| Mode | UX | Tech complexity | Latency | Cost |
|---|---|---|---|---|
| **Async** (MVP) | Record → upload → wait 30s | Low | Medium | Lower |
| **Realtime** (Phase 2) | Live conversation | High (WebRTC + Pipecat + LiveKit) | <2s | Higher (continuous LLM streaming) |

## Decision (MVP)
**Async**: Student records all speaking responses with MediaRecorder, uploads to S3 via presigned PUT, server scores via Gemini multimodal in arq job, results streamed back via SSE.

This delivers a complete, defensible thesis in 12 weeks while keeping realtime as a future direction (gives Faxriddin a "future work" chapter).

## Phase 2 design (post-MVP)
Adapter layer is designed to swap:
```python
# adapters/speaking_ingest/{async_upload,realtime_livekit}.py
class SpeakingIngestProtocol(Protocol):
    async def get_audio(self, response_id) -> bytes: ...
```
Async adapter pulls from S3. Realtime adapter would pull from LiveKit room recording. Scoring layer (LLMRouter call) unchanged.

## Consequences
- ✅ Demoable in 12 weeks
- ✅ Lower infrastructure cost (no LiveKit server)
- ✅ Easier debugging (audio file persistent)
- ⚠️ Less "innovative" demo than realtime — mitigated by featuring multimodal Gemini (also a novel angle)
- 🔮 Phase 2 ADR will document realtime: WebRTC, LiveKit Agents, Pipecat orchestration
