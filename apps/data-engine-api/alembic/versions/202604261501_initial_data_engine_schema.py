"""initial data_engine schema

Revision ID: 202604261501
Revises:
Create Date: 2026-04-26 15:01:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604261501"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS data_engine")
    op.execute("CREATE SCHEMA IF NOT EXISTS analytics")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # Taxonomies
    op.create_table(
        "cefr_levels",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("code", sa.String(length=4), nullable=False, unique=True),
        sa.Column("descriptor_uz", sa.Text(), nullable=False),
        sa.Column("descriptor_en", sa.Text(), nullable=False),
        sa.Column("ord", sa.Integer(), nullable=False),
        schema="data_engine",
    )
    op.bulk_insert(
        sa.table(
            "cefr_levels",
            sa.column("code", sa.String),
            sa.column("descriptor_uz", sa.Text),
            sa.column("descriptor_en", sa.Text),
            sa.column("ord", sa.Integer),
            schema="data_engine",
        ),
        [
            {"code": "A1", "descriptor_uz": "Boshlovchi", "descriptor_en": "Beginner", "ord": 1},
            {"code": "A2", "descriptor_uz": "Quyi-O'rta", "descriptor_en": "Elementary", "ord": 2},
            {"code": "B1", "descriptor_uz": "O'rta", "descriptor_en": "Intermediate", "ord": 3},
            {"code": "B2", "descriptor_uz": "Yuqori-O'rta", "descriptor_en": "Upper Intermediate", "ord": 4},
            {"code": "C1", "descriptor_uz": "Ilg'or", "descriptor_en": "Advanced", "ord": 5},
            {"code": "C2", "descriptor_uz": "Mukammal", "descriptor_en": "Mastery", "ord": 6},
        ],
    )

    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("code", sa.String(length=16), nullable=False, unique=True),
        sa.Column("name_uz", sa.String(length=64), nullable=False),
        sa.Column("name_en", sa.String(length=64), nullable=False),
        schema="data_engine",
    )
    op.bulk_insert(
        sa.table(
            "skills",
            sa.column("code", sa.String),
            sa.column("name_uz", sa.String),
            sa.column("name_en", sa.String),
            schema="data_engine",
        ),
        [
            {"code": "listening", "name_uz": "Tinglash", "name_en": "Listening"},
            {"code": "reading", "name_uz": "O'qish", "name_en": "Reading"},
            {"code": "writing", "name_uz": "Yozish", "name_en": "Writing"},
            {"code": "speaking", "name_uz": "Gapirish", "name_en": "Speaking"},
        ],
    )

    op.create_table(
        "ielts_sections",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False, unique=True),
        sa.Column("max_questions", sa.Integer(), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        schema="data_engine",
    )

    # Question banks (minimal — full schema added in next migration)
    op.create_table(
        "question_banks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("scope", sa.String(length=16), nullable=False, server_default="private"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="data_engine",
    )

    # analytics.llm_calls — needed by LLM dashboard from day 1
    op.create_table(
        "llm_calls",
        sa.Column("request_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("service", sa.String(length=32), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="gemini"),
        sa.Column("model", sa.String(length=64), nullable=False),
        sa.Column("prompt_version_id", sa.String(length=128), nullable=True),
        sa.Column("tokens_in", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_out", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Numeric(10, 6), nullable=False, server_default="0"),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cache_hit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="success"),
        sa.Column("error_class", sa.String(length=128), nullable=True),
        schema="analytics",
    )
    op.create_index("ix_llm_calls_ts", "llm_calls", ["ts"], schema="analytics")
    op.create_index("ix_llm_calls_purpose_ts", "llm_calls", ["purpose", "ts"], schema="analytics")
    op.create_index("ix_llm_calls_model_ts", "llm_calls", ["model", "ts"], schema="analytics")
    op.create_index("ix_llm_calls_user_ts", "llm_calls", ["user_id", "ts"], schema="analytics")


def downgrade() -> None:
    op.drop_index("ix_llm_calls_user_ts", "llm_calls", schema="analytics")
    op.drop_index("ix_llm_calls_model_ts", "llm_calls", schema="analytics")
    op.drop_index("ix_llm_calls_purpose_ts", "llm_calls", schema="analytics")
    op.drop_index("ix_llm_calls_ts", "llm_calls", schema="analytics")
    op.drop_table("llm_calls", schema="analytics")
    op.drop_table("question_banks", schema="data_engine")
    op.drop_table("ielts_sections", schema="data_engine")
    op.drop_table("skills", schema="data_engine")
    op.drop_table("cefr_levels", schema="data_engine")
