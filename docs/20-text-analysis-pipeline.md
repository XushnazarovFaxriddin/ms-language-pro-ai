# 20 — Text Analysis Pipeline

> **TL;DR.** Writing essays go through a deterministic linguistic pipeline producing per-sentence and per-word feature sets that feed the Feedback Engine ([`14`](14-feedback-engine.md)). Stages: tokenise → POS tag → dependency parse → grammar check → vocabulary analysis → cohesion analysis → semantic coherence → Gemini structured grading. Built on **spaCy** (en_core_web_trf) + **language-tool-python** + custom error-taxonomy mapper. Idempotent; each stage's output stored as `feedback_artifacts`.

---

## 1. Pipeline overview

```
[essay text]
   │
   ├─ spaCy en_core_web_trf
   │     - sentence split, tokenise, POS, dep parse, NER
   │
   ├─ language-tool-python (LanguageTool 6+ self-hosted)
   │     - grammar / spelling / style errors with rule IDs
   │
   ├─ vocabulary analyser
   │     - CEFR-J + EVP lookup per token
   │     - TTR, MTLD, AWL coverage
   │
   ├─ cohesion analyser
   │     - cohesive devices (linking words) detected
   │     - sentence-to-paragraph mapping
   │
   ├─ semantic coherence
   │     - sentence embeddings (gemini-embedding-001)
   │     - intra-paragraph similarity, paragraph-to-prompt similarity
   │
   ├─ error-taxonomy mapper
   │     - LanguageTool ruleId → error_taxonomy.code
   │
   └─ Gemini structured grading (already covered in 06-, 14-)
        - WritingScore + sentence rewrite + word upgrades
   │
   ▼
[persist] feedback_artifacts(sentence/word/criterion/...)
```

---

## 2. Stage 1 — spaCy

```python
import spacy
nlp = spacy.load("en_core_web_trf")

doc = nlp(essay_text)
sentences = [
    {
        "index": i,
        "char_range": (s.start_char, s.end_char),
        "text": s.text,
        "tokens": [
            {"text": t.text, "lemma": t.lemma_, "pos": t.pos_,
             "tag": t.tag_, "dep": t.dep_, "is_stop": t.is_stop}
            for t in s
        ],
    }
    for i, s in enumerate(doc.sents)
]
```

`en_core_web_trf` is RoBERTa-based; 300 MB but state-of-the-art on syntax. Falls back to `en_core_web_sm` (50 MB) if memory-constrained.

Outputs cached in `feedback_artifacts(layer='spacy_doc')` as compact JSON.

---

## 3. Stage 2 — Grammar & spelling (LanguageTool)

LanguageTool 6+ self-hosted via `languagetool-python`. Returns rule-based matches:

```python
import language_tool_python
tool = language_tool_python.LanguageToolPublicAPI('en-US')   # or self-hosted
matches = tool.check(essay_text)
# match: ruleId, message, offset, length, replacements, category
```

We post-process:

- Filter category `STYLE` to high-confidence rules only (avoid noise).
- Resolve replacements to a single suggestion via heuristic (shortest, most-frequent).
- Map `ruleId` → our `error_taxonomy.code` via a curated `language_tool_mapping.yaml`:

```yaml
EN_A_VS_AN: grammar.article_misuse
SUBJECT_VERB_AGREEMENT: grammar.subject_verb_agreement
COLLOCATION: lexis.collocation
COMMA_PARENTHESIS_WHITESPACE: punctuation.comma
HE_VERB_AGR: grammar.subject_verb_agreement
...
```

Coverage target: 70% of LanguageTool errors mapped to our taxonomy. Unmapped ones still surface in feedback as raw rule descriptions (with i18n label).

---

## 4. Stage 3 — Vocabulary analysis

Per token (excluding stopwords):

- Look up CEFR level from `data_engine.taxonomies.cefr_words` (seeded from CEFR-J).
- Mark academic words (AWL inclusion).
- Compute essay-level metrics:

| Metric | Formula |
|---|---|
| TTR | unique tokens / total tokens |
| MTLD | sliding TTR with threshold 0.72 (more robust than TTR for length variation) |
| Mean word length | chars / token |
| AWL coverage | unique AWL words / total unique academic-eligible tokens |
| CEFR distribution | histogram across A1..C2 |

Identify weak words for upgrade suggestions:
- Frequently-used and CEFR ≤ A2 (e.g. "good" used 5 times).
- High-band rubric requires C1+ vocabulary; these become L4 word-upgrade candidates.

---

## 5. Stage 4 — Cohesion analysis

Detect cohesive devices:

