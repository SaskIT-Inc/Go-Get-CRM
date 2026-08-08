from .._shared.field_types import B, I, J, N, S, T

TABLE = "payments"
FIELDS = {
    "invoice_id": S,
    "client_id": S,
    "payment_amount": N,
    "payment_date": S,
    "payment_method": S,
    "transaction_id": S,
    "payment_status": (S, {"default": "Completed"}),
}
REQUIRED = []
EXCLUDED = set()
