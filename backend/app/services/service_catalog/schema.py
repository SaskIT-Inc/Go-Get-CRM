from .._shared.field_types import B, I, J, N, S, T

TABLE = "services"
FIELDS = {
    "service_category": S,
    "service_name": (S, {"nullable": False}),
    "service_type": S,
    "cra_form": S,
    "cra_deadline": S,
    "service_frequency": S,
    "period_end_date": S,
    "due_date": S,
    "billing_frequency": S,
    "workflow_template": S,
    "responsible_role": S,
    "base_price": N,
    "estimated_hours": N,
    "notes": T,
    "is_active": (B, {"default": True}),
    "requires_cpa": (B, {"default": False}),
}
REQUIRED = ["service_name"]
EXCLUDED = set()
