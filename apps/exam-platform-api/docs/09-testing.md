# 09 — Testing

## Layout
```
tests/
├── unit/
│   ├── services/
│   │   ├── test_scoring_writing.py
│   │   ├── test_scoring_speaking.py
│   │   ├── test_adaptive_theta.py
│   │   └── test_confidence_gate.py
│   ├── domain/
│   └── adapters/
├── integration/
│   ├── api/
│   │   ├── test_attempts.py
│   │   ├── test_responses.py
│   │   └── test_results.py
│   └── jobs/
│       ├── test_score_writing_job.py
│       └── test_score_speaking_job.py
├── e2e/
│   └── test_full_attempt.py
└── conftest.py
```

## Fixtures
- `pg`, `db_session`, `client`, `auth_headers` — same as data-engine
- `mock_data_engine` — `respx` mock of data-engine HTTP API; returns canned items/keys
- `mock_llm` — same as data-engine; for writing/speaking scoring
- `sample_audio_wav` — 3-second test audio file fixture
- `sample_essay` — 250-word IELTS-style essay fixture

## Patterns

### Theta update unit test
```python
def test_theta_update_correct_easy_item():
    # easy item (b=-1), correct → theta increases
    theta, se = update_theta(0.0, 1.0, a=1.0, b=-1.0, c=0.25, was_correct=True)
    assert theta > 0.0
    assert se < 1.0
```

### Scoring with mocked LLM
```python
async def test_score_writing(mock_llm, db_session):
    response = await db_session.create_response(essay="...")
    mock_llm.add_response(purpose="score_writing", output=WritingScore(
        task_response=7.0, coherence_cohesion=7.5, lexical_resource=6.5,
        grammatical_range_accuracy=7.0, overall_band=7.0,
        feedback_uz="...", feedback_en="...", confidence=0.85, evidence_quotes=[]
    ))
    await score_writing(response.id)
    result = await db_session.get_scoring_result(response.id)
    assert result.band == 7.0
    assert result.source == "llm"
```

### Confidence gate
```python
def test_low_confidence_routes_to_human():
    score = WritingScore(..., confidence=0.5, ...)
    decision = confidence_gate(score)
    assert decision.action == "human_review"
```

### E2E (Playwright) — full attempt happy path
```python
# In packages/contracts/e2e/exam-runner.spec.ts (TS test file)
test('full reading attempt completes', async ({ page }) => {
    await page.goto('/exams');
    await page.click('text=IELTS Academic');
    await page.click('text=Start');
    for (let i = 0; i < 13; i++) {
        await page.click('[role=radio]:first-child');
        await page.click('text=Next');
    }
    await page.click('text=Finish Section');
    await expect(page.locator('text=Section complete')).toBeVisible();
});
```

## Coverage targets
- ≥80% on `services/`
- E2E: at least 1 happy path per skill (Reading, Writing, Speaking, Listening)

## CI
- Unit + integration on every PR
- E2E smoke (Reading) on every PR
- Full E2E (all 4 sections) nightly

## Load (k6)
- Target: 50 concurrent attempts, p95 nav <500ms, p95 LLM scoring <20s
- Script: `tests/k6/concurrent-attempts.js`
- Run weekly + before pilot launch
