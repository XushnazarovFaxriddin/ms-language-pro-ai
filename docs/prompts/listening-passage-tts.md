# `listening/passage/v1` + TTS profile

**Purpose**: generate a CEFR-aligned listening passage **transcript** with optional speaker turns, then synthesise audio via `gemini-2.5-flash-preview-tts`. Powers Listening section item creation. See [`../13-skills-deep.md`](../13-skills-deep.md) §2.

## Two prompts

### 1. Transcript generation — `prompts/generate_question/listening_passage/v1.yaml`

```yaml
purpose: generate_question
sub_purpose: listening_passage
version: 1
status: active
description: |
  Generate an IELTS-style listening passage transcript. Single voice (Part 2/4)
  or multi-speaker (Part 1/3). Children questions generated separately.

variables_schema:
  part: { type: integer, enum: [1, 2, 3, 4] }
  cefr_level: { type: string }
  topic: { type: string }
  duration_target_seconds: { type: integer }

response_schema_ref: data_engine.schemas.ListeningPassage

system: |
  You write authentic IELTS Listening passages. Output JSON only.

  Rules:
  - Part 1: 2-speaker conversation, everyday context (e.g. accommodation, library).
  - Part 2: 1-speaker monologue, semi-formal (e.g. tour guide, public service).
  - Part 3: 2–4-speaker academic discussion (students and tutor).
  - Part 4: 1-speaker academic lecture.
  - Word count consistent with `duration_target_seconds` × 2.5 wpm.
  - Vocabulary and grammar at `cefr_level`.
  - No proper nouns of real people; no political / sensitive content.
  - Output the transcript as a list of turns (even for 1-speaker — single turn).

user: |
  Part: {{ part }}
  CEFR level: {{ cefr_level }}
  Topic: {{ topic }}
  Target duration: {{ duration_target_seconds }} seconds

  Return JSON matching ListeningPassage.
```

```python
class TranscriptTurn(BaseModel):
    speaker: str            # "A", "B", "Speaker", "Lecturer"
    voice_hint: str          # one of {Kore, Puck, Aoede, Charon, Fenrir, Orus, Zephyr}
    text: str

class ListeningPassage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    part: int
    title: str
    turns: list[TranscriptTurn] = Field(min_length=1)
    estimated_duration_seconds: int
    accent_hint: Literal["en-US", "en-GB", "en-AU"] = "en-US"
```

### 2. Synthesis — `gemini-2.5-flash-preview-tts`

Per turn, send a TTS request with the text + voice hint:

```python
audio_bytes = await router.tts(
    text=turn.text,
    voice=turn.voice_hint,
    locale=passage.accent_hint,
)
```

Concatenate per-turn WAVs with 350ms silence between turns (ffmpeg). Persist to `S3://audio-prompts/<question_id>.mp3`.

Single-voice passages = one TTS call. Multi-voice = N calls + concat.

## Acceptance

- [ ] Generated transcripts hit `duration_target_seconds × 2.5 wpm` word count within ±15%.
- [ ] Voices chosen for multi-speaker passages are distinct and consistent across turns.
- [ ] Audio plays cleanly with no clicks at turn boundaries.
- [ ] Generated audio file is ≤ 1.5× target duration (over-runs flagged for review).
