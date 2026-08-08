"""
Backend for the frontend's `api.functions.invoke(name, payload)` call sites.
Most of Base44's original 56 functions aren't ported (see
docs/legacy-base44-functions/ for the originals) — those still return a clean
501. The subset actually wired up here needed no new third-party accounts (AI
assist via Groq, PDF report generation via reportlab, document email via the
existing email adapter) or uses the per-user OneDrive connection from
routers/onedrive_oauth.py.

Payment collection (Stripe), WhatsApp sending, and external calendar sync are
deliberately left unimplemented — each needs a real third-party account/OAuth
setup that doesn't exist yet. The old firm-wide "Initialize Folder Structure"
bulk sync (oneDriveFolderSync) is gone entirely — it assumed one shared
OneDrive, which doesn't fit the per-person model this app uses instead.
"""

import datetime
import logging
from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..adapters.email import send_email
from ..adapters.llm import invoke_llm_json
from ..adapters.onedrive import upload_file as upload_to_onedrive
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import MODELS, ConnectedOneDriveAccount
from ..reports import render_monthly_performance_report, render_monthly_task_report

router = APIRouter(prefix="/api/functions", tags=["functions"])
logger = logging.getLogger(__name__)

ServiceFiling = MODELS["ServiceFiling"]
Invoice = MODELS["Invoice"]
FilingPipeline = MODELS["FilingPipeline"]
Task = MODELS["Task"]
DocumentChecklist = MODELS["DocumentChecklist"]
Client = MODELS["Client"]
Document = MODELS["Document"]
Signature = MODELS["Signature"]

# Functions with no real implementation yet — see module docstring for why.
UNIMPLEMENTED_FUNCTIONS = {
    "createCalendarBlock",
    "generatePaymentReceipt",
    "updateUserRoleAfterInvite",
    "updateFilingStage",
    "oneDriveFolderSync",
    "sendDocumentWhatsApp",
    "syncFilingDeadlinesToCalendar",
    "syncTasksToCalendar",
}


async def _predict_filing_delays(db: AsyncSession) -> dict:
    today = datetime.date.today()
    active_filings = (
        (await db.execute(select(ServiceFiling).where(ServiceFiling.status.notin_(["Completed", "Filed"]))))
        .scalars()
        .all()
    )

    predictions = []
    at_risk_for_ai = []
    for filing in active_filings:
        if not filing.due_date:
            continue
        try:
            due_date = datetime.date.fromisoformat(filing.due_date)
        except ValueError:
            continue
        days_until_due = (due_date - today).days

        tasks = (
            (await db.execute(select(Task).where(Task.service_filing_id == filing.id))).scalars().all()
        )
        task_completion_rate = (
            round(100 * sum(1 for t in tasks if t.status == "Completed") / len(tasks)) if tasks else 100
        )

        checklist = (
            await db.execute(select(DocumentChecklist).where(DocumentChecklist.service_filing_id == filing.id))
        ).scalars().first()
        document_completeness = round(checklist.completion_percentage) if checklist and checklist.completion_percentage is not None else 100

        urgency = 1.0 if days_until_due <= 0 else max(0.0, 1 - days_until_due / 14)
        incompleteness = 1 - (task_completion_rate / 100 * 0.5 + document_completeness / 100 * 0.5)
        risk_score = round((urgency * 0.5 + incompleteness * 0.5) * 100)
        risk_level = (
            "critical" if risk_score >= 75 else
            "high" if risk_score >= 50 else
            "medium" if risk_score >= 25 else
            "low"
        )
        predicted_delay = risk_level in ("critical", "high") and days_until_due <= 3
        delay_days = max(1, round((100 - task_completion_rate) / 20)) if predicted_delay else 0

        client = await db.get(Client, filing.client_id) if filing.client_id else None

        entry = {
            "filing_id": filing.id,
            "service_name": filing.service_name,
            "client_name": client.legal_name if client else "—",
            "risk_level": risk_level,
            "risk_score": risk_score,
            "task_completion_rate": task_completion_rate,
            "document_completeness": document_completeness,
            "days_until_due": days_until_due,
            "predicted_delay": predicted_delay,
            "delay_days": delay_days,
            "recommendations": [],
        }
        predictions.append(entry)
        if risk_level in ("critical", "high"):
            at_risk_for_ai.append(entry)

    # Best-effort AI recommendations for the highest-risk filings only — one
    # batched call rather than one per filing. Numeric risk data above is
    # deterministic and stays useful even if this fails.
    if at_risk_for_ai:
        try:
            prompt_items = [
                {
                    "filing_id": e["filing_id"],
                    "service_name": e["service_name"],
                    "days_until_due": e["days_until_due"],
                    "task_completion_rate": e["task_completion_rate"],
                    "document_completeness": e["document_completeness"],
                }
                for e in at_risk_for_ai[:10]
            ]
            result = await invoke_llm_json(
                prompt=f"At-risk filings: {prompt_items}",
                system=(
                    "You are an accounting-firm operations assistant. For each filing given, write 1-2 short, "
                    "specific, actionable recommendations for the staff member handling it (e.g. what to chase, "
                    "who to follow up with). Respond with a JSON object shaped exactly like "
                    '{"recommendations": {"<filing_id>": ["...", "..."]}} with one entry per filing_id given.'
                ),
            )
            recs_by_id = result.get("recommendations", {})
            for entry in predictions:
                entry["recommendations"] = recs_by_id.get(entry["filing_id"], [])
        except Exception:
            # numeric predictions above are still returned either way
            logger.exception("Failed to enrich filing-delay predictions with LLM recommendations")

    high_risk_count = sum(1 for p in predictions if p["risk_level"] in ("critical", "high"))
    return {
        "predictions": predictions,
        "high_risk_count": high_risk_count,
        "total_active_filings": len(predictions),
    }


