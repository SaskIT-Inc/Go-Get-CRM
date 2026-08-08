from .._shared.field_types import B, I, J, N, S, T

TABLE = "automation_rules_masters"
FIELDS = {
    "rule_name": S,
    "trigger_entity": S,
    "trigger_condition": S,
    "action_type": S,
    "is_active": (B, {"default": True}),
}
REQUIRED = []
EXCLUDED = set()
