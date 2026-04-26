"""add auth user profile fields

Revision ID: 202604262340
Revises: 202604261500
Create Date: 2026-04-26 23:40:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202604262340"
down_revision: str | None = "202604261500"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("theme", sa.String(length=16), nullable=False, server_default="system"),
        schema="auth",
    )
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        schema="auth",
    )
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        schema="auth",
    )
    op.alter_column("users", "theme", server_default=None, schema="auth")


def downgrade() -> None:
    op.drop_column("users", "deleted_at", schema="auth")
    op.drop_column("users", "email_verified_at", schema="auth")
    op.drop_column("users", "theme", schema="auth")
