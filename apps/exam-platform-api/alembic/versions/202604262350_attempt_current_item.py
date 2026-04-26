"""attempt current item snapshot

Revision ID: 202604262350
Revises: 202604261601
Create Date: 2026-04-26 23:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202604262350"
down_revision: str | None = "202604261601"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "exam_attempts",
        sa.Column("current_section_index", sa.Integer(), nullable=False, server_default="0"),
        schema="exam_platform",
    )
    op.add_column(
        "exam_attempts",
        sa.Column("current_item_snapshot", postgresql.JSONB(), nullable=True),
        schema="exam_platform",
    )
    op.add_column(
        "exam_attempts",
        sa.Column("current_item_issued_at", sa.DateTime(timezone=True), nullable=True),
        schema="exam_platform",
    )


def downgrade() -> None:
    op.drop_column("exam_attempts", "current_item_issued_at", schema="exam_platform")
    op.drop_column("exam_attempts", "current_item_snapshot", schema="exam_platform")
    op.drop_column("exam_attempts", "current_section_index", schema="exam_platform")
