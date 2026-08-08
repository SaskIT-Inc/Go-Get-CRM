from .._shared.field_types import B, I, J, N, S, T

TABLE = "service_masters"
FIELDS = {
    "name": S,
    "category": S,
    "sort_order": I,
    "is_active": (B, {"default": True}),
}
REQUIRED = []
EXCLUDED = set()
