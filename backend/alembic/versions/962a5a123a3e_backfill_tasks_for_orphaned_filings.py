"""backfill tasks for service filings created before auto-task-creation existed

Revision ID: 962a5a123a3e
Revises: f6a7b8c9d0e1
Create Date: 2026-08-08 13:10:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '962a5a123a3e'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TASKS_TABLE = sa.table(
    'tasks',
    sa.column('id', sa.String),
    sa.column('title', sa.String),
    sa.column('description', sa.Text),
    sa.column('status', sa.String),
    sa.column('priority', sa.String),
    sa.column('assigned_to', sa.String),
    sa.column('client_id', sa.String),
    sa.column('service_filing_id', sa.String),
    sa.column('due_date', sa.String),
    sa.column('created_by', sa.String),
    sa.column('extra', JSONB),
)

# Mirrors generic.py's _FILING_TO_TASK_STATUS exactly — a migration can't
# import the router module, so this is a deliberate, commented duplicate.
# Keep in sync if that mapping ever changes.
FILING_TO_TASK_STATUS = {
    "Not Started": "Not Started",
    "Documents Pending": "In Progress",
    "In Progress": "In Progress",
    "Review": "In Progress",
    "Filed": "Complete",
    "Completed": "Complete",
}


def upgrade() -> None:
    bind = op.get_bind()
    # Every ServiceFiling that has no linked Task yet — whether seeded
    # directly (bypassing the API), created before _create_task_for_filing
    # existed, or orphaned by some earlier failure now that failures are
    # logged instead of silently swallowed (see generic.py).
    orphaned = bind.execute(
        sa.text(
            """
            SELECT sf.id, sf.service_name, sf.notes, sf.status, sf.assigned_to,
                   sf.client_id, sf.due_date, sf.created_by, c.legal_name
            FROM service_filings sf
            LEFT JOIN clients c ON c.id = sf.client_id
            WHERE NOT EXISTS (
                SELECT 1 FROM tasks t WHERE t.service_filing_id = sf.id
            )
            """
        )
    ).fetchall()

    if not orphaned:
        return

    rows = []
    for filing in orphaned:
        title = f"{filing.service_name} — {filing.legal_name}" if filing.legal_name else filing.service_name
        rows.append({
            'id': str(uuid.uuid4()),
            'title': title,
            'description': filing.notes,
            'status': FILING_TO_TASK_STATUS.get(filing.status, 'Not Started'),
            'priority': 'Medium',
            'assigned_to': filing.assigned_to,
            'client_id': filing.client_id,
            'service_filing_id': filing.id,
            'due_date': filing.due_date,
            'created_by': filing.created_by,
            'extra': {},
        })
    op.bulk_insert(TASKS_TABLE, rows)


def downgrade() -> None:
    # No reliable way to distinguish a backfilled task from one a user has
    # since edited/interacted with — leave backfilled tasks in place rather
    # than guess-deleting.
    pass