| Type | Examples |
|---|---|
| Additive | "moreover", "furthermore", "in addition" |
| Adversative | "however", "on the other hand", "nevertheless" |
| Causal | "therefore", "consequently", "as a result" |
| Sequential | "firstly", "next", "finally" |
| Reference | pronoun chains, demonstratives ("this", "those") |

A small lexicon (`cohesive_devices.yaml`) plus dep-parse heuristics counts per category.

Per-paragraph features:

- Cohesive device count.
- Topic sentence detection: first sentence's similarity to the paragraph's centroid embedding (high → topic sentence works).
- Paragraph length (sentences + words).

---

## 6. Stage 5 — Semantic coherence

Compute sentence embeddings via `router.embed(text, dimensions=768)` (Gemini).

Metrics:

- **Intra-paragraph coherence**: mean cosine similarity of consecutive sentence embeddings within a paragraph. Low → "Your paragraph jumps between unrelated ideas".
- **Paragraph-to-prompt similarity**: each paragraph centroid vs the task prompt embedding. Off-topic paragraphs flagged.
- **Topic drift**: variance of paragraph centroids across the essay. Too high → unfocused.

Embeddings cached for 24 h.

---

## 7. Stage 6 — Error-taxonomy aggregation

Collect detected issues from §3 (LanguageTool) + §5 (semantic) + §4 (cohesion).

For each issue: `(error_code, severity, char_range, sentence_index, suggested_fix)`.

Persisted as:

```json
// feedback_artifacts(layer='sentence', skill='writing')
{
  "annotations": [
    {
      "sentence_index": 7,
      "char_range": [240, 278],
      "issues": [
        { "code": "grammar.partitive_of", "span": [5,13], "severity": "major",
          "rule_id": "MANY_OF_PEOPLE", "fix": "Many people" }
      ],
      "suggested_rewrite_uz": "...",
      "suggested_rewrite_en": "..."
    }
  ]
}
```

---

## 8. Stage 7 — Gemini structured grading

Already covered in [`06-`](06-ai-pipelines.md) §8. Receives the essay + the rubric; produces `WritingScore` (4 IELTS criteria + bilingual feedback + confidence).

In addition, we feed the linguistic stats from §3–§6 as structured context so the model has objective metrics to anchor its bands:

```python
LLMRequest(
    purpose="score_writing",
    variables={
        "essay": text,
        "task_prompt": task,
        "rubric": rubric,
        "target_band": target,
        "linguistic_stats": {
            "ttr": 0.62, "mtld": 78,
            "cefr_distribution": {"A1": 0.42, "A2": 0.28, "B1": 0.18, "B2": 0.10, "C1": 0.02, "C2": 0.0},
            "awl_coverage": 0.07,
            "cohesive_device_count_per_paragraph": [3, 1, 2, 3],
            "intra_paragraph_coherence": 0.72,
            "errors_by_category": {"grammar": 7, "lexis": 3, "punctuation": 4}
        }
    },
    response_schema=WritingScore
)
```

This anchoring reduces grade variance — the model can't claim "rich vocabulary" when TTR is 0.62 and the CEFR histogram is 70% A1-A2.

---

## 9. Per-language packs

Future expansion to other languages (Russian, Arabic) requires:

- spaCy model for the language (or an alternative like Stanza).
- LanguageTool language pack.
- CEFR word list for the language.
- Translated error_taxonomy entries.

Phase-gated to Phase 5+.

---

## 10. Performance targets

| Stage | p95 (250-word essay) |
|---|---|
| spaCy trf | 0.6 s |
| LanguageTool | 0.4 s |
| Vocabulary | 0.05 s |
| Cohesion | 0.05 s |
| Embeddings (5–10 sentences) | 1.5 s (LLMRouter, often cached) |
| Gemini grading | 10–18 s |
| **Total** | **≤ 22 s p95** |

---

## 11. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/exam/v1/responses/{id}/text-analysis` | full layer outputs |
| GET | `/exam/v1/responses/{id}/sentence-feedback` | layer=sentence only |
| GET | `/exam/v1/responses/{id}/word-upgrades` | layer=word only |

---

## 12. Acceptance

- [ ] A 250-word essay completes the pipeline in ≤ 22 s p95.
- [ ] LanguageTool → error_taxonomy mapping covers ≥ 70% of detected issues.
- [ ] TTR / MTLD computed values match a reference implementation (lexical-diversity Python lib) within rounding.
- [ ] AWL coverage on an essay containing exactly 10 known AWL words returns ≥ 9/10 detection.
- [ ] Semantic coherence flags an off-topic paragraph (manually injected) with ≥ 0.8 recall.
- [ ] Linguistic stats included in the Gemini prompt reduce overall band variance by ≥ 10% on a 30-essay regression set.
- [ ] All annotations persist with both UZ and EN strings populated.
