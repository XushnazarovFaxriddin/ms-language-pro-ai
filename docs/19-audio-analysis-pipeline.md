# 19 — Audio Analysis Pipeline

> **TL;DR.** Speaking and listening audio is processed in a deterministic, multi-stage pipeline producing structured features that feed the Feedback Engine and the Roadmap. Stages: ingest → normalise → VAD → forced alignment → phoneme GOP → fluency metrics → multimodal Gemini grading. Pure-Python where possible (`webrtcvad`, `librosa`, `montreal-forced-aligner` self-host or `wav2vec2` CTC alignment). Each stage is independently re-runnable and idempotent. Designed for both async upload (Phase 1) and realtime streaming (Phase 5).

---

## 1. Pipeline overview

```
[Browser MediaRecorder]
      │ webm/opus 64 kbps
      ▼
[S3 putObject (presigned)]                       ← async upload
      │
      ▼
[exam-worker arq job: score_speaking]
      │
      ├─ ffmpeg → 16 kHz mono WAV PCM
      ├─ webrtcvad → segments (speech vs silence)
      ├─ librosa → pitch (F0), energy, spectral centroid
      ├─ wav2vec2-CTC → phoneme alignment (or MFA self-host)
      ├─ phoneme GOP → per-phoneme score
      ├─ fluency metrics (WPM, pause ratio, filled pauses)
      └─ Gemini multimodal call → transcript + criteria bands + feedback
      │
      ▼
[persist] llm_scoring_runs, transcripts,
          feedback_artifacts(layer='phoneme'),
          feedback_artifacts(layer='word' for delivery)
```

Each stage's output is persisted; if a downstream stage fails, we don't redo the upstream.

---

## 2. Stage 1 — Ingest & normalise

```bash
ffmpeg -hide_banner -loglevel error \
  -i input.webm \
  -ac 1 -ar 16000 -acodec pcm_s16le \
  -af "highpass=f=80,lowpass=f=8000,loudnorm=I=-23:LRA=7:TP=-2" \
  -y output.wav
```

- Mono, 16 kHz, 16-bit PCM (Whisper / wav2vec2 expectation).
- High-pass at 80 Hz (kills mic rumble), low-pass at 8 kHz (out-of-band noise).
- Loudness normalisation to EBU R128 −23 LUFS so loudness doesn't bias scoring.

Output in `S3://audio-recordings/<attempt>/<response>.wav` (overwrites the original webm with a `.wav` sibling we keep for audit).

---

## 3. Stage 2 — Voice Activity Detection (webrtcvad)

```python
import webrtcvad
vad = webrtcvad.Vad(2)  # aggressiveness 0–3
def segments(wav_bytes):
    for frame in chunks(wav_bytes, 30):     # 30-ms frames
        yield (vad.is_speech(frame, 16000), frame.t)
```

Produces a list of `(start, end, is_speech)` segments. Used for:

- **Total speech duration** (vs total clip duration).
- **Pause distribution** (lengths of `is_speech=False` runs).
- **Pause ratio** = `silence_seconds / total_seconds`. Target band 7+ users have pause ratio ~0.2.

---

## 4. Stage 3 — Acoustic features (librosa)

Per 25-ms frame, hop 10 ms:

- **F0 (pitch)** — pyin algorithm.
- **Energy** — RMS.
- **Spectral centroid** — brightness proxy.
- **Spectral rolloff (85%)**.
- **Zero-crossing rate**.

Aggregate over segments:

- Mean F0 + std (intonation variation).
- Energy std (vs flat monotone).
- Speech rate volatility = std of WPM in 5-s sliding windows.

Stored in `feedback_artifacts(layer='word')` payload as `delivery` block:

```json
{
  "delivery": {
    "duration_seconds": 88.4,
    "speech_seconds": 73.6,
    "pause_ratio": 0.17,
    "wpm_mean": 138,
    "wpm_std": 22,
    "f0_mean_hz": 168,
    "f0_std_hz": 32,
    "filled_pauses": ["um(3)", "uh(1)", "you-know(2)"]
  }
}
```

---

## 5. Stage 4 — Phoneme alignment

Two paths.

### 5.1 Self-hosted MFA (preferred when accuracy matters)

Montreal Forced Aligner trained on LibriSpeech-100h + ARPA dict.

```bash
mfa align --clean --num_jobs 4 \
  ./input_dir english_us_arpa english_us_arpa ./output_dir
```

Output: TextGrid with phoneme intervals (start, end, label).

Issues: cold-start time ~30 s per worker; container size +500 MB.

### 5.2 wav2vec2 CTC (lighter, good enough)

`facebook/wav2vec2-large-960h-lv60-self` + a CTC alignment head.

```python
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
# decode → token-level timestamps → map to phonemes via dict
```

Pros: 50 MB model, runs CPU. Cons: phoneme inventory simpler, accuracy ~90% of MFA.

**Decision**: ship wav2vec2 in v1 (lower ops cost), add MFA self-host in Phase 4 when speaking volume justifies the extra container.

---

## 6. Stage 5 — Goodness-of-Pronunciation (GOP)

Standard formulation (Witt & Young 2000):

```
GOP(p, o) = log P(o | p) − max_q log P(o | q)
```

