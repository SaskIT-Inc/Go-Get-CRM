# ── Stage 1: Build the React frontend ───────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js tailwind.config.js postcss.config.js jsconfig.json components.json ./
COPY src ./src

# Bakes VITE_API_BASE_URL in at build time; override with --build-arg for a
# real deployment domain. Defaults to same-origin, which is correct for the
# single-container setup this Dockerfile produces (frontend and API share
# one host:port).
ARG VITE_API_BASE_URL=https://aeasy.ca
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ── Stage 2: FastAPI backend, serving the built frontend too ────────────────
FROM python:3.12-slim AS backend

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini
COPY backend/data_imports ./data_imports

# Built React app, served by the SPA-fallback route in app/main.py.
COPY --from=frontend-builder /frontend/dist ./app/static

RUN mkdir -p uploads

EXPOSE 8070

CMD ["sh", "-c", "python -m app.migrate && uvicorn app.main:app --host 0.0.0.0 --port 8070"]
