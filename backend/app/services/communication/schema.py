from .._shared.field_types import B, I, J, N, S, T

TABLE = "communications"
FIELDS = {
    "client_id": (S, {"nullable": False}),
    "communication_type": (S, {"default": "Note"}),
    "subject": S,
    "notes": T,
    "communication_date": (S, {"nullable": False}),
    "author_email": S,
    "sender_type": (S, {"default": "staff"}),
}
REQUIRED = ["client_id", "communication_date"]
EXCLUDED = set()
