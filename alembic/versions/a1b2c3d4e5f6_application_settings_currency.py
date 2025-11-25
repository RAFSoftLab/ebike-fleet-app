"""application settings currency

Revision ID: a1b2c3d4e5f6
Revises: 751e1c522b4a
Create Date: 2025-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '751e1c522b4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create application_settings table
    op.create_table('application_settings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('key', sa.String(), nullable=False, unique=True),
    sa.Column('value', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_application_settings_id'), 'application_settings', ['id'], unique=False)
    op.create_index(op.f('ix_application_settings_key'), 'application_settings', ['key'], unique=True)
    
    # Insert default currency setting (RSD - Serbian Dinar)
    op.execute("""
        INSERT INTO application_settings (id, key, value, created_at, updated_at)
        VALUES (gen_random_uuid(), 'currency', 'RSD', now(), now())
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_application_settings_key'), table_name='application_settings')
    op.drop_index(op.f('ix_application_settings_id'), table_name='application_settings')
    op.drop_table('application_settings')

