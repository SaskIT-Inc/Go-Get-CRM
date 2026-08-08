from .._shared.field_types import B, I, J, N, S, T

TABLE = "document_types_master"
FIELDS = {
    "name": (S, {"nullable": False}),
    "category": S,
    "description": T,
    "is_active": (B, {"default": True}),
}
REQUIRED = ["name"]
EXCLUDED = set()
