-- Idempotent: runs once on first postgres start (volume empty).
-- Creates schemas and pgvector extension. Tables are created by Alembic migrations.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- text similarity (admin search)

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS data_engine;
CREATE SCHEMA IF NOT EXISTS exam_platform;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Default search_path so apps don't need explicit schema-qualified names everywhere.
-- Each service overrides via SET search_path in its DB connection if needed.
ALTER DATABASE languagepro SET search_path TO public, auth, data_engine, exam_platform, analytics;
