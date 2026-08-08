from .._shared.field_types import B, I, J, N, S, T

TABLE = "vendors"
FIELDS = {
    "name": (S, {"nullable": False}),
    "category": S,
    "contact_email": S,
    "phone": S,
    "website": S,
    "services": J,
    "status": (S, {"default": "Active"}),
}
REQUIRED = ["name"]
EXCLUDED = set()
