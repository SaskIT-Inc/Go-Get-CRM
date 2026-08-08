from .._shared.field_types import J, N, S, T

TABLE = "tasks"
FIELDS = {
    "title": (S, {"nullable": False}),
    "description": T,
    "status": (S, {"default": "Not Started"}),
    "priority": (S, {"default": "Medium"}),
    "assigned_to": S,
    "client_id": S,
    "service_filing_id": S,
    "linked_service_id": S,
    "linked_package_id": S,
    "service_frequency": S,
    "due_date": S,
    "start_date": S,
    "estimated_hours": N,
    "tags": J,
}
REQUIRED = []
EXCLUDED = set()
