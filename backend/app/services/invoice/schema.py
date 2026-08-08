from .._shared.field_types import B, I, J, N, S, T

TABLE = "invoices"
FIELDS = {
    "invoice_number": S,
    "client_id": (S, {"nullable": False}),
    "service_filing_id": S,
    "invoice_date": S,
    "due_date": S,
    "line_items": J,
    "subtotal": N,
    "tax_rate": N,
    "tax_amount": N,
    "total_amount": N,
    "amount_paid": N,
    "balance_due": N,
    "payment_status": (S, {"default": "Pending"}),
    "payment_method": S,
    "payment_date": S,
    "terms": (S, {"default": "Net 30"}),
    "sent_to_client": (B, {"default": False}),
    "notes": T,
}
REQUIRED = []
EXCLUDED = set()
