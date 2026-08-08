from .._shared.field_types import B, I, J, N, S, T

TABLE = "signatures"
FIELDS = {
    "document_id": S,
    "service_filing_id": S,
    "client_id": S,
    "signer_email": S,
    "signer_name": S,
    "signature_data": T,
    "signed_date": S,
    "document_type": S,
    "consent_text": T,
    "ip_address": S,
    "is_valid": (B, {"default": False}),
    "status": (S, {"default": "pending"}),
    "request_date": S,
    "message": T,
}
REQUIRED = []
EXCLUDED = set()
