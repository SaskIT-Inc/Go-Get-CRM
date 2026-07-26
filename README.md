# GoGetCRM

A CRM for a Canadian accounting/bookkeeping practice: client onboarding, service filings,
compliance tracking, tasks, invoicing, and lead management.

## Stack

- **Frontend**: React + Vite, in `src/`.
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL, in `backend/`.

## Running locally

### 1. Database

```bash
docker compose up -d postgres
```

Postgres is exposed on host port **5433** (not 5432, to avoid clashing with any native
Postgres install) — see `docker-compose.yml`.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # adjust as needed
alembic upgrade head
python -m app.seed              # creates a bootstrap admin user
uvicorn app.main:app --reload --port 8070
```

The API listens on `http://localhost:8070`. The bootstrap admin's credentials come from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `backend/.env`.

### 3. Frontend

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` (defaults to `http://localhost:8070`) and sign in
at `/login` with the seeded admin account. The public marketing site (`/`, `/about`,
`/pricing`, `/contact`, `/privacy`, `/terms`) is available without logging in.

### Or: single-container Docker build

The root `Dockerfile` builds the React frontend and copies it into the FastAPI image, which
serves both the API and the built frontend from one process — no separate frontend server
or nginx needed. `docker-compose.yml` wires it up with Postgres:

```bash
cp backend/.env.example backend/.env   # adjust as needed
docker compose up -d --build
```

This runs migrations, seeds the bootstrap admin, and serves the whole app at
`http://localhost:8070`. Rebuilding for a real domain: pass
`--build-arg VITE_API_BASE_URL=https://your-domain.example` to `docker compose build`,
since Vite bakes that URL in at build time.

## Backend structure

- `app/models/definitions.py` — one entry per entity (Client, Task, Invoice, Lead, ...)
  describing its typed fields; `app/models/factory.py` turns each entry into a SQLAlchemy
  model. Every entity also gets an `extra` JSONB column for anything not explicitly typed.
- `app/routers/generic.py` — a single CRUD router mounted for every entity
  (`GET/POST /api/{entity}`, `GET/PATCH/DELETE /api/{entity}/{id}`, `POST /api/{entity}/bulk`,
  `POST /api/{entity}/query` for list/filter).
- `app/routers/auth.py` — JWT login/me/register/invite.
- `app/routers/files.py` — local-disk file upload, served back under `/uploads`.
- `app/routers/integrations.py` — transactional email send.
- `app/adapters/email.py`, `app/adapters/llm.py` — SMTP and GroqCloud adapters.
- `app/routers/functions.py` — stands in for the automation functions listed below that
  haven't been ported yet; returns `501` with a pointer to the original source.

### What's not implemented yet

`docs/legacy-base44-functions/` holds the original logic for 56 automation functions this
app used to run on a third-party platform (invoice generation, deadline scanning,
notifications, Stripe billing, Microsoft OneDrive sync, calendar sync). None of them have
been ported to the FastAPI backend yet — the frontend call sites that invoke them will get
a `501 Not Implemented` response naming the function and its original source file. Porting
these, plus wiring up real Stripe/Microsoft Graph credentials, is follow-up work.
