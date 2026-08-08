import logging
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .scheduler import generate_compliance_alerts, roll_over_overdue_tasks, send_due_recurring_emails

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# Refuse to boot in production with the placeholder secret still in place —
# every JWT would be signed with a value that's public in this repo's source.
# Dev/local environments (the default app_env) are unaffected.
if settings.app_env == "production" and settings.jwt_secret == "change-me-to-a-long-random-string":
    raise RuntimeError(
        "APP_ENV=production but JWT_SECRET is still the default placeholder. "
        "Set a real, random JWT_SECRET before deploying to production."
    )
from .services.ai_reports import route as ai_reports
from .services.auth import route as auth
from .services.company import route as company
from .services.cra_forms import route as cra_forms
from .services.files import route as files
from .services.integrations import route as integrations
from .services.oauth import route as oauth
from .services.provincial_tax import route as provincial_tax
from .services.public import route as public
from .services.registry import ALL_ENTITY_ROUTERS, EXTRA_ROUTERS
from .services.websocket_chat import route as ws_chat

app = FastAPI(title="GoGetCRM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(company.router)
app.include_router(cra_forms.router)
app.include_router(provincial_tax.router)
app.include_router(files.router)
app.include_router(ai_reports.router)
app.include_router(integrations.router)
for _oauth_router in oauth.routers:
    app.include_router(_oauth_router)
app.include_router(public.router)
app.include_router(ws_chat.router)

# Every business entity's CRUD surface (/api/<Entity>) — one router per
# services/<name>/route.py, all sharing the CRUD engine in
# services/_shared/crud_engine.py. See services/__init__.py for the list.
for _router in ALL_ENTITY_ROUTERS:
    app.include_router(_router)
for _router in EXTRA_ROUTERS:
    app.include_router(_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Single uvicorn worker (see docker-compose.yml/Dockerfile) — an in-process
# scheduler is safe here since there's only ever one process to run it.
scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def start_scheduler():
    scheduler.add_job(send_due_recurring_emails, "interval", hours=1, id="recurring_email_sequences")
    scheduler.add_job(roll_over_overdue_tasks, "interval", hours=24, id="overdue_task_rollover")
    scheduler.add_job(generate_compliance_alerts, "interval", hours=24, id="compliance_alert_generation")
    scheduler.start()


@app.on_event("shutdown")
async def stop_scheduler():
    scheduler.shutdown(wait=False)


# In the single-container Docker build, the React app's production build is
# copied to app/static/ (see the root Dockerfile) and served from here. In
# local dev (frontend run separately via `npm run dev`), this directory
# doesn't exist and the mount is skipped.
frontend_dist = Path(__file__).resolve().parent / "static"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = frontend_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        # no-store: this HTML shell must never be served from the browser's
        # disk/back-forward cache — every navigation (including "Back") has
        # to hit the SPA's live JS auth check instead of a frozen snapshot
        # from before a possible logout. The hashed /assets/* bundles above
        # are unaffected and still cache normally.
        return FileResponse(frontend_dist / "index.html", headers={"Cache-Control": "no-store"})
