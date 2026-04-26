# 16 — Practice Mode

> **TL;DR.** Three practice surfaces beyond the timed mock test: **Drills** (5–25 min targeted micro-exercises tied to error codes), **Flashcards** (FSRS-scheduled vocabulary + grammar + phoneme cards), and **AI Conversation Partner + Pronunciation Lab** (Gemini Live for free-form speaking practice with phoneme-level feedback). All practice activity feeds back into the user's mastery model and reschedules the Roadmap. **Practice ≠ Exam**: questions are repeatable, hints are allowed, AI is conversational, and audio is replay-able.

---

## 1. Practice vs Exam mode

| Behaviour | Exam Mode | Practice Mode |
|---|---|---|
| Time limit | strict (server enforced) | none (user can pause) |
| Audio replay | single play | unlimited; speed 0.85×–1.25× |
| Captions | hidden (until after) | on/off toggle |
| Hints | none | on demand |
| Revisit answers | locked after submit | yes |
| Score counted in band | yes | no — only mastery model |
| AI mode | strict examiner persona | encouraging tutor persona |
| Cost (LLM) | per attempt | per turn |

---

## 2. Drills

A **drill** is a short (5–25 min), tightly scoped activity targeting one or two error codes from the [`14-feedback-engine.md`](14-feedback-engine.md) taxonomy.

### 2.1 Drill types

| Type | Skill | Example |
|---|---|---|
| `reading_skim` | reading | "Find the main idea of this paragraph in 60 s" |
| `reading_inference` | reading | "What does the writer imply by ___?" with reveal |
| `listening_dictation` | listening | "Type what you hear" — audio replay allowed |
| `listening_gist` | listening | "Multiple-choice on a 30-s clip" |
| `writing_micro` | writing | "Rewrite this sentence to fix the grammar issue" |
| `writing_paragraph` | writing | "Write 80 words on this topic; AI grades the topic sentence" |
| `vocab_match` | vocab | "Match each word to its synonym" |
| `vocab_cloze` | vocab | "Fill the blank with the correct collocation" |
| `grammar_pattern` | grammar | "Choose the correct verb form" |
| `pronunciation_minimal_pair` | speaking | "Record yourself saying `ship` then `sheep`" |
| `pronunciation_word` | speaking | "Repeat this word; phoneme feedback shows what to fix" |
| `pronunciation_sentence` | speaking | "Read this sentence; we'll grade fluency + intonation" |

### 2.2 Drill payload

`data_engine.drills.payload`:

```json
{
  "type": "writing_micro",
  "instruction_uz": "Quyidagi gapni grammatik xato bo'lmasin tarzda qayta yozing.",
  "instruction_en": "Rewrite the sentence to fix the grammar.",
  "items": [
    {
      "id": 1,
      "given": "Many of people prefer to live in city.",
      "target_codes": ["grammar.partitive_of", "grammar.article_missing"],
      "accepted": ["Many people prefer to live in the city.",
                   "Many people prefer to live in cities."],
      "tolerance": "lev<=1"
    },
    { "id": 2, "given": "...", "target_codes": [...], "accepted": [...] }
  ],
  "duration_minutes": 10
}
```

Variants: each drill seed has 3–5 variants of items so spaced repetition doesn't collide.

### 2.3 Drill UI flow

1. User opens a drill from `/practice/today` or `/practice/drills`.
2. Single-screen runner: instruction + first item + answer field.
3. Submit → instant correct/incorrect + 1-line explanation + "next" button.
4. End screen: % correct, time, masteries delta, "Add 5 more like this" button.
5. Activity recorded in `exam_platform.drill_attempts(user_id, drill_id, items_correct, items_total, duration_ms, completed_at)`.

### 2.4 Mastery model

Each `error_taxonomy.code` has a per-user mastery score in `exam_platform.user_mastery(user_id, code, mastery, last_practiced_at)`. Updated by:

- **+0.05** on a correct drill item targeting the code.
- **−0.10** on an incorrect drill item.
- **−0.10** on a fresh attempt where the same code is detected.
- Decays by 0.01 / week (Ebbinghaus-inspired).

Bounded `[0.0, 1.0]`. Used by the Roadmap planner to pick the next drill.

---

## 3. Flashcards (FSRS)

### 3.1 Card sources

| Source | Generation |
|---|---|
| Vocabulary cards | seeded from CEFR-J + EVP, plus user's own "missed words" (from L4 feedback) |
| Grammar cards | one per error_taxonomy code, payload: rule + 3 examples + 1 cloze |
| Phoneme cards | per-Uzbek-L1 problematic phoneme: minimal-pair + audio + record-yourself |

Schema in [`15-learning-roadmap.md`](15-learning-roadmap.md) §5.

### 3.2 UI flow

```
┌────────────────────────────────────────────────┐
│   ← Today · 12 of 30 · Streak 14 days  ☼/☾    │
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│              comprehensive                     │
│                                                │
│              [show meaning]                    │
│                                                │
│                                                │
├────────────────────────────────────────────────┤
│  Again 1m   Hard 5m   Good 1d   Easy 3d        │
└────────────────────────────────────────────────┘
```

After "show meaning" is pressed, the back of the card shows: definition (UZ + EN), 1 example sentence, optional audio button, and the four FSRS grade buttons.

Streak: consecutive days with ≥ 1 card practice. Capped UI element on header. No gamification beyond this.

### 3.3 Card endpoints

