from .._shared.field_types import I, J, N, S, T

TABLE = "service_filings"
FIELDS = {
    "client_id": (S, {"nullable": False}),
    "service_id": S,
    "service_name": (S, {"nullable": False}),
    "filing_year": S,
    "fee": N,
    "filing_frequency": S,
    "schedule_month": S,
    "schedule_day": I,
    "tax_cycle_start": S,
    "tax_cycle_end": S,
    "status": (S, {"default": "Not Started"}),
    "due_date": S,
    # Server-computed CRA-style compliance deadline — distinct from the
    # editable, operational `due_date` above. Always recomputed server-side
    # from service_name/filing_frequency/tax_cycle_end on every create/
    # update (see service.py's classify_filing/default_compliance_due_date),
    # so any client-submitted value is simply overwritten — that's what
    # makes it non-editable.
    "compliance_due_date": S,
    "filed_date": S,
    "assigned_to": S,
    "required_documents": J,
    "notes": T,
}
REQUIRED = ["client_id", "service_name"]
EXCLUDED = set()
