"""add currency and exchange rates

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2025-01-20 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add currency column to financial_transactions
    op.add_column('financial_transactions', 
        sa.Column('currency', sa.String(), nullable=False, server_default='RSD')
    )
    
    # Add currency column to maintenance_records
    op.add_column('maintenance_records',
        sa.Column('currency', sa.String(), nullable=False, server_default='RSD')
    )
    
    # Create exchange_rates table for caching rates
    op.create_table('exchange_rates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('base_currency', sa.String(), nullable=False),
        sa.Column('target_currency', sa.String(), nullable=False),
        sa.Column('rate', sa.Numeric(precision=10, scale=6), nullable=False),
        sa.Column('rate_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exchange_rates_id'), 'exchange_rates', ['id'], unique=False)
    op.create_index('ix_exchange_rates_base_target_date', 'exchange_rates', 
        ['base_currency', 'target_currency', 'rate_date'], unique=True)
    op.create_index(op.f('ix_exchange_rates_rate_date'), 'exchange_rates', ['rate_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_exchange_rates_rate_date'), table_name='exchange_rates')
    op.drop_index('ix_exchange_rates_base_target_date', table_name='exchange_rates')
    op.drop_index(op.f('ix_exchange_rates_id'), table_name='exchange_rates')
    op.drop_table('exchange_rates')
    op.drop_column('maintenance_records', 'currency')
    op.drop_column('financial_transactions', 'currency')

