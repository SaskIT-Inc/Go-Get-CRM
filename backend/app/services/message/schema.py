from .._shared.field_types import B, I, J, N, S, T

TABLE = "messages"
FIELDS = {
    "conversation_id": (S, {"nullable": False}),
    "sender_email": S,
    "body": T,
    "read_by": J,
}
REQUIRED = ["conversation_id"]
EXCLUDED = set()
