# 13 — Skills Deep (full IELTS implementation)

> **TL;DR.** Production-grade implementation of all four IELTS skills. **Reading**: 14 question types, multi-passage sections, anchor-passage memory. **Listening**: 4-part progression (single → conversation → monologue → academic), accent rotation, real-time captions toggle, single-play strict. **Writing**: Task 1 (Academic graph/chart, General letter), Task 2 (essay), TipTap editor with anti-cheat, async grading, sentence-level annotations. **Speaking**: 3-part interview, MediaRecorder upload + (Phase 5) realtime LiveKit, multimodal Gemini grading with phoneme-level breakdown. All four skills feed the unified Feedback Engine ([`14-feedback-engine.md`](14-feedback-engine.md)) and Learning Roadmap ([`15-learning-roadmap.md`](15-learning-roadmap.md)).

---

## 1. Reading

### 1.1 Question types (14 supported)

| Code | Type | Layout | Example |
|---|---|---|---|
| `mcq_single` | Single-answer MCQ | passage + 4 options | "What does the author mean by…?" |
| `mcq_multi` | Multi-answer MCQ | passage + 5–7 options, pick 2/3 | "Choose **two** items the writer recommends" |
| `true_false_ng` | True / False / Not Given | statement list | factual claims |
| `yes_no_ng` | Yes / No / Not Given | statement list | author's views |
| `matching_features` | Match items to feature list | drag-drop or dropdown | "Match each researcher to a finding" |
| `matching_headings` | Match paragraphs to headings | dropdown per paragraph | "Match heading i–vii to paragraphs A–E" |
| `matching_information` | Locate info in paragraphs | dropdown | "Which paragraph contains a definition?" |
| `matching_sentence_endings` | Sentence completion via match | dropdown | "Complete each sentence with the correct ending" |
| `sentence_completion` | Fill blanks (text from passage) | text inputs | "The first ___ was developed in 1845" |
| `summary_completion` | Complete a paragraph summary | text or dropdown | constrained word list |
| `note_completion` | Complete bulleted notes | text inputs | "• ___ caused the decline" |
| `table_completion` | Fill cells in a table | grid inputs | structured data |
| `flow_chart_completion` | Fill steps in a flow chart | inputs in nodes | process descriptions |
| `short_answer` | Free-text answer (≤ 3 words) | text input | "What is the colour mentioned?" |

Each type has its own renderer in `apps/exam-platform-web/src/features/exam-runner/items/<type>.tsx`. All implement the same `ItemRenderer` interface (`onSubmit(answer)`, `getValid()`).

### 1.2 Reading section structure

- **Academic Reading**: 3 passages, 13–14 questions each, 60-minute total budget.
- **General Training Reading**: 3 sections (everyday → workplace → academic).
- **Mini Reading**: 1 passage, 5–10 questions, 10–15 min.

A `reading_passage` item is the **parent** for grouped MCQ / completion children. The runner shows the passage on the left, current child question on the right (split-pane on desktop, tabs on mobile). Children share the same parent's `passage_id` so `data_engine` keeps them clustered for IRT calibration.

Persistence: when the user moves between child questions in the same passage, the passage stays mounted (not refetched) for instant scroll restoration.

### 1.3 Reading grading

- **MCQ / matching / TF/NG**: hard-keyed (`is_correct = answer == answer_key`).
- **Completion / short answer**: tolerant matching:
  - case-insensitive
  - whitespace normalised
  - up to 1 typo (Levenshtein distance ≤ 1) **only** if `data_engine.questions.answer_key.allow_typo = true`
  - synonym lists in the answer key (`accepted: ["car", "automobile"]`)

The matching code lives in `apps/exam-platform-api/src/exam_platform/services/grading/objective.py`.

### 1.4 IRT integration

Reading passages with their child questions are calibrated as a **bundle**: passage difficulty contributes a shared additive offset, individual children get their own `b`. The selector picks **whole passages**, not individual questions, then walks all children. See [`18-research-and-psychometrics.md`](18-research-and-psychometrics.md) §4 for testlet IRT.

### 1.5 Anti-cheat

- Right-click + text selection allowed (real test allows highlighting on paper).
- Copy-paste **into** an answer field is blocked and logged.
- DevTools detection out of scope (false-positives high; we rely on AI-resistant question variability instead).

---

## 2. Listening

### 2.1 Section structure (matches real IELTS)

