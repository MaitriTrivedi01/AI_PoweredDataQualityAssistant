"""Add column field to Rule model

Revision ID: 003
Create Date: 2024-06-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add column field to rules table
    op.add_column('rules', sa.Column('column', sa.String(100), nullable=True))


def downgrade():
    # Remove column field from rules table
    op.drop_column('rules', 'column') 