where `o` is the observed acoustic frame sequence aligned to phoneme `p`, and `q` ranges over all phonemes.

We approximate using wav2vec2's softmax over phoneme tokens at each aligned frame:

```python
import torch
def gop(frames_logits, target_phoneme_id):
    log_probs = torch.log_softmax(frames_logits, dim=-1)
    p = log_probs[:, target_phoneme_id].mean()
    q_max = log_probs.max(dim=-1).values.mean()
    return float(p - q_max)
```

Output range: ≤ 0 (more negative = worse pronunciation). For UI we map to `[0, 1]` via:

```python
def gop_to_score(gop_value):
    return max(0.0, min(1.0, 1.0 - abs(gop_value) / 3.0))
```

Verdict thresholds (tuned on validation set):
- `>= 0.75` → `good`
- `0.5 – 0.75` → `acceptable`
- `< 0.5` → `needs_work`

---

## 7. Stage 6 — Multimodal Gemini grading

See [`06-ai-pipelines.md`](06-ai-pipelines.md) §9 for the Gemini call mechanics. Inputs:

- Normalised WAV bytes.
- Task prompt + part number + rubric.
- **Audio metadata from §3-§4 above** so the model has objective stats to anchor its bands.

Output: structured `SpeakingScore` (transcript, 4 criteria, overall, audio meta echoed, bilingual feedback, confidence). Persisted in `llm_scoring_runs`.

---

## 8. Phoneme issue clustering

After §5–§6, we cluster low-GOP phonemes into Uzbek-L1-typical patterns (curated by linguists):

| Cluster code | Phonemes | Common cause |
|---|---|---|
| `pronunciation.consonant_th_unvoiced` | /θ/ | absent in Uzbek; replaced with /s/ or /t/ |
| `pronunciation.consonant_th_voiced` | /ð/ | replaced with /z/ or /d/ |
| `pronunciation.vowel_ash_eh_confusion` | /æ/ vs /ɛ/ | "bad" vs "bed" |
| `pronunciation.vowel_uh` | /ʌ/ | mapped to /a/ |
| `pronunciation.consonant_w_v` | /w/ | replaced with /v/ |
| `pronunciation.consonant_r_quality` | /r/ | trilled vs approximant |
| `pronunciation.stress_misplacement` | (whole word) | wrong syllable stressed |

Output written as `feedback_artifacts(layer='phoneme')`. Powers Pronunciation Lab ([`16-practice-mode.md`](16-practice-mode.md) §5).

---

## 9. Realtime mode (Phase 5)

LiveKit room → Gemini Live agent. Key changes:

- VAD runs at the edge (LiveKit DTX); we receive segmented utterances.
- Per-utterance: same pipeline (normalise → align → GOP → grading) but shorter inputs.
- Final aggregate at session end runs once over the concatenated WAV.

Schema unchanged (`feedback_artifacts`). Only the ingest adapter swaps:

```python
class SpeakingIngest(Protocol):
    async def get_utterances(self, session_id: UUID) -> AsyncIterator[bytes]: ...
    async def get_full_audio(self, session_id: UUID) -> bytes: ...
```

Implementations:
- `S3IngestAdapter` — async upload, returns full bytes.
- `LiveKitIngestAdapter` — yields utterances + final mux.

---

## 10. Performance targets

| Stage | p95 |
|---|---|
| Stage 1 ffmpeg | 1 s for 90-s clip |
| Stage 2 VAD | 0.2 s |
| Stage 3 librosa | 0.5 s |
| Stage 4 wav2vec2 | 4 s on CPU (Hetzner CCX23); 1 s on T4 GPU |
| Stage 5 GOP | 0.1 s |
| Stage 6 Gemini multimodal | 12–25 s |
| **Total** | **≤ 30 s p95** |

---

## 11. Storage & retention

- Original webm: 90-day retention (S3 lifecycle).
- Normalised WAV: 90-day retention.
- Per-stage intermediate features: persisted only as JSON in `feedback_artifacts`. No raw audio saved beyond 90 days.
- Phoneme alignment TextGrids: 30-day retention, then deleted (regenerable).

GDPR data export endpoint includes the original webm + transcripts; phoneme features can be regenerated.

---

## 12. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/exam/v1/responses/{id}/audio` | Signed URL for the user's own audio |
| GET | `/exam/v1/responses/{id}/transcript` | Plain text transcript |
| GET | `/exam/v1/responses/{id}/phoneme-feedback` | layer=phoneme artefacts |
| POST | `/exam/v1/practice/pronunciation/attempts` | Pronunciation Lab clip → returns GOP |

---

## 13. Acceptance

- [ ] A 90-second response completes the full pipeline in ≤ 30 s p95.
- [ ] Phoneme-level GOP is within ±0.05 of MFA reference on a 30-clip benchmark.
- [ ] Filled pauses (`um`, `uh`) are detected with recall ≥ 0.8 on a labelled set.
- [ ] Pause ratio computed from VAD matches manual labelling within ±0.03 absolute.
- [ ] Realtime mode (Phase 5) produces identical structured output for the same audio when fed through both adapters (regression test).
- [ ] All audio is auto-deleted after 90 days (lifecycle policy verified).
