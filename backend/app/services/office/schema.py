from .._shared.field_types import B, I, J, N, S, T

TABLE = "offices"
FIELDS = {
    "name": (S, {"nullable": False}),
    "address": S,
    "city": S,
    "province": S,
    "phone": S,
    "email": S,
    "is_primary": (B, {"default": False}),
    "is_active": (B, {"default": True}),
}
REQUIRED = ["name"]
EXCLUDED = set()