| Part | Context | Speakers | Style |
|---|---|---|---|
| 1 | Everyday social (e.g. accommodation enquiry) | 2 (conversation) | form completion, table |
| 2 | Everyday monologue (e.g. tour guide) | 1 | maps, MCQ |
| 3 | Academic conversation (students + tutor) | 2–4 | matching, MCQ |
| 4 | Academic lecture | 1 | note completion |

### 2.2 Audio sources

- **Phase 1**: Gemini TTS (`gemini-2.5-flash-preview-tts`) — single voice → expand to multi-voice.
- **Phase 2**: multi-speaker dialogue with named voices (Kore, Puck, Aoede, Charon, Fenrir, Orus, Zephyr — Gemini built-in).
- **Phase 3**: variety of accents — Gemini supports voice variants; we tag each item with `audio_meta.accent` (e.g. `en-US`, `en-GB`, `en-AU`).

### 2.3 Single-play enforcement (strict)

```ts
// ListeningPlayer.tsx (excerpt)
<audio
  ref={audio}
  src={audioUrl}
  preload="auto"
  controlsList="noplaybackrate nodownload"
  onPlay={() => store.markPlaying(itemId)}
  onEnded={() => store.markPlayed(itemId)}
  onSeeking={(e) => { if (audio.current) audio.current.currentTime = lastTime.current; }}
  onTimeUpdate={() => { lastTime.current = audio.current!.currentTime; }}
/>
```

- No native controls. Click-to-play once. Seek attempts are reset to last known position.
- After `ended`, audio element unmounts and shows "Audio finished".
- Server enforces too: `data_engine.questions.payload.single_play=true` is checked at submission time; submitting after `audio_played_count > 1` invalidates the response.

### 2.4 Captions toggle (accessibility)

- The user can enable captions before playback **only** in Practice Mode.
- In Exam Mode captions are hidden — even though the transcript exists in DB (`data_engine.questions.payload.transcript`), the API serves it only when `mode=practice`.

### 2.5 Listening grading

Same as Reading (objective). Tolerant matching for completion items. Time penalty: questions answered after the audio finishes within the standard 30-second buffer are accepted; afterwards they are marked late and partial-credit downgraded by 0.5 per skill band.

---

## 3. Writing

### 3.1 Tasks

| Task | Type | Word count | Time | Weight |
|---|---|---|---|---|
| Task 1 Academic | describe a graph / chart / process / map | ≥ 150 | 20 min | 1× |
| Task 1 General | semi-formal letter | ≥ 150 | 20 min | 1× |
| Task 2 | argumentative essay | ≥ 250 | 40 min | 2× |

Final writing band: `(Task1_band × 1 + Task2_band × 2) / 3`, rounded to nearest 0.5.

### 3.2 Editor (TipTap)

```tsx
// features/exam-runner/items/writing-task2.tsx
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: false, codeBlock: false }),
    CharacterCount.configure({ limit: 2000 }),
    Placeholder.configure({ placeholder: t('Runner.writing.placeholder') }),
  ],
  editorProps: {
    handlePaste: () => true,            // block paste (logged)
    handleDrop: () => true,              // block drag-drop
    attributes: { class: 'prose dark:prose-invert max-w-none focus:outline-none', 'aria-label': t('Runner.writing.editor') },
  },
  onUpdate: throttle(({ editor }) => {
    autosave(attemptId, itemId, editor.getText());
  }, 5000),
  onBlur: () => recordEvent('writing.focus_lost'),
  onFocus: () => recordEvent('writing.focus_gained'),
});
```

- Character + word count live in header.
- Word count <required → indicator goes warning.
- Auto-save every 5s via Server Action (idempotent `PATCH /attempts/{id}/responses/{rid}/draft`).
- On submit: full text persisted, async `score_writing` job enqueued.

### 3.3 Writing scoring (high level)

`score_writing` arq job → Gemini 2.5-pro → `WritingScore` schema (4 IELTS criteria + overall + bilingual feedback + confidence). See [`06-ai-pipelines.md`](06-ai-pipelines.md) §8 for the prompt and [`14-feedback-engine.md`](14-feedback-engine.md) §3 for what the user sees.

The runtime ALSO produces:

- **Sentence-level annotations** (see [`20-text-analysis-pipeline.md`](20-text-analysis-pipeline.md) §3): grammar errors, register shifts, weak collocations, suggested upgrades.
- **Paragraph structure analysis**: introduction / body / conclusion detection; topic-sentence quality.
- **Lexical metrics**: TTR, MTLD, CEFR-J coverage, academic-word-list (AWL) coverage.

