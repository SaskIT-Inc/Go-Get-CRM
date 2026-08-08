from .._shared.field_types import B, I, J, N, S, T

TABLE = "recurring_email_sequences"
FIELDS = {
    "client_id": (S, {"nullable": False}),
    "subject": (S, {"nullable": False}),
    "body": (T, {"nullable": False}),
    "interval_days": (N, {"default": 7}),
    "next_send_date": (S, {"nullable": False}),
    "last_sent_date": S,
    "send_count": (N, {"default": 0}),
    "max_sends": N,
    "status": (S, {"default": "active"}),
    "stopped_reason": S,
}
REQUIRED = ["client_id", "subject", "body", "next_send_date"]
EXCLUDED = set()
