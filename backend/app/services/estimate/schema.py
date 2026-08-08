from .._shared.field_types import B, I, J, N, S, T

TABLE = "estimates"
FIELDS = {
    "client_id": S,
    "lead_id": S,
    "estimate_number": S,
    "services": J,
    "total_amount": N,
    "status": (S, {"default": "draft"}),
    "valid_until": S,
    "notes": T,
}
REQUIRED = []
EXCLUDED = set()
