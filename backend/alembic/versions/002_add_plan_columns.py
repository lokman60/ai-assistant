"""add plan columns to users

Revision ID: 002
Revises: 001
Create Date: 2026-07-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("plan", sa.String(20), server_default="free", nullable=False))
    op.add_column("users", sa.Column("documents_today", sa.Integer, server_default="0", nullable=False))
    op.add_column("users", sa.Column("reset_date", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "plan")
    op.drop_column("users", "documents_today")
    op.drop_column("users", "reset_date")
