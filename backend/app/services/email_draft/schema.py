from .._shared.field_types import B, I, J, N, S, T

TABLE = "email_drafts"
FIELDS = {
    "task_id": S,
    "client_id": S,
    "client_name": S,
    "client_email": S,
    "subject_line": S,
    "email_body": T,
    "status": (S, {"default": "draft"}),
    "sent_date": S,
    "sent_by": S,
    "notes": T,
}
REQUIRED = []
EXCLUDED = set()
