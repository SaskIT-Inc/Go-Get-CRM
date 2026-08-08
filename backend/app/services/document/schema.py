from .._shared.field_types import J, N, S, T

TABLE = "documents"
FIELDS = {
    "client_id": S,
    "service_filing_id": S,
    "document_name": (S, {"nullable": False}),
    "document_type": S,
    "file_url": S,
    "file_size": N,
    "file_type": S,
    "folder": S,
    "tax_year": S,
    "description": T,
    "tags": J,
    "status": S,
    "uploaded_by": S,
}
REQUIRED = []
EXCLUDED = set()
