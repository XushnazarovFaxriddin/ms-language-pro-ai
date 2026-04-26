# `classify_cefr/generic/v1`

**Purpose**: classify the CEFR level of a given English text. Used during question generation (validate level matches target) and for the future "what's my CEFR level?" placement screener.

**Model profile**: `LLM_PROFILE_CLASSIFY_CEFR` (default `gemini-2.5-flash:0.0` — fast + cheap).
**Response schema**: `data_engine.schemas.CefrClassification`.

## Runtime YAML

```yaml
purpose: classify_cefr
sub_purpose: generic
version: 1
status: active
description: Classify the CEFR level of a given English text.

variables_schema:
  text: { type: string }

response_schema_ref: data_engine.schemas.CefrClassification

system: |
  You are a CEFR text classifier. Assess vocabulary range, grammatical complexity,
  cohesion, and topic abstractness against the CEFR scale (A1, A2, B1, B2, C1, C2).
  Output JSON only.

user: |
  Classify the CEFR level of this text.

  Text:
  {{ text }}

  Return JSON:
  {
    "actual_level": "A1|A2|B1|B2|C1|C2",
    "confidence": 0.0-1.0,
    "evidence": "one sentence pointing to specific lexical/grammatical features"
  }
```

## Pydantic schema

```python
class CefrClassification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actual_level: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str
```

## Future enhancement (Phase 3)

Hybrid mode: combine LLM verdict with rule-based scoring against CEFR-J wordlist + EVP, weighted average. Target accuracy ≥ 90% on a 200-text gold set.
