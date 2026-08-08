from .._shared.field_types import B, I, J, N, S, T

TABLE = "industry_types"
FIELDS = {
    "name": (S, {"nullable": False}),
    "is_active": (B, {"default": True}),
}
REQUIRED = ["name"]
EXCLUDED = set()
