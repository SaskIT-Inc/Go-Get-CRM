from .._shared.field_types import B, I, J, N, S, T

TABLE = "workflow_templates"
FIELDS = {
    "template_name": (S, {"nullable": False}),
    "description": T,
    "service_category": S,
    "steps": J,
    "required_documents": J,
    "total_estimated_hours": N,
    "is_active": (B, {"default": True}),
}
REQUIRED = []
EXCLUDED = set()
