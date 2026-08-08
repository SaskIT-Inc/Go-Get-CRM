from .._shared.field_types import B, I, J, N, S, T

TABLE = "notifications"
FIELDS = {
    "recipient_email": (S, {"nullable": False}),
    "type": S,
    "title": S,
    "body": T,
    "link_url": S,
    "is_read": (B, {"default": False}),
    "actor_email": S,
}
REQUIRED = ["recipient_email"]
EXCLUDED = set()
