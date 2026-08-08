from .._shared.field_types import B, I, J, N, S, T

TABLE = "announcements"
FIELDS = {
    "title": (S, {"nullable": False}),
    "body": T,
    "category": S,
    "published_by": S,
}
REQUIRED = []
EXCLUDED = set()
