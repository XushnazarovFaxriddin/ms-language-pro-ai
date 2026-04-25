# ADR DE-0005 — Multi-jury validation (3 LLMs)

- **Status**: Accepted
- **Date**: 2026-04-26

## Context
LLM-generated questions must be validated before publishing. Single-LLM validation is biased (same model can rationalize its own errors).

## Decision
**3 independent LLM "jurors"** vote on each generated question:

| Juror | Model | Why |
|---|---|---|
| 1 | `gemini-2.5-flash` | Fast, cheap baseline |
| 2 | `gemini-2.0-flash` | Different generation cutoff for diversity |
| 3 | `gemini-2.5-pro` | High-quality tiebreaker |

Verdict per juror: `approve | reject | borderline`, with reasoning.

## Decision rule
- **All 3 approve**: `status = 'approved'`
- **2/3 approve**: `status = 'needs_review'` (human admin decides)
- **0-1 approve**: `status = 'rejected_jury'`

## Validation criteria (rubric in prompt)
1. Linguistic correctness (grammar, register)
2. Single unambiguous correct answer (for MCQ)
3. Distractors plausible but clearly wrong
4. Target CEFR level matches text complexity
5. No duplicate-of-stem in options
6. No cultural / political sensitivity issues

## Diversity caveat
All 3 jurors are Google Gemini family — limited true diversity. Mitigation:
- Vary temperature: 0.0 for jurors 1,2; 0.3 for juror 3
- Different prompt versions if needed
- Future: Juror 3 could swap to `JUROR_3_BASE_URL` (e.g., another OpenAI-compat provider) for cross-vendor diversity if thesis chapter benefits

## Metrics for thesis (E2 in evaluation plan)
- Pairwise Cohen's κ across 100 questions
- Fleiss κ (3 raters)
- % unanimous decisions
- False-positive rate (approved but later flagged by human)
