from .._shared.field_types import B, J, S

TABLE = "users"
FIELDS = {
    "email": (S, {"unique": True, "nullable": False}),
    "hashed_password": (S, {"nullable": False}),
    "full_name": S,
    "role": (S, {"nullable": False, "default": "user"}),
    "job_title": S,
    "permissions": J,
    "phone": S,
    "is_active": (B, {"default": True}),
    "is_email_verified": (B, {"default": False, "nullable": False}),
}
REQUIRED = ["role"]
EXCLUDED = {"hashed_password"}
