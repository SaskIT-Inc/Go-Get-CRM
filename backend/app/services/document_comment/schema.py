from .._shared.field_types import B, I, J, N, S, T

TABLE = "document_comments"
FIELDS = {
    "document_id": (S, {"nullable": False}),
    "client_id": S,
    "author_email": S,
    "author_name": S,
    "body": T,
}
REQUIRED = ["document_id"]
EXCLUDED = set()
