#!/usr/bin/env bash
# One-command redeploy: pulls latest code, rebuilds the app image, and
# applies any pending Alembic migrations — all in one atomic step.
#
# Why this exists: during development it was confirmed that a running
# container can silently drift from the repo (e.g. code updated but the
# image never rebuilt, so a newer migration file simply isn't there).
# `docker compose up -d --build` alone doesn't run migrations, so a
# schema change without a matching migration run is exactly the kind of
# gap that let a backend feature "work in the code" but not in the running
# app. This script makes the full, correct sequence the only sequence.
#
# Usage: ./deploy.sh   (run from the repo root)

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Pulling latest code"
git pull

echo "==> Rebuilding and restarting containers"
docker compose up -d --build

echo "==> Applying database migrations"
docker compose exec -T app python -m alembic upgrade head

echo "==> Done. Current revision:"
docker compose exec -T app python -m alembic current
