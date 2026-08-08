from .._shared.field_types import B, I, J, N, S, T

TABLE = "packages"
FIELDS = {
    "name": (S, {"nullable": False}),
    "price": S,
    "billing_frequency": (S, {"default": "Monthly"}),
    "description": T,
    "is_active": (B, {"default": True}),
}
REQUIRED = ["name"]
EXCLUDED = set()
