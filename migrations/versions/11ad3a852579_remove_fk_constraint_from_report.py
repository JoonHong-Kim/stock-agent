"""Remove FK constraint from Report

Revision ID: 11ad3a852579
Revises: 4004af24b4b3
Create Date: 2025-11-21 20:42:29.090337

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '11ad3a852579'
down_revision: Union[str, Sequence[str], None] = '4004af24b4b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
