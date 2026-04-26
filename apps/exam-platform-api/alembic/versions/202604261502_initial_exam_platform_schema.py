"""initial exam_platform schema

Revision ID: 202604261502
Revises:
Create Date: 2026-04-26 15:02:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604261502"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS exam_platform")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "exams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("blueprint_code", sa.String(length=64), nullable=False, unique=True),
        sa.Column("name_uz", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="exam_platform",
    )

    op.create_table(
        "exam_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blueprint_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False, server_default="in_progress"),
        sa.Column("theta_estimates", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("theta_se", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("locale", sa.String(length=8), nullable=False, server_default="uz"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exam_platform.exams.id"], ondelete="RESTRICT"),
        schema="exam_platform",
    )
    op.create_index("ix_exam_attempts_user", "exam_attempts", ["user_id"], schema="exam_platform")
    op.create_index("ix_exam_attempts_state", "exam_attempts", ["state"], schema="exam_platform")


def downgrade() -> None:
    op.drop_index("ix_exam_attempts_state", "exam_attempts", schema="exam_platform")
    op.drop_index("ix_exam_attempts_user", "exam_attempts", schema="exam_platform")
    op.drop_table("exam_attempts", schema="exam_platform")
    op.drop_table("exams", schema="exam_platform")