These travel along with the band score and power the Roadmap ([`15-learning-roadmap.md`](15-learning-roadmap.md)).

---

## 4. Speaking

### 4.1 Parts (matches real IELTS)

| Part | Format | Duration |
|---|---|---|
| 1 | examiner asks 4–5 introductory questions | 4–5 min |
| 2 | cue card → 1-min preparation → 1–2-min monologue | 3–4 min |
| 3 | discussion related to Part 2 topic | 4–5 min |

Total: 11–14 minutes.

### 4.2 Phase 1 — async upload (MVP)

User flow:
1. Pre-flight mic test page checks permission + records 3-second clip + plays back.
2. ExamRunner shows the question; user clicks **Record** when ready.
3. MediaRecorder captures `audio/webm;codecs=opus` 64 kbps.
4. **Stop** → presigned PUT to MinIO/S3 → submit response with `audio_s3_key`.
5. arq `score_speaking` runs:
   - download audio
   - ffmpeg → 16 kHz mono WAV
   - compute audio metadata (duration, WPM, pause ratio) — see [`19-audio-analysis-pipeline.md`](19-audio-analysis-pipeline.md)
   - one Gemini multimodal call → transcript + 4-criteria bands + feedback + confidence
   - writes `transcripts`, `llm_scoring_runs`, `scoring_results`

### 4.3 Phase 5 — realtime (LiveKit + Gemini Live)

- Browser joins a LiveKit room with the AI examiner agent.
- Continuous audio stream → Gemini Live → real examiner-style follow-up questions.
- On finish, the room recording is exported and scored exactly like async (same pipeline reused).
- Schema unchanged; only the ingestion adapter swaps.

### 4.4 Real-time UI elements

- **MicLevel** waveform (Web Audio AnalyserNode) — animated bars, instantly visible if mic is muted.
- **Countdown** for Part 2 cue card (1 min prep) and speaking (1–2 min).
- **Stop early** allowed at any time; minimum 30 s for Part 1 / 60 s for Part 2 / 30 s for Part 3 — under-minimum responses cap the band at 5.0 with a feedback note.

### 4.5 Speaking analysis depth (dissertation-grade)

The single Gemini multimodal call returns the structured score. **In addition**, we run a parallel offline analysis (`exam-worker`, async, after scoring lands) producing:

- Phoneme-level GOP (Goodness-of-Pronunciation) per word.
- Filler words (`um`, `er`, `you know`) frequency.
- Pause distribution histogram.
- Speech-rate volatility (sigma of WPM in 5-second windows).
- Pitch variation (F0 std).
- Stress placement check on multi-syllable lexis.

These metrics feed the Feedback Engine and the Roadmap. Full method: [`19-audio-analysis-pipeline.md`](19-audio-analysis-pipeline.md).

---

## 5. Cross-skill features

### 5.1 Section navigation rules

- Reading / Listening: cannot revisit answered items in **Exam Mode** (real-IELTS rule). In **Practice Mode** any item can be revisited.
- Writing / Speaking: each task is locked once submitted; no edits.
- Section-level submit confirmation: "Are you sure? You cannot return to this section."

### 5.2 Score conversion

- Each skill produces a band (0.0–9.0 in 0.5 steps).
- Listening + Reading raw scores convert to band via the IELTS published table (configurable in `data_engine.exam_blueprints.score_conversion`).
- Writing + Speaking come pre-banded from the AI grader.
- **Overall band** = mean of 4 skill bands, rounded half-up to 0.5 (per IELTS).

### 5.3 Test variants

| Blueprint code | Variant | Description |
|---|---|---|
| `ielts_academic_full` | full Academic test | all 4 skills, ~2h45m |
| `ielts_general_full` | full General Training | letter instead of graph |
| `ielts_academic_quick` | shortened (1 hour) | 2 reading passages, 1 listening section, 1 writing task, 1 speaking part |
| `ielts_skill_<X>` | single-skill mock | for targeted practice |
| `cefr_quick_placement` | 8-minute screener | 3-question CAT |

### 5.4 Acceptance

- [ ] All 14 reading question types render and grade correctly.
- [ ] Single-play listening cannot be replayed via DevTools without invalidating the response.
- [ ] Writing autosave survives a hard reload (sessionStorage + server draft).
- [ ] Speaking under-minimum response is band-capped at 5.0.
- [ ] Overall band aggregation matches IELTS official conversion on a 50-attempt regression set.
- [ ] Practice Mode unlocks captions + revisit + slow-speed audio (0.85×–1.25×).
