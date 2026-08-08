from .._shared.field_types import B, I, J, N, S, T

TABLE = "filing_pipelines"
FIELDS = {
    "service_filing_id": (S, {"nullable": False}),
    "client_id": S,
    "filing_type": S,
    "current_stage": (S, {"default": "Client Data Collection"}),
    "stage_history": J,
    "cra_confirmation_number": S,
}
REQUIRED = []
EXCLUDED = set()
