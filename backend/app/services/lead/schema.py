from .._shared.field_types import B, I, J, N, S, T

TABLE = "leads"
FIELDS = {
    "contact_name": (S, {"nullable": False}),
    "company_name": S,
    "email": S,
    "phone": S,
    "lead_type": S,
    "pipeline_type": S,
    "lead_source": S,
    "referral_source": S,
    "services_interested": J,
    "estimated_value": N,
    "urgency": (S, {"default": "This Month"}),
    "notes": T,
    "next_follow_up": S,
    "assigned_to": S,
    "stage": (S, {"default": "New Lead"}),
    "probability": N,
    "meeting_type": S,
}
REQUIRED = []
EXCLUDED = set()
