from .._shared.field_types import B, I, J, N, S, T

TABLE = "retainers"
FIELDS = {
    "estimate_id": S,
    "client_id": (S, {"nullable": False}),
    "retainer_number": S,
    "services": J,
    "total_monthly_fee": N,
    "total_annual_fee": N,
    "start_date": S,
    "billing_frequency": (S, {"default": "Monthly"}),
    "status": (S, {"default": "draft"}),
}
REQUIRED = []
EXCLUDED = set()
