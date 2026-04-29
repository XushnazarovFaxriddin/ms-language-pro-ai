"""audit_events + anti_cheat_events + irt_calibration_runs + certificates

Revision ID: 202604280010
Revises: 202604270510
Create Date: 2026-04-28 00:10:00

Adds tables for production hardening + dissertation-grade features:
- analytics.audit_events       — immutable security/business event log
- analytics.anti_cheat_events  — per-attempt focus-loss / paste / devtools logs
- data_engine.calibration_runs — IRT nightly recalibration history
- data_engine.item_parameter_history — per-item (a, b) trail (research artefact)
- data_engine.dif_findings    — Differential Item Functioning audit (research artefact)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604280010"
down_revision: Union[str, None] = "202604270510"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS analytics")

    # ── analytics.audit_events ──
    op.create_table(
        "audit_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", postgresql.JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("ip", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        schema="analytics",
    )
    op.create_index("ix_audit_events_ts", "audit_events", ["ts"], schema="analytics")
    op.create_index(
        "ix_audit_events_user_ts", "audit_events", ["user_id", "ts"], schema="analytics"
    )
    op.create_index(
        "ix_audit_events_type_ts", "audit_events", ["type", "ts"], schema="analytics"
    )

    # ── analytics.anti_cheat_events ──
    op.create_table(
        "anti_cheat_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(48), nullable=False),  # focus_loss | paste_blocked | devtools | ...
        sa.Column("section_index", sa.Integer(), nullable=True),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", postgresql.JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        schema="analytics",
    )
    op.create_index(
        "ix_anti_cheat_attempt", "anti_cheat_events", ["attempt_id", "ts"], schema="analytics"
    )
    op.create_index(
        "ix_anti_cheat_user_type", "anti_cheat_events", ["user_id", "event_type", "ts"], schema="analytics"
    )

    # ── data_engine.calibration_runs ──
    op.create_table(
        "calibration_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("method", sa.String(32), server_default="mml-2pl", nullable=False),
        sa.Column("n_items_recalibrated", sa.Integer(), server_default="0", nullable=False),
        sa.Column("n_responses_used", sa.Integer(), server_default="0", nullable=False),
        sa.Column("summary", postgresql.JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("status", sa.String(16), server_default="running", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        schema="data_engine",
    )
    op.create_index(
        "ix_calibration_runs_started", "calibration_runs", ["started_at"], schema="data_engine"
    )

    # ── data_engine.item_parameter_history ──
    op.create_table(
        "item_parameter_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("calibration_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("a", sa.Numeric(8, 4), nullable=False),
        sa.Column("b", sa.Numeric(8, 4), nullable=False),
        sa.Column("c", sa.Numeric(4, 3), nullable=False),
        sa.Column("n_responses", sa.Integer(), nullable=False),
        sa.Column("infit", sa.Numeric(6, 3), nullable=True),
        sa.Column("outfit", sa.Numeric(6, 3), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["question_id"], ["data_engine.questions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["calibration_run_id"], ["data_engine.calibration_runs.id"], ondelete="CASCADE"
        ),
        schema="data_engine",
    )
    op.create_index(
        "ix_item_history_question_created",
        "item_parameter_history",
        ["question_id", "created_at"],
        schema="data_engine",
    )

    # ── data_engine.dif_findings ──
    op.create_table(
        "dif_findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_a", sa.String(32), nullable=False),
        sa.Column("group_b", sa.String(32), nullable=False),
        sa.Column("method", sa.String(32), server_default="mantel_haenszel", nullable=False),
        sa.Column("effect_size", sa.Numeric(8, 4), nullable=False),
        sa.Column("p_value", sa.Numeric(8, 6), nullable=False),
        sa.Column("flagged", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["question_id"], ["data_engine.questions.id"], ondelete="CASCADE"
        ),
        schema="data_engine",
    )
    op.create_index(
        "ix_dif_question", "dif_findings", ["question_id"], schema="data_engine"
    )

    # ── exam_platform.certificates ──
    op.create_table(
        "certificates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("public_id", sa.String(32), nullable=False, unique=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("overall_band", sa.Numeric(3, 1), nullable=False),
        sa.Column("cefr_level", sa.String(4), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pdf_s3_key", sa.String(512), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        schema="exam_platform",
    )
    op.create_index(
        "ix_cert_user", "certificates", ["user_id"], schema="exam_platform"
    )

    # Add a `l1` self-report column to auth.users for DIF analysis
    op.add_column(
        "users",
        sa.Column("l1", sa.String(8), nullable=True),
        schema="auth",
    )


def downgrade() -> None:
    op.drop_column("users", "l1", schema="auth")
    op.drop_table("certificates", schema="exam_platform")
    op.drop_index("ix_dif_question", "dif_findings", schema="data_engine")
    op.drop_table("dif_findings", schema="data_engine")
    op.drop_index(
        "ix_item_history_question_created", "item_parameter_history", schema="data_engine"
    )
    op.drop_table("item_parameter_history", schema="data_engine")
    op.drop_index("ix_calibration_runs_started", "calibration_runs", schema="data_engine")
    op.drop_table("calibration_runs", schema="data_engine")
    op.drop_index("ix_anti_cheat_user_type", "anti_cheat_events", schema="analytics")
    op.drop_index("ix_anti_cheat_attempt", "anti_cheat_events", schema="analytics")
    op.drop_table("anti_cheat_events", schema="analytics")
    op.drop_index("ix_audit_events_type_ts", "audit_events", schema="analytics")
    op.drop_index("ix_audit_events_user_ts", "audit_events", schema="analytics")
    op.drop_index("ix_audit_events_ts", "audit_events", schema="analytics")
    op.drop_table("audit_events", schema="analytics")
