from .._shared.field_types import B, I, J, N, S, T

TABLE = "team_member_booking_profiles"
FIELDS = {
    "user_email": (S, {"nullable": False}),
    "notify_email": S,
    "cc_emails": J,
    "zoom_link": S,
    "working_hours_start": (S, {"default": "09:00"}),
    "working_hours_end": (S, {"default": "17:00"}),
    "slot_duration_minutes": (I, {"default": 30}),
    "days_available": J,
    "is_active": (B, {"default": True}),
}
REQUIRED = ["user_email"]
EXCLUDED = set()
