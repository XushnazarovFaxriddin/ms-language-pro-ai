"""attempt_responses, audio_recordings, llm_scoring_runs, scoring_results

Revision ID: 202604261601
Revises: 202604261502
Create Date: 2026-04-26 16:01:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604261601"
down_revision: Union[str, None] = "202604261502"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attempt_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_index", sa.Integer(), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_snapshot", postgresql.JSONB, nullable=False),
        sa.Column("type", sa.String(48), nullable=False),
        sa.Column("raw_answer", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("partial_credit", sa.Numeric(4, 3), nullable=True),
        sa.Column("theta_at_answer", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("skill", sa.String(16), nullable=False),
        sa.Column("time_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["exam_platform.exam_attempts.id"], ondelete="CASCADE"),
        schema="exam_platform",
    )
    op.create_index("ix_attempt_responses_attempt", "attempt_responses", ["attempt_id"], schema="exam_platform")
    op.create_index(
        "ix_attempt_responses_attempt_item", "attempt_responses", ["attempt_id", "item_id"], schema="exam_platform"
    )

    op.create_table(
        "audio_recordings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=False),
        sa.Column("duration_seconds", sa.Numeric(8, 3), nullable=True),
        sa.Column("bytes", sa.Integer(), nullable=True),
        sa.Column("format", sa.String(32), nullable=False, server_default="audio/webm"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["response_id"], ["exam_platform.attempt_responses.id"], ondelete="CASCADE"),
        schema="exam_platform",
    )

    op.create_table(
        "llm_scoring_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rubric_ref", sa.String(128), nullable=True),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("prompt_version_id", sa.String(128), nullable=True),
        sa.Column("raw_response", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("criteria_scores", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("overall_band", sa.Numeric(3, 1), nullable=True),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("cost_cents", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["response_id"], ["exam_platform.attempt_responses.id"], ondelete="CASCADE"),
        schema="exam_platform",
    )

    op.create_table(
        "scoring_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("source", sa.String(16), nullable=False, server_default="llm"),
        sa.Column("band", sa.Numeric(3, 1), nullable=True),
        sa.Column("criteria", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("feedback_uz", sa.Text(), nullable=True),
        sa.Column("feedback_en", sa.Text(), nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["response_id"], ["exam_platform.attempt_responses.id"], ondelete="CASCADE"),
        schema="exam_platform",
    )

    op.execute("""
        INSERT INTO exam_platform.exams (blueprint_code, name_uz, name_en, is_active)
        VALUES (
            'mini-reading',
            'Mini Reading testi',
            'Mini Reading test',
            true
        )
        ON CONFLICT (blueprint_code) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("scoring_results", schema="exam_platform")
    op.drop_table("llm_scoring_runs", schema="exam_platform")
    op.drop_table("audio_recordings", schema="exam_platform")
    op.drop_index("ix_attempt_responses_attempt_item", "attempt_responses", schema="exam_platform")
    op.drop_index("ix_attempt_responses_attempt", "attempt_responses", schema="exam_platform")
    op.drop_table("attempt_responses", schema="exam_platform")
