from .._shared.field_types import B, I, J, N, S, T

TABLE = "payment_methods"
FIELDS = {
    "client_id": (S, {"nullable": False}),
    "payment_type": S,
    "is_active": (B, {"default": True}),
    "card_last4": S,
    "card_brand": S,
    "card_exp_month": S,
    "card_exp_year": S,
}
REQUIRED = []
EXCLUDED = set()
