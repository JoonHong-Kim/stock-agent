"""add ticker table and article body

Revision ID: 31f53624b1e6
Revises: 
Create Date: 2025-11-17 20:05:40.828934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31f53624b1e6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tickers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=True),
        sa.Column('exchange', sa.String(length=32), nullable=True),
        sa.Column('mic', sa.String(length=32), nullable=True),
        sa.Column('currency', sa.String(length=16), nullable=True),
        sa.Column('type', sa.String(length=64), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.true()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('symbol'),
    )
    op.create_index(op.f('ix_tickers_symbol'), 'tickers', ['symbol'], unique=False)

    bind = op.get_bind()
    existing_symbols = [row[0] for row in bind.execute(sa.text("SELECT DISTINCT symbol FROM watched_symbols"))]
    if existing_symbols:
        insert_stmt = sa.text(
            "INSERT INTO tickers (symbol, name, is_active) VALUES (:symbol, :name, true) ON CONFLICT (symbol) DO NOTHING"
        )
        for symbol in existing_symbols:
            bind.execute(insert_stmt, {"symbol": symbol, "name": symbol})

    op.alter_column(
        'watched_symbols',
        'symbol',
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        postgresql_using='symbol::varchar(32)',
    )
    op.alter_column(
        'articles',
        'symbol',
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        postgresql_using='symbol::varchar(32)',
    )
    op.add_column('articles', sa.Column('body', sa.Text(), nullable=True))

    op.create_foreign_key(
        'watched_symbols_symbol_fkey',
        'watched_symbols',
        'tickers',
        ['symbol'],
        ['symbol'],
        ondelete='RESTRICT',
    )


def downgrade() -> None:
    op.drop_constraint('watched_symbols_symbol_fkey', 'watched_symbols', type_='foreignkey')
    op.drop_column('articles', 'body')
    op.alter_column(
        'articles',
        'symbol',
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        postgresql_using='symbol::varchar(16)',
    )
    op.alter_column(
        'watched_symbols',
        'symbol',
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        postgresql_using='symbol::varchar(16)',
    )
    op.drop_index(op.f('ix_tickers_symbol'), table_name='tickers')
    op.drop_table('tickers')