async def _generate_monthly_report(db: AsyncSession, year: int, month: int) -> dict:
    start = datetime.date(year, month, 1)
    end = (datetime.date(year + 1, 1, 1) if month == 12 else datetime.date(year, month + 1, 1)) - datetime.timedelta(days=1)

    filings = (await db.execute(select(ServiceFiling))).scalars().all()
    month_filings = [
        f for f in filings
        if f.filed_date and _in_range(f.filed_date, start, end)
    ]
    total_filings = len(month_filings)
    completed_filings = sum(1 for f in month_filings if f.status in ("Completed", "Filed"))

    pipelines = (await db.execute(select(FilingPipeline))).scalars().all()
    turnaround_days = []
    for p in pipelines:
        final_date = (p.extra or {}).get("final_confirmation_date")
        if final_date and p.created_date and _in_range(final_date, start, end):
            days = (datetime.date.fromisoformat(final_date) - p.created_date.date()).days
            turnaround_days.append(days)
    avg_turnaround = round(sum(turnaround_days) / len(turnaround_days)) if turnaround_days else 0

    invoices = (await db.execute(select(Invoice))).scalars().all()
    month_invoices = [inv for inv in invoices if inv.invoice_date and _in_range(inv.invoice_date, start, end)]

    filing_by_id = {f.id: f for f in filings}
    revenue_by_service: dict[str, float] = {}
    for inv in month_invoices:
        filing = filing_by_id.get(inv.service_filing_id)
        service_name = filing.service_name if filing else "Other Services"
        revenue_by_service[service_name] = revenue_by_service.get(service_name, 0) + float(inv.total_amount or 0)

    filings_by_type: dict[str, int] = {}
    for f in month_filings:
        filings_by_type[f.service_name or "Other"] = filings_by_type.get(f.service_name or "Other", 0) + 1

    total_revenue = sum(revenue_by_service.values())
    total_paid = sum(float(inv.amount_paid or 0) for inv in month_invoices)

    return {
        "totalFilings": total_filings,
        "completedFilings": completed_filings,
        "avgTurnaroundTime": avg_turnaround,
        "totalRevenue": total_revenue,
        "totalPaid": total_paid,
        "revenueData": [{"name": k, "amount": round(v, 2)} for k, v in revenue_by_service.items()],
        "filingTypeData": [{"name": k, "count": v} for k, v in filings_by_type.items()],
    }


def _in_range(iso_date: str, start: datetime.date, end: datetime.date) -> bool:
    try:
        d = datetime.date.fromisoformat(iso_date[:10])
    except ValueError:
        return False
    return start <= d <= end


async def _get_onedrive_account(db: AsyncSession, user_id: str) -> ConnectedOneDriveAccount | None:
    result = await db.execute(
        select(ConnectedOneDriveAccount).where(ConnectedOneDriveAccount.user_id == user_id)
    )
    return result.scalar_one_or_none()


def _require_onedrive_configured() -> None:
    if not settings.microsoft_oauth_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "OneDrive integration is not configured")


def _read_uploaded_file(file_url: str) -> bytes:
    """Local files uploaded through /api/files live at UPLOAD_DIR/{filename}
    — file_url is just that filename with UPLOAD_BASE_URL prefixed."""
    filename = file_url.rstrip("/").split("/")[-1]
    return (Path(settings.upload_dir) / filename).read_bytes()


