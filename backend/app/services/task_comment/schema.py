from .._shared.field_types import B, I, J, N, S, T

TABLE = "task_comments"
FIELDS = {
    "task_id": (S, {"nullable": False}),
    "commenter_email": S,
    "commenter_name": S,
    "comment_text": T,
    "mentioned_emails": J,
    "attachments": J,
}
REQUIRED = []
EXCLUDED = set()
