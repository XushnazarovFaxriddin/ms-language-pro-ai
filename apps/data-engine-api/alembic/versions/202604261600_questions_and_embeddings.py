"""questions, embeddings, generation_jobs, validation_results, exam_blueprints

Revision ID: 202604261600
Revises: 202604261501
Create Date: 2026-04-26 16:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "202604261600"
down_revision: Union[str, None] = "202604261501"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # questions
    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(48), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="draft"),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("cefr_level_id", sa.Integer(), nullable=False),
        sa.Column("ielts_band_target", sa.Numeric(2, 1), nullable=True),
        sa.Column("payload", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("answer_key", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("difficulty_b", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("discrimination_a", sa.Numeric(8, 4), nullable=False, server_default="1.0"),
        sa.Column("guessing_c", sa.Numeric(4, 3), nullable=False, server_default="0.25"),
        sa.Column("n_responses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("source_license", sa.String(64), nullable=False, server_default="ai_generated"),
        sa.Column("generated_by_model", sa.String(64), nullable=True),
        sa.Column("prompt_version_id", sa.String(128), nullable=True),
        sa.Column("generation_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("estimated_seconds", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["bank_id"], ["data_engine.question_banks.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["skill_id"], ["data_engine.skills.id"]),
        sa.ForeignKeyConstraint(["cefr_level_id"], ["data_engine.cefr_levels.id"]),
        schema="data_engine",
    )
    op.create_index("ix_questions_status_skill", "questions", ["status", "skill_id"], schema="data_engine")
    op.create_index("ix_questions_cefr", "questions", ["cefr_level_id"], schema="data_engine")

    # embeddings
    op.create_table(
        "question_embeddings",
        sa.Column("question_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("embedding", Vector(768), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["data_engine.questions.id"], ondelete="CASCADE"),
        schema="data_engine",
    )
    op.execute(
        "CREATE INDEX ix_question_embeddings_hnsw "
        "ON data_engine.question_embeddings USING hnsw (embedding vector_cosine_ops)"
    )

    # generation jobs / validation
    op.create_table(
        "generation_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("params", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(24), nullable=False, server_default="queued"),
        sa.Column("totals", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="data_engine",
    )

    op.create_table(
        "validation_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("juror_model", sa.String(64), nullable=False),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("reasoning", sa.Text(), nullable=False),
        sa.Column("criteria_scores", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["data_engine.questions.id"], ondelete="CASCADE"),
        schema="data_engine",
    )
    op.create_index("ix_validation_results_question", "validation_results", ["question_id"], schema="data_engine")

    # exam blueprints
    op.create_table(
        "exam_blueprints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name_uz", sa.String(255), nullable=False),
        sa.Column("name_en", sa.String(255), nullable=False),
        sa.Column("sections", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="data_engine",
    )

    # Seed: default bank + 1 demo blueprint
    op.execute("""
        INSERT INTO data_engine.question_banks (name, scope)
        VALUES ('Default Bank', 'public')
        ON CONFLICT DO NOTHING
    """)
    op.execute("""
        INSERT INTO data_engine.exam_blueprints (code, name_uz, name_en, sections)
        VALUES (
            'mini-reading',
            'Mini Reading Test',
            'Mini Reading Test',
            '[{"index": 0, "skill": "reading", "n_items": 5, "time_limit_seconds": 600}]'::jsonb
        )
        ON CONFLICT (code) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("exam_blueprints", schema="data_engine")
    op.drop_index("ix_validation_results_question", "validation_results", schema="data_engine")
    op.drop_table("validation_results", schema="data_engine")
    op.drop_table("generation_jobs", schema="data_engine")
    op.execute("DROP INDEX IF EXISTS data_engine.ix_question_embeddings_hnsw")
    op.drop_table("question_embeddings", schema="data_engine")
    op.drop_index("ix_questions_cefr", "questions", schema="data_engine")
    op.drop_index("ix_questions_status_skill", "questions", schema="data_engine")
    op.drop_table("questions", schema="data_engine")
