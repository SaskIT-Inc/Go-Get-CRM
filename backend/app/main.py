from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .scheduler import send_due_recurring_emails
from .routers import (
    auth,
    company,
    cra_forms,
    files,
    functions,
    generic,
    google_oauth,
    integrations,
    onedrive_oauth,
    outlook_oauth,
    provincial_tax,
    public,
    ws_chat,
)

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
app.include_router(functions.router)
app.include_router(integrations.router)
app.include_router(google_oauth.router)
app.include_router(onedrive_oauth.router)
app.include_router(outlook_oauth.router)
app.include_router(public.router)
app.include_router(generic.router)
app.include_router(ws_chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Single uvicorn worker (see docker-compose.yml/Dockerfile) — an in-process
# scheduler is safe here since there's only ever one process to run it.
scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def start_scheduler():
    scheduler.add_job(send_due_recurring_emails, "interval", hours=1, id="recurring_email_sequences")
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
