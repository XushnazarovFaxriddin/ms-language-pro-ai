# ADR DE-0004 — pgvector for embeddings (vs Qdrant)

- **Status**: Accepted
- **Date**: 2026-04-26
- **Refines**: `/docs/adr/0002-postgres-pgvector.md`

## Why here too
Repo-level ADR covers the decision. This file documents data-engine-specific implementation:

## Schema
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE data_engine.question_embeddings (
    question_id UUID PRIMARY KEY REFERENCES data_engine.questions(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON data_engine.question_embeddings USING hnsw (embedding vector_cosine_ops);
```

## Dedup query
```sql
SELECT q.id, 1 - (e.embedding <=> $1) AS similarity
FROM data_engine.questions q
JOIN data_engine.question_embeddings e ON e.question_id = q.id
WHERE q.skill_id = $2 AND q.status = 'approved'
ORDER BY e.embedding <=> $1
LIMIT 5;
```
Threshold for duplicate: `similarity > 0.92` (i.e., cosine_distance < 0.08).

## Tuning
- HNSW params: `m=16` (default), `ef_construction=64` (default), `ef_search=40` (set per query)
- Benchmark in week 4 with 500 embeddings: target recall@5 > 0.95

## Embedding model
`gemini-embedding-001` (Gemini, 768-dim). One row per question. Re-embedding triggered if model upgrades (`embedding_model` column tracks).
