from .._shared.field_types import B, I, J, N, S, T

TABLE = "status_stage_masters"
FIELDS = {
    "status_name": S,
    "sort_order": I,
    "entity_type": S,
    "color": S,
    "is_active": (B, {"default": True}),
}
REQUIRED = []
EXCLUDED = set()
