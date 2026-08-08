from .._shared.field_types import B, I, J, N, S, T

TABLE = "conversations"
FIELDS = {
    "subject": S,
    "participant_emails": J,
    "created_by_email": S,
    "last_message_at": S,
}
REQUIRED = []
EXCLUDED = set()