See [`15-learning-roadmap.md`](15-learning-roadmap.md) §8 (`/me/srs/queue`, `/me/srs/grade`).

---

## 4. AI Conversation Partner (Speaking practice)

A free-form speaking practice mode where the user converses with a Gemini-Live agent on a chosen topic. Per turn, the agent asks one question; the user responds in audio; the agent transcribes, grades the turn, asks a follow-up.

### 4.1 Two implementation modes

| Mode | When | Tech |
|---|---|---|
| **Async** (Phase 2) | default | MediaRecorder upload + Gemini multimodal call per turn |
| **Realtime** (Phase 5) | Pro+ | LiveKit room + Gemini Live agent |

Both produce the same per-turn data structure.

### 4.2 Per-turn data

```json
{
  "session_id": "uuid",
  "turn_index": 4,
  "user_audio_s3_key": "audio-recordings/<session>/4.webm",
  "user_transcript": "Yes I think technology have changed our lives a lot...",
  "agent_response_text": "Interesting point. Could you give a specific example?",
  "agent_audio_url": "...",
  "feedback": {
    "fluency_band_estimate": 6.5,
    "pronunciation_issues": [
      { "code": "pronunciation.consonant_th_unvoiced", "word": "think", "gop": 0.4 }
    ],
    "grammar_issues": [
      { "code": "grammar.subject_verb_agreement", "span": [12, 23] }
    ],
    "lexis_suggestions": [
      { "word": "a lot", "alt": "significantly", "cefr": "B2" }
    ],
    "encouragement_uz": "Aniq misol berishingiz mavzuni mustahkamlaydi.",
    "encouragement_en": "Giving a specific example strengthens the topic."
  }
}
```

Stored in `exam_platform.conversation_sessions` + `exam_platform.conversation_turns`.

### 4.3 Topics

Curated by content team (`data_engine.conversation_topics`):

- IELTS-like Part 2 cue cards (200+).
- "Daily" topics (work, food, hobbies) for warmup.
- "Academic" topics (technology, environment) for Pro practice.

Topic catalogue is filtered by user's CEFR level and target skill.

### 4.4 Session UX

1. User picks a topic (or "Surprise me").
2. Pre-flight mic test.
3. 5–10 turns of dialogue, with a "End session" button always visible.
4. End screen: transcript with all annotations, aggregate fluency/grammar/lexis estimates, button to add weak phonemes / words to FSRS queue.

### 4.5 Cost target

- Gemini multimodal turn: ~$0.02–0.04 (audio input + text output).
- 10-turn session: ~$0.30 — gated by entitlement `practice.conversation.weekly_quota` (Free 0, Starter 30 min/week, Pro unlimited).

---

## 5. Pronunciation Lab

A dedicated surface for phoneme drilling.

### 5.1 Layout

```
┌──────────────────────────────────────────────────┐
│  Pronunciation Lab                                │
├──────────────────────────────────────────────────┤
│  Today: Phoneme /θ/ (voiceless dental fricative) │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  [▶ play canonical]  ▮▮▮▮▯▯▯▯              │  │
│  │  "thanks"                                  │  │
│  │                                            │  │
│  │  [⏺ record]  GOP (last attempt): 0.41 ⚠   │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  Tip: tongue between teeth, blow gentle air      │
│                                                   │
│  Next words: three, think, theatre, both, math   │
└──────────────────────────────────────────────────┘
```

### 5.2 Flow

1. Each session targets one phoneme from the user's "needs work" list (auto-curated from L5 phoneme feedback).
2. User plays the canonical Gemini-TTS pronunciation.
3. User records themselves; client uploads the bytes.
4. Server runs the offline acoustic pipeline (see [`19-audio-analysis-pipeline.md`](19-audio-analysis-pipeline.md)) → returns a per-phoneme GOP for the recorded word.
5. UI shows updated GOP with delta arrow.
6. After 5–10 words, mastery score updates and FSRS reschedules.

### 5.3 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/exam/v1/practice/pronunciation/today` | One phoneme + 5–10 word list |
| POST | `/exam/v1/practice/pronunciation/attempts` | `{phoneme, word, audio_s3_key}` → GOP + verdict |

---

## 6. Cross-cutting

### 6.1 Daily target

The user's `me.preferences.daily_target_minutes` (default 25) drives the size of "today's queue":

- Drills: ~60% of time.
- Flashcards: ~30%.
- Conversation/Pronunciation: ~10%.

When today's queue is empty: a celebratory empty state + nudge to take a mock.

### 6.2 Streaks (light)

Days with ≥ 1 completed activity. Stored in `analytics.events` with type `practice_completed`. Visible in header as a small flame icon + count. **No XP, no level-up sounds, no leaderboards** — keeps the brand calm (per [`08-design-system.md`](08-design-system.md) §1).

### 6.3 Offline support (Phase 5)

PWA + IndexedDB for flashcards. Drill completion synced when online. Out of MVP scope.

---

## 7. Acceptance

- [ ] User with detected weakness `grammar.subject_verb_agreement` sees a relevant drill in `/practice/today` within 24h of an attempt.
- [ ] FSRS queue is non-empty for any user with ≥ 5 graded cards.
- [ ] Conversation session persists turns; reloading the page resumes mid-conversation.
- [ ] Phoneme lab shows updated GOP within 5s of recording stop.
- [ ] Free user attempting Conversation Partner gets the upgrade modal.
- [ ] Mastery score for a code increases after 3 correct drill items targeting it.
