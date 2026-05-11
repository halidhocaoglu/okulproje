"""add is_active column to users

Revision ID: 20260511_0006
Revises: 20260430_0005
Create Date: 2026-05-11 00:00:00.000000
"""

from alembic import op


revision = "20260511_0006"
down_revision = "20260430_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

        UPDATE users
        SET is_active = true
        WHERE is_active IS NULL;

        CREATE INDEX IF NOT EXISTS idx_users_school_is_active
            ON users (school_id, is_active);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS idx_users_school_is_active;
        ALTER TABLE users
        DROP COLUMN IF EXISTS is_active;
        """
    )
