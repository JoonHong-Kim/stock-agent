"""Remove FK constraint from Report.symbol

Revision ID: 4004af24b4b3
Revises: 0001_core_schema
Create Date: 2025-11-21 17:13:32.326942

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4004af24b4b3'
down_revision: Union[str, Sequence[str], None] = '0001_core_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('reports_symbol_fkey', 'reports', type_='foreignkey')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_foreign_key('reports_symbol_fkey', 'reports', 'watched_symbols', ['symbol'], ['symbol'], ondelete='CASCADE')
