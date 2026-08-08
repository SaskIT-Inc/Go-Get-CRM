from .._shared.field_types import B, I, J, N, S, T

TABLE = "compliance_alerts"
FIELDS = {
    "title": (S, {"nullable": False}),
    "description": T,
    "alert_type": S,
    "severity": S,
    "status": (S, {"default": "open"}),
    "acknowledged_by": S,
    "acknowledged_date": S,
    "days_until_due": I,
    "client_id": S,
}
REQUIRED = []
EXCLUDED = set()
