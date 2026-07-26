"""
PDF report rendering for the Monthly Performance Report (Reports.jsx) and
Monthly Task Report (MonthlyTaskReports.jsx). Plain tabular PDFs via reportlab
— no charts (that would need matplotlib) — the frontend already shows the
interactive charts; the PDF is the "take it with you" artifact.

Files land in the same uploads/ directory and are served the same way as
files.py's regular uploads (UPLOAD_DIR / UPLOAD_BASE_URL).
"""

import uuid
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .config import settings

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

_TABLE_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
    ("TOPPADDING", (0, 0), (-1, 0), 8),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
])


def _save(doc_build_fn, filename_prefix: str) -> str:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{filename_prefix}-{uuid.uuid4().hex[:8]}.pdf"
    destination = upload_dir / stored_name
    doc = SimpleDocTemplate(str(destination), pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    doc_build_fn(doc)
    return f"{settings.upload_base_url.rstrip('/')}/{stored_name}"


def render_monthly_performance_report(metrics: dict, year: int, month: int) -> str:
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"Monthly Performance Report — {MONTH_NAMES[month]} {year}", styles["Title"]),
        Spacer(1, 0.15 * inch),
        Paragraph("Go-Get", styles["Normal"]),
        Spacer(1, 0.3 * inch),
    ]

    kpi_rows = [
        ["Metric", "Value"],
        ["Total Filings", str(metrics.get("totalFilings", 0))],
        ["Completed Filings", str(metrics.get("completedFilings", 0))],
        ["Avg Turnaround (days)", str(metrics.get("avgTurnaroundTime", 0))],
        ["Total Revenue", f"${metrics.get('totalRevenue', 0):,.2f}"],
        ["Total Collected", f"${metrics.get('totalPaid', 0):,.2f}"],
    ]
    story.append(Table(kpi_rows, style=_TABLE_STYLE, colWidths=[3 * inch, 3 * inch]))
    story.append(Spacer(1, 0.35 * inch))

    revenue_data = metrics.get("revenueData") or []
    if revenue_data:
        story.append(Paragraph("Revenue by Service Type", styles["Heading2"]))
        story.append(Spacer(1, 0.1 * inch))
        rows = [["Service", "Revenue"]] + [
            [item.get("name", ""), f"${item.get('amount', 0):,.2f}"] for item in revenue_data
        ]
        story.append(Table(rows, style=_TABLE_STYLE, colWidths=[4 * inch, 2 * inch]))
        story.append(Spacer(1, 0.35 * inch))

    filing_type_data = metrics.get("filingTypeData") or []
    if filing_type_data:
        story.append(Paragraph("Filings by Service Type", styles["Heading2"]))
        story.append(Spacer(1, 0.1 * inch))
        rows = [["Service", "Count"]] + [
            [item.get("name", ""), str(item.get("count", 0))] for item in filing_type_data
        ]
        story.append(Table(rows, style=_TABLE_STYLE, colWidths=[4 * inch, 2 * inch]))

    return _save(lambda doc: doc.build(story), f"monthly-report-{year}-{month:02d}")


def render_monthly_task_report(payload: dict) -> str:
    styles = getSampleStyleSheet()
    month = payload.get("month", "")
    tasks = payload.get("tasks") or []
    summary = payload.get("summary") or {}
    clients = {c["id"]: c for c in (payload.get("clients") or [])}
    users = {u["email"]: u for u in (payload.get("users") or [])}

    story = [
        Paragraph(f"Monthly Task Report — {month}", styles["Title"]),
        Spacer(1, 0.15 * inch),
        Paragraph("Go-Get", styles["Normal"]),
        Spacer(1, 0.3 * inch),
    ]

    kpi_rows = [
        ["Metric", "Value"],
        ["Total Tasks Completed", str(summary.get("totalTasks", 0))],
        ["Actual Hours", str(summary.get("totalHours", 0))],
        ["Estimated Hours", str(summary.get("estimatedHours", 0))],
        ["Tasks Linked to a Client", str(summary.get("tasksWithClient", 0))],
    ]
    story.append(Table(kpi_rows, style=_TABLE_STYLE, colWidths=[3 * inch, 3 * inch]))
    story.append(Spacer(1, 0.35 * inch))

    if tasks:
        story.append(Paragraph("Completed Tasks", styles["Heading2"]))
        story.append(Spacer(1, 0.1 * inch))
        rows = [["Task", "Client", "Assigned To", "Hours"]]
        for task in tasks:
            client = clients.get(task.get("client_id"))
            user = users.get(task.get("assigned_to"))
            rows.append([
                Paragraph(task.get("title", ""), styles["BodyText"]),
                client.get("legal_name", "") if client else "—",
                (user.get("full_name") if user else None) or task.get("assigned_to") or "—",
                str(task.get("actual_hours", 0)),
            ])
        story.append(Table(rows, style=_TABLE_STYLE, colWidths=[2.6 * inch, 1.6 * inch, 1.6 * inch, 0.8 * inch]))

    return _save(lambda doc: doc.build(story), f"task-report-{month}")
