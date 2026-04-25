# 08 — Testing

## Layout
```
tests/
├── unit/
│   ├── services/
│   │   ├── test_generator.py
│   │   ├── test_jury.py
│   │   ├── test_cefr_classifier.py
│   │   ├── test_dedup.py
│   │   └── test_calibration.py
│   ├── domain/
│   └── adapters/
├── integration/
│   ├── api/
│   │   ├── test_items.py        # full HTTP via httpx + testclient
│   │   ├── test_generation.py
│   │   └── test_admin.py
│   └── jobs/
│       └── test_generate_batch.py
├── e2e/
│   └── test_full_generation.py  # nightly: real Gemini, real DB
├── conftest.py                   # fixtures
└── factories.py                  # factory_boy
```

## Fixtures (`conftest.py`)
- `pg` — testcontainers Postgres (per-session)
- `db_session` — async session, rollback per-test
- `client` — `httpx.AsyncClient` against FastAPI app
- `auth_headers` — JWT cookie for fake user with role
- `mock_llm` — `respx` mock for openai SDK calls (default; override per test for real)
- `seed_taxonomies` — auto-seed CEFR levels, skills, sections

## Patterns

### Unit test — pure service
```python
async def test_cold_start_b():
    assert cold_start_b(5) == 0.0
    assert cold_start_b(1) == -3.0
    assert cold_start_b(9) == 3.0
```

### Service with mocked LLM
```python
async def test_generate_one(mock_llm, db_session):
    mock_llm.add_response(purpose="generate_question",
                          output=QuestionDraft(...))
    mock_llm.add_response(purpose="embed", output=[0.1]*768)
    result = await generate_one(spec=GenerationSpec(skill="reading", level="B2"))
    assert result.status in ("approved", "needs_review")
```

### Integration test — HTTP
```python
async def test_get_next_item_s2s(client, seed_questions, s2s_token):
    r = await client.get("/v1/items/next?theta=0&skill=reading",
                         headers={"Authorization": f"Bearer {s2s_token}"})
    assert r.status_code == 200
    assert "answer_key" not in r.json()["item"]
```

### Contract test (with exam-platform)
- `tests/contracts/test_data_engine_provider.py` — pact-style
- Run on every PR; consumer (exam-platform) publishes expectations to a shared `pacts/` directory

## Coverage policy
- ≥80% on `services/`, `domain/`
- 60% acceptable on `adapters/` (covered by integration)
- `api/` measured via integration tests

## Commands
```bash
uv run pytest                           # all
uv run pytest -k generation             # by name
uv run pytest --cov --cov-report=html   # coverage report
uv run pytest -m "not e2e"              # skip nightly
uv run pytest tests/integration/        # integration only
```

## CI
- PR: unit + integration + contract (with mocks)
- Nightly: e2e (real Gemini, with throttle)
- Block merge if coverage drops >2%

## Acceptance
- [ ] All test suites runnable from repo root via `pnpm test:py` (calls uv pytest)
- [ ] CI passes in <8 min for unit+integration
- [ ] Coverage gate enforced
