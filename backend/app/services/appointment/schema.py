from .._shared.field_types import B, I, J, N, S, T

TABLE = "appointments"
FIELDS = {
    "title": (S, {"nullable": False}),
    "description": T,
    "appointment_type": S,
    "start_time": S,
    "end_time": S,
    "assigned_to": J,
    "location": S,
    "meeting_link": S,
    "lead_id": S,
    "status": (S, {"default": "Scheduled"}),
}
REQUIRED = []
EXCLUDED = set()
