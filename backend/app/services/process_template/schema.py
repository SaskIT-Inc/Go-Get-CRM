from .._shared.field_types import B, I, J, N, S, T

TABLE = "process_templates"
FIELDS = {
    "process_name": (S, {"nullable": False}),
    "description": T,
    "frequency": S,
    "required_roles": J,
    "deadline_offset_days": I,
    "process_steps": J,
    "total_estimated_time": S,
    "service_type": S,
    "is_active": (B, {"default": True}),
}
REQUIRED = []
EXCLUDED = set()
