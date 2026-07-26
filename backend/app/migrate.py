"""
Boot-time migration: bring the single application database to head.
Replaces the plain `alembic upgrade head` in docker-compose's app command
only in that it prints progress; behavior is otherwise identical.

Run manually with: python -m app.migrate
"""

import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def upgrade_central() -> None:
    print("[migrate] upgrading to head ...")
    cfg = Config(str(ALEMBIC_INI))
    command.upgrade(cfg, "head")
    print("[migrate] done")


if __name__ == "__main__":
    try:
        upgrade_central()
    except Exception as exc:  # fail loud, non-zero exit stops the boot chain
        print(f"[migrate] FAILED: {exc}", file=sys.stderr)
        raise
