# ADR 0002 — PostgreSQL + pgvector (vs. Separate Vector DB)

- **Status**: Accepted
- **Date**: 2026-04-26
- **Deciders**: Bobomurod, Faxriddin

## Context

We need vector storage for:
1. **Question deduplication** in data-engine: cosine similarity search over generated questions to reject near-duplicates (threshold > 0.92).
2. **Semantic search** for content admins: find questions by meaning, not keywords.
3. **(Future)** AI memory for adaptive feedback: retrieve a student's past errors.

Embeddings: Gemini `text-embedding-004` → 768-dim vectors.

Expected scale by end of Year 1: ~10k–50k questions × 1 embedding each. With student responses included, possibly 200k vectors.

## Considered options

| Option | Pros | Cons |
|---|---|---|
| **A. PostgreSQL 17 + pgvector** | Single DB, ACID, joins between vectors and metadata, single backup | HNSW recall slightly lower than dedicated vector DB at >10M scale |
| B. Qdrant (separate) | Best-in-class vector perf, horizontal scaling | Extra service, extra Docker, separate backup, distributed transaction complexity |
| C. Weaviate | GraphQL + hybrid search | Same downsides as Qdrant for our scale |
| D. Pinecone (cloud) | Managed, zero-ops | $$$, vendor lock, data residency concerns |
| E. Milvus | Powerful, but heavyweight | Overkill for 50k vectors |

## Decision

**Option A**: PostgreSQL 17 + pgvector extension. HNSW index on `data_engine.question_embeddings.embedding`.

Rationale:
- Our scale (≤200k vectors) is **two orders of magnitude below** where dedicated vector DBs win.
- Single DB → single backup → single migration tool → single auth model. Reduces ops surface area dramatically.
- Joins: "find questions with embedding similar to X AND CEFR level=B2 AND skill=reading AND status=approved" is one SQL query. With separate vector DB it's 2 round-trips + app-side join.
- pgvector 0.7+ supports HNSW with `vector_cosine_ops`, recall > 0.95 at our scale.
- Gemini `text-embedding-004` returns 768-dim vectors → fits well within pgvector's 2000-dim limit.

## Consequences

- ✅ One DB to backup, monitor, scale.
- ✅ Trivially join vectors with relational metadata.
- ✅ No extra Docker container.
- ⚠️ HNSW index must be tuned (`m`, `ef_construction`); will require benchmark in Week 4.
- ⚠️ If we ever cross 1M vectors, may need to migrate to Qdrant — see ADR-XXXX (placeholder).
- 🔮 Future-proof: pgvector roadmap (sparse vectors, half-precision, IVF improvements) keeps pace with our needs.

## Implementation notes

- DDL: `CREATE EXTENSION IF NOT EXISTS vector;` in initial migration.
- Index: `CREATE INDEX ON data_engine.question_embeddings USING hnsw (embedding vector_cosine_ops);`
- Distance: cosine (`<=>`). Threshold: `1 - cosine_distance > 0.92` for duplicate match.
- Embedding dimensions: 768 (Gemini `text-embedding-004`).

## References

- pgvector: https://github.com/pgvector/pgvector
- HNSW paper: Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs" (2018)
- Gemini embeddings: https://ai.google.dev/gemini-api/docs/embeddings
