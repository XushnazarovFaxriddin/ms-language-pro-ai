# 05 — Scoring Pipeline

## Synchronous vs async

| Item type | Mode | Why |
|---|---|---|
| MCQ, T/F/NG, matching, completion | Sync | Just key compare |
| Writing Task 1, Task 2 | Async (arq) | LLM call, ~10s |
| Speaking Part 1, 2, 3 | Async (arq) | Multimodal LLM, ~20-30s |

## Sync grading (objective items)
```python
# services/scoring/objective.py
async def grade_objective(response, answer_key):
    if response.type == "mcq_single":
        is_correct = response.mcq_choice_id == answer_key.correct_option_id
    elif response.type == "matching":
        is_correct = sorted(response.pairs) == sorted(answer_key.pairs)
    # ...
    return GradingResult(is_correct, partial_credit=0 or 1)
```

## Writing pipeline
```
attempt_responses (essay text)
  ↓ enqueue score_writing
arq job:
  → fetch rubric from data-engine /v1/rubrics/writing/{level}
  → LLMRouter.complete(
        purpose="score_writing",
        prompt_id="score_writing/ielts/v1",
        variables={essay, rubric, task_type, target_band},
        response_schema=WritingScore  # 4 criteria + overall + feedback_uz/en + confidence
    )
  → write llm_scoring_runs
  → if confidence < 0.7 OR (max(criteria) - min(criteria)) > 1.5:
        enqueue human_review (status='pending_human')
    else:
        write scoring_results (source='llm', finalized_at=now())
  → SSE notify client
```

### `WritingScore` schema
```python
class WritingScore(BaseModel):
    task_response: float            # 0..9, 0.5 increments
    coherence_cohesion: float
    lexical_resource: float
    grammatical_range_accuracy: float
    overall_band: float             # avg, half-rounded
    evidence_quotes: list[str]      # quotes from essay supporting each criterion
    feedback_uz: str
    feedback_en: str
    confidence: float               # 0..1, LLM self-assessment
```

## Speaking pipeline (async, MVP)
```
attempt_responses (audio_s3_key)
  ↓ enqueue score_speaking
arq job:
  → download audio from S3
  → ffmpeg -i input -ac 1 -ar 16000 -f wav output
  → compute audio metadata: duration, words/min (after STT), pause_ratio (silence detection)
  → LLMRouter.complete(
        purpose="score_speaking",
        prompt_id="score_speaking/ielts/v1",
        variables={rubric, target_band, audio_metadata},
        audio_input=wav_bytes,           # Gemini multimodal
        response_schema=SpeakingScore    # transcript + 4 criteria + overall + feedback + confidence
    )
  → write transcripts (extracted from response)
  → write llm_scoring_runs
  → confidence gate (same as writing)
  → SSE notify
```

### `SpeakingScore` schema
```python
class SpeakingScore(BaseModel):
    transcript: str
    fluency_coherence: float
    lexical_resource: float
    grammatical_range_accuracy: float
    pronunciation: float
    overall_band: float
    audio_metadata: AudioMeta  # duration, wpm, pause_ratio (computed locally)
    feedback_uz: str
    feedback_en: str
    confidence: float
```

## Confidence gate
- `confidence < 0.7` → human review
- `max(criteria) - min(criteria) > 1.5` → human review (criteria spread suspicious)
- Both pass → auto-finalize

## Human review override
Examiner views queue, reads essay/listens to audio, can edit any criterion. Final `scoring_results.source = 'human'` or `'hybrid'` (if accepted some LLM scores).

## Cost & latency targets
- Writing: <$0.02/essay, p95 < 20s
- Speaking: <$0.04/audio, p95 < 30s
- Total per attempt (mini-IELTS): <$0.50

## Files
- `services/scoring/writing.py`
- `services/scoring/speaking.py`
- `services/scoring/objective.py`
- `services/scoring/confidence.py` — gate logic
- `jobs/scoring.py` — arq job definitions
- `prompts/score_writing/ielts/v1.yaml`
- `prompts/score_speaking/ielts/v1.yaml`
