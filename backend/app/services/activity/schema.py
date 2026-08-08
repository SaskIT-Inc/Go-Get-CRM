from .._shared.field_types import B, I, J, N, S, T

TABLE = "activities"
FIELDS = {
    "lead_id": S,
    "client_id": S,
    "activity_type": S,
    "title": S,
    "from_stage": S,
    "to_stage": S,
    "performed_by": S,
    "activity_date": S,
    "details": T,
}
REQUIRED = []
EXCLUDED = set()
