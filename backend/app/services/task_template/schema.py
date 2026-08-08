from .._shared.field_types import B, I, J, N, S, T

TABLE = "task_templates"
FIELDS = {
    "template_name": S,
    "description": T,
    "estimated_hours": N,
    "is_active": (B, {"default": True}),
}
REQUIRED = []
EXCLUDED = set()
