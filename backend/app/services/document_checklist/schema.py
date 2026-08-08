from .._shared.field_types import B, I, J, N, S, T

TABLE = "document_checklists"
FIELDS = {
    "client_id": (S, {"nullable": False}),
    "service_filing_id": S,
    "checklist_items": J,
    "completion_percentage": N,
    "all_documents_received": (B, {"default": False}),
    "last_updated": S,
}
REQUIRED = []
EXCLUDED = set()