@router.post("/{name}")
async def invoke_function(
    name: str,
    body: dict = Body(default={}),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if name == "predictFilingDelays":
        return {"data": await _predict_filing_delays(db)}

    if name == "suggestTaskImprovements":
        result = await invoke_llm_json(
            prompt=(
                f"Task title: {body.get('task_title', '')}\n"
                f"Current description: {body.get('task_description', '')}\n"
                f"Client context: {body.get('client_context', '')}"
            ),
            system=(
                "You are an accounting-firm operations assistant improving a staff task definition. Respond with "
                'a JSON object shaped exactly like {"improved_description": "...", "recommended_priority": '
                '"Low"|"Medium"|"High"|"Urgent", "estimated_hours": <number>, "dependencies": ["..."], '
                '"sub_tasks": ["..."]}. Keep dependencies/sub_tasks short and specific; use empty arrays if none.'
            ),
        )
        return {"data": result}

    if name == "generateFilingSummary":
        result = await invoke_llm_json(
            prompt=(
                f"Filing: {body.get('filing_name', '')}\n"
                f"Year: {body.get('filing_year', '')}\n"
                f"Status: {body.get('status', '')}\n"
                f"Documents on file: {body.get('documents', [])}\n"
                f"Notes: {body.get('notes', '')}"
            ),
            system=(
                "You are an accounting-firm operations assistant summarizing a client filing for staff. Respond "
                'with a JSON object shaped exactly like {"summary": "...", "estimated_timeline": "...", '
                '"next_steps": ["..."], "risks": ["..."]}. Keep it concise and specific to the details given; use '
                "an empty array for risks if there are none."
            ),
        )
        return {"data": result}

    if name == "generateMonthlyReport":
        year = int(body.get("year"))
        month = int(body.get("month"))
        metrics = await _generate_monthly_report(db, year, month)
        pdf_url = render_monthly_performance_report(metrics, year, month)
        return {"data": {**metrics, "pdfUrl": pdf_url}}

    if name == "generateMonthlyTaskReport":
        pdf_url = render_monthly_task_report(body)
        return {"data": {"pdf_url": pdf_url}}

    if name == "sendDocumentEmail":
        try:
            await send_email(to=body.get("to"), subject=body.get("subject", ""), body=body.get("body", ""))
        except Exception as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Failed to send email: {exc}") from exc
        return {"success": True}

    if name == "createPaymentIntent":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Online payment isn't available yet — please contact the client directly to arrange payment.",
        )

    if name == "syncFilingToOneDrive":
        _require_onedrive_configured()
        account = await _get_onedrive_account(db, user.id)
        if account is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Connect your OneDrive in Settings > Email first.")

        filing = await db.get(ServiceFiling, body.get("filing_id"))
        if filing is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Filing not found")
        client = await db.get(Client, filing.client_id) if filing.client_id else None
        client_name = client.legal_name if client else "Unknown Client"
        folder = f"Go-Get Clients/{client_name}/Filings/{filing.service_name or 'Filing'}"

        documents = (
            (await db.execute(select(Document).where(Document.service_filing_id == filing.id))).scalars().all()
        )
        uploaded = 0
        for doc in documents:
            if not doc.file_url:
                continue
            try:
                content = _read_uploaded_file(doc.file_url)
                await upload_to_onedrive(account, db, folder, doc.document_name or "document", content)
                uploaded += 1
            except Exception:
                # one bad document shouldn't sink the whole sync
                logger.exception("Failed to sync document %s to OneDrive", doc.id)
                continue
        return {"data": {"documentsUploaded": uploaded}}

    if name == "uploadSignedDocumentToOneDrive":
        _require_onedrive_configured()
        account = await _get_onedrive_account(db, user.id)
        if account is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Connect your OneDrive in Settings > Email first.")

        signature = await db.get(Signature, body.get("signature_id"))
        if signature is None or not signature.document_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Signed document not found")
        document = await db.get(Document, signature.document_id)
        if document is None or not document.file_url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Signed document file not found")
        client = await db.get(Client, document.client_id) if document.client_id else None
        client_name = client.legal_name if client else "Unknown Client"

        try:
            content = _read_uploaded_file(document.file_url)
        except FileNotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Signed document file is missing from storage") from exc
        try:
            result = await upload_to_onedrive(
                account, db, f"Go-Get Clients/{client_name}/Signatures", document.document_name or "signed-document.pdf", content
            )
        except Exception as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Failed to upload to OneDrive: {exc}") from exc
        return {"data": {"webUrl": result.get("webUrl")}}

    if name in UNIMPLEMENTED_FUNCTIONS:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            f"'{name}' has not been ported from Base44 yet. "
            f"See docs/legacy-base44-functions/{name}/entry.ts for the original logic.",
        )

    raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown function '{name}'")
