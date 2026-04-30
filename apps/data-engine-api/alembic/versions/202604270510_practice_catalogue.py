"""practice catalogue tables

Revision ID: 202604270510
Revises: 202604261600
Create Date: 2026-04-27 05:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604270510"
down_revision: str | None = "202604261600"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "error_taxonomy",
        sa.Column("code", sa.String(128), primary_key=True),
        sa.Column("skill", sa.String(16), nullable=False),
        sa.Column("layer", sa.String(16), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="minor"),
        sa.Column("explanation_uz", sa.Text(), nullable=False),
        sa.Column("explanation_en", sa.Text(), nullable=False),
        sa.Column("example_correct", sa.Text(), nullable=True),
        sa.Column("example_wrong", sa.Text(), nullable=True),
        sa.Column(
            "recommended_drill_ids",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        schema="data_engine",
    )
    op.create_index(
        "ix_error_taxonomy_skill_layer",
        "error_taxonomy",
        ["skill", "layer"],
        schema="data_engine",
    )

    op.create_table(
        "drills",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.String(128), nullable=False, unique=True),
        sa.Column("skill", sa.String(16), nullable=False),
        sa.Column(
            "target_codes",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        sa.Column("cefr_level", sa.String(4), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("variant_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="data_engine",
    )
    op.create_index(
        "ix_drills_skill_cefr",
        "drills",
        ["skill", "cefr_level"],
        schema="data_engine",
    )
    op.create_index(
        "ix_drills_target_codes",
        "drills",
        ["target_codes"],
        schema="data_engine",
        postgresql_using="gin",
    )

    op.create_table(
        "conversation_topics",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.String(128), nullable=False, unique=True),
        sa.Column("title_uz", sa.String(255), nullable=False),
        sa.Column("title_en", sa.String(255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("cefr_level", sa.String(4), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False, server_default="daily"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="data_engine",
    )
    op.create_index(
        "ix_conversation_topics_cefr",
        "conversation_topics",
        ["cefr_level", "is_active"],
        schema="data_engine",
    )


def downgrade() -> None:
    op.drop_index("ix_conversation_topics_cefr", "conversation_topics", schema="data_engine")
    op.drop_table("conversation_topics", schema="data_engine")
    op.drop_index("ix_drills_target_codes", "drills", schema="data_engine")
    op.drop_index("ix_drills_skill_cefr", "drills", schema="data_engine")
    op.drop_table("drills", schema="data_engine")
    op.drop_index("ix_error_taxonomy_skill_layer", "error_taxonomy", schema="data_engine")
    op.drop_table("error_taxonomy", schema="data_engine")
