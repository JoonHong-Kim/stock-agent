"""create core tables

Revision ID: 0001_core_schema
Revises: 
Create Date: 2025-11-20 16:51:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_core_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tickers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=True),
        sa.Column("exchange", sa.String(length=32), nullable=True),
        sa.Column("mic", sa.String(length=32), nullable=True),
        sa.Column("currency", sa.String(length=16), nullable=True),
        sa.Column("type", sa.String(length=64), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol"),
    )
    op.create_index(op.f("ix_tickers_id"), "tickers", ["id"], unique=False)
    op.create_index(op.f("ix_tickers_symbol"), "tickers", ["symbol"], unique=True)

    op.create_table(
        "watched_symbols",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("last_fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["symbol"], ["tickers.symbol"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol"),
    )
    op.create_index(
        op.f("ix_watched_symbols_id"), "watched_symbols", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_watched_symbols_symbol"), "watched_symbols", ["symbol"], unique=True
    )

    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("headline", sa.String(length=512), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=True),
        sa.Column("external_id", sa.String(length=256), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["symbol"], ["watched_symbols.symbol"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol", "external_id", name="uq_symbol_external"),
    )
    op.create_index(op.f("ix_articles_id"), "articles", ["id"], unique=False)
    op.create_index(op.f("ix_articles_symbol"), "articles", ["symbol"], unique=False)

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["symbol"], ["watched_symbols.symbol"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_id"), "reports", ["id"], unique=False)
    op.create_index(op.f("ix_reports_symbol"), "reports", ["symbol"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reports_symbol"), table_name="reports")
    op.drop_index(op.f("ix_reports_id"), table_name="reports")
    op.drop_table("reports")

    op.drop_index(op.f("ix_articles_symbol"), table_name="articles")
    op.drop_index(op.f("ix_articles_id"), table_name="articles")
    op.drop_table("articles")

    op.drop_index(op.f("ix_watched_symbols_symbol"), table_name="watched_symbols")
    op.drop_index(op.f("ix_watched_symbols_id"), table_name="watched_symbols")
    op.drop_table("watched_symbols")

    op.drop_index(op.f("ix_tickers_symbol"), table_name="tickers")
    op.drop_index(op.f("ix_tickers_id"), table_name="tickers")
    op.drop_table("tickers")
