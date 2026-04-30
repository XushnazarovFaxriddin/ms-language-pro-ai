"""feedback, roadmap, and conversation practice tables

Revision ID: 202604270520
Revises: 202604262350
Create Date: 2026-04-27 05:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604270520"
down_revision: str | None = "202604262350"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "feedback_artifacts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("layer", sa.String(24), nullable=False),
        sa.Column("skill", sa.String(16), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("source", sa.String(16), nullable=False, server_default="llm"),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column("prompt_version_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["attempt_id"],
            ["exam_platform.exam_attempts.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["response_id"],
            ["exam_platform.attempt_responses.id"],
            ondelete="CASCADE",
        ),
        schema="exam_platform",
    )
    op.create_index(
        "ix_feedback_artifacts_attempt_layer_skill",
        "feedback_artifacts",
        ["attempt_id", "layer", "skill"],
        schema="exam_platform",
    )
    op.create_index(
        "ix_feedback_artifacts_response",
        "feedback_artifacts",
        ["response_id"],
        schema="exam_platform",
    )

    op.create_table(
        "roadmaps",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("anchor_attempt_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_band", sa.Numeric(3, 1), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("weekly_hours", sa.Integer(), nullable=False),
        sa.Column("current_band_estimate", sa.Numeric(3, 1), nullable=True),
        sa.Column(
            "predicted_band_at_target",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "plan",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["anchor_attempt_id"],
            ["exam_platform.exam_attempts.id"],
            ondelete="SET NULL",
        ),
        schema="exam_platform",
    )
    op.create_index(
        "ix_roadmaps_user_status",
        "roadmaps",
        ["user_id", "status"],
        schema="exam_platform",
    )

    op.create_table(
        "srs_cards",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ref_type", sa.String(32), nullable=False),
        sa.Column("ref_id", sa.String(128), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("stability", sa.Numeric(8, 3), nullable=False, server_default="1.0"),
        sa.Column("difficulty", sa.Numeric(8, 3), nullable=False, server_default="5.0"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lapses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_grade", sa.String(16), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="exam_platform",
    )
    op.create_index(
        "ix_srs_cards_user_due",
        "srs_cards",
        ["user_id", "due_at"],
        schema="exam_platform",
    )

    op.create_table(
        "drill_attempts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("drill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("items_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        schema="exam_platform",
    )
    op.create_index(
        "ix_drill_attempts_user_started",
        "drill_attempts",
        ["user_id", "started_at"],
        schema="exam_platform",
    )

    op.create_table(
        "user_mastery",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(128), nullable=False),
        sa.Column("mastery", sa.Numeric(4, 3), nullable=False, server_default="0.0"),
        sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "code"),
        schema="exam_platform",
    )

    op.create_table(
        "conversation_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("cefr_level", sa.String(4), nullable=False, server_default="B1"),
        sa.Column("mode", sa.String(16), nullable=False, server_default="async"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        schema="exam_platform",
    )
    op.create_index(
        "ix_conversation_sessions_user_status",
        "conversation_sessions",
        ["user_id", "status"],
        schema="exam_platform",
    )

    op.create_table(
        "conversation_turns",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False),
        sa.Column("user_audio_s3_key", sa.String(512), nullable=True),
        sa.Column("user_transcript", sa.Text(), nullable=False),
        sa.Column("agent_response_text", sa.Text(), nullable=False),
        sa.Column("agent_audio_url", sa.Text(), nullable=True),
        sa.Column(
            "feedback",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "raw_response",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column("prompt_version_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["exam_platform.conversation_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("session_id", "turn_index", name="uq_conversation_turns_index"),
        schema="exam_platform",
    )


def downgrade() -> None:
    op.drop_table("conversation_turns", schema="exam_platform")
    op.drop_index(
        "ix_conversation_sessions_user_status",
        "conversation_sessions",
        schema="exam_platform",
    )
    op.drop_table("conversation_sessions", schema="exam_platform")
    op.drop_table("user_mastery", schema="exam_platform")
    op.drop_index(
        "ix_drill_attempts_user_started",
        "drill_attempts",
        schema="exam_platform",
    )
    op.drop_table("drill_attempts", schema="exam_platform")
    op.drop_index("ix_srs_cards_user_due", "srs_cards", schema="exam_platform")
    op.drop_table("srs_cards", schema="exam_platform")
    op.drop_index("ix_roadmaps_user_status", "roadmaps", schema="exam_platform")
    op.drop_table("roadmaps", schema="exam_platform")
    op.drop_index(
        "ix_feedback_artifacts_response",
        "feedback_artifacts",
        schema="exam_platform",
    )
    op.drop_index(
        "ix_feedback_artifacts_attempt_layer_skill",
        "feedback_artifacts",
        schema="exam_platform",
    )
    op.drop_table("feedback_artifacts", schema="exam_platform")
