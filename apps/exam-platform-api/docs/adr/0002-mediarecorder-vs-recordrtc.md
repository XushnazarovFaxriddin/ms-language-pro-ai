# ADR EP-0002 — MediaRecorder API (vs RecordRTC)

- **Status**: Accepted
- **Date**: 2026-04-26

## Context
Audio recording in browser. Options:
- **MediaRecorder** — native browser API, no deps
- **RecordRTC** — npm library, more features (WebM ↔ MP4 transcode in-browser)

## Decision
**MediaRecorder API**. Format: `audio/webm;codecs=opus`.

## Why
- Native, zero dependency, smaller bundle
- Supported in Chrome, Firefox, Edge (>95% target audience)
- Opus codec — excellent quality at 64 kbps
- Server-side ffmpeg handles format conversion → 16 kHz mono WAV

## Safari workaround
Safari doesn't support webm/opus natively. Mitigations:
1. **MVP**: pin Chrome for thesis demo, show "Use Chrome" banner for Safari
2. **Phase 2**: feature-detect + use `audio/mp4` fallback (Safari supports it)
3. **Phase 3**: RecordRTC polyfill if iOS Safari critical

## Consequences
- Zero JS deps for audio
- Server-side ffmpeg required (already needed for normalization)
- Phase 2 work for Safari support
