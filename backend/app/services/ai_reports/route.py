from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...deps import get_current_user
from ...adapters.llm import invoke_llm_json
from ...reports import render_monthly_performance_report, render_monthly_task_report
from . import service

router = APIRouter(prefix="/api/functions", tags=["functions"])


@router.post("/{name}")
async def invoke_function(
    name: str,
    body: dict = Body(default={}),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if name == "predictFilingDelays":
        return {"data": await service.predict_filing_delays(db)}

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
        metrics = await service.generate_monthly_report(db, year, month)
        pdf_url = render_monthly_performance_report(metrics, year, month)
        return {"data": {**metrics, "pdfUrl": pdf_url}}

    if name == "generateMonthlyTaskReport":
        pdf_url = render_monthly_task_report(body)
        return {"data": {"pdf_url": pdf_url}}

    if name == "sendDocumentEmail":
        await service.send_document_email(db, user, body)
        return {"success": True}

    if name == "createPaymentIntent":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Online payment isn't available yet — please contact the client directly to arrange payment.",
        )

    if name == "syncFilingToOneDrive":
        data = await service.sync_filing_to_onedrive(db, user, body.get("filing_id"))
        return {"data": data}

    if name == "uploadSignedDocumentToOneDrive":
        data = await service.upload_signed_document_to_onedrive(db, user, body.get("signature_id"))
        return {"data": data}

    if name in service.UNIMPLEMENTED_FUNCTIONS:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            f"'{name}' has not been ported from Base44 yet. "
            f"See docs/legacy-base44-functions/{name}/entry.ts for the original logic.",
        )

    raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown function '{name}'")
