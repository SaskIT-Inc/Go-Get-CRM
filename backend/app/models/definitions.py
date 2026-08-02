"""
Data-driven entity definitions, replacing the Base44 schemaless entity store.

Each entry maps an entity name (matching the names the frontend already uses,
e.g. `api.entities.Client`) to a table name and a field map. Field values are
either a SQLAlchemy type, or a (type, column_kwargs) tuple for cases that need
extra constraints (unique, nullable, default).

Every entity also gets, via the model factory: id, created_date, updated_date,
created_by, and an `extra` JSONB catch-all for any field not listed here (so
the API stays forgiving the way Base44's schemaless entities were).

Dates/times are stored as plain strings (as the frontend already treats them),
avoiding brittle type coercion for a system that was schemaless end-to-end.
"""

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

S = String
T = Text
I = Integer
N = Numeric
B = Boolean
J = JSONB

ENTITY_DEFINITIONS = {
    "User": {
        "table": "users",
        "fields": {
            "email": (S, {"unique": True, "nullable": False}),
            "hashed_password": (S, {"nullable": False}),
            "full_name": S,
            "role": (S, {"nullable": False, "default": "user"}),
            "job_title": S,
            "permissions": J,
            "phone": S,
            "is_active": (B, {"default": True}),
            "is_email_verified": (B, {"default": False, "nullable": False}),
        },
    },
    "Client": {
        "table": "clients",
        "fields": {
            "client_type": S,
            "individual_type": S,
            "business_type": S,
            "legal_name": (S, {"nullable": False}),
            "operating_name": S,
            "industry": S,
            "preferred_office": S,
            "preferred_contact_method": S,
            "lead_source": S,
            "referral_source": S,
            "urgency_level": (S, {"default": "This Month"}),
            "desired_start_date": S,
            "primary_contact_name": S,
            "contact_person_position": S,
            "contact_person_email": S,
            "contact_person_phone": S,
            "contact_person_address": S,
            "primary_email": (S, {"nullable": False}),
            "primary_phone": S,
            "website": S,
            "address": S,
            "city": S,
            "province": S,
            "postal_code": S,
            "business_number": S,
            "gst_hst_number": S,
            "pst_number": S,
            "payroll_number": S,
            "corp_number_federal": S,
            "corp_number_provincial": S,
            "number_of_shareholders": S,
            "incorporation_date": S,
            "fiscal_year_end": S,
            "number_of_employees": I,
            "last_year_revenue": S,
            "annual_revenue": S,
            "services_needed": J,
            "current_accounting_software": S,
            "previous_accountant": S,
            "outstanding_issues": T,
            "special_requirements": T,
            "status": (S, {"default": "Onboarding"}),
            "assigned_to": S,
            "client_value_tier": (S, {"default": "New"}),
            "payment_terms": (S, {"default": "Net 30"}),
            "active_package": S,
            "package_price": S,
            "package_billing": S,
            "safe_isc_user_id": S,
            "safe_isc_password": S,
            "safe_isc_web_code": S,
            "safe_inc_canada_user_id": S,
            "safe_inc_canada_password": S,
            "safe_inc_canada_web_code": S,
            "safe_pst_id": S,
            "safe_pst_password": S,
            "safe_cra_id": S,
            "safe_cra_password": S,
            "notes": T,
        },
    },
    "Service": {
        "table": "services",
        "fields": {
            "service_category": (S, {"nullable": False}),
            "service_name": (S, {"nullable": False}),
            "service_type": S,
            "cra_form": S,
            "cra_deadline": S,
            "service_frequency": S,
            "period_end_date": S,
            "due_date": S,
            "billing_frequency": S,
            "workflow_template": S,
            "responsible_role": S,
            "base_price": N,
            "estimated_hours": N,
            "notes": T,
            "is_active": (B, {"default": True}),
            "requires_cpa": (B, {"default": False}),
        },
    },
    "ServiceFiling": {
        "table": "service_filings",
        "fields": {
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
            "filed_date": S,
            "assigned_to": S,
            "required_documents": J,
            "notes": T,
        },
    },
    "Task": {
        "table": "tasks",
        "fields": {
            "title": (S, {"nullable": False}),
            "description": T,
            "status": (S, {"default": "Not Started"}),
            "priority": (S, {"default": "Medium"}),
            "assigned_to": S,
            "client_id": S,
            "service_filing_id": S,
            "linked_service_id": S,
            "linked_package_id": S,
            "service_frequency": S,
            "due_date": S,
            "start_date": S,
            "estimated_hours": N,
            "tags": J,
        },
    },
    "Appointment": {
        "table": "appointments",
        "fields": {
            "title": (S, {"nullable": False}),
            "description": T,
            "appointment_type": S,
            "start_time": S,
            "end_time": S,
            "assigned_to": J,
            "location": S,
            "meeting_link": S,
            "lead_id": S,
            "status": (S, {"default": "Scheduled"}),
        },
    },
    "Invoice": {
        "table": "invoices",
        "fields": {
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
        },
    },
    "Document": {
        "table": "documents",
        "fields": {
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
        },
    },
    "Retainer": {
        "table": "retainers",
        "fields": {
            "estimate_id": S,
            "client_id": (S, {"nullable": False}),
            "retainer_number": S,
            "services": J,
            "total_monthly_fee": N,
            "total_annual_fee": N,
            "start_date": S,
            "billing_frequency": (S, {"default": "Monthly"}),
            "status": (S, {"default": "draft"}),
        },
    },
    "ServiceMaster": {
        "table": "service_masters",
        "fields": {
            "name": S,
            "category": S,
            "sort_order": I,
            "is_active": (B, {"default": True}),
        },
    },
    "StatusStageMaster": {
        "table": "status_stage_masters",
        "fields": {
            "status_name": S,
            "sort_order": I,
            "entity_type": S,
            "color": S,
            "is_active": (B, {"default": True}),
        },
    },
    "DocumentChecklist": {
        "table": "document_checklists",
        "fields": {
            "client_id": (S, {"nullable": False}),
            "service_filing_id": S,
            "checklist_items": J,
            "completion_percentage": N,
            "all_documents_received": (B, {"default": False}),
            "last_updated": S,
        },
    },
    "TaskComment": {
        "table": "task_comments",
        "fields": {
            "task_id": (S, {"nullable": False}),
            "commenter_email": S,
            "commenter_name": S,
            "comment_text": T,
            "mentioned_emails": J,
            "attachments": J,
        },
    },
    "ComplianceAlert": {
        "table": "compliance_alerts",
        "fields": {
            "title": (S, {"nullable": False}),
            "description": T,
            "alert_type": S,
            "severity": S,
            "status": (S, {"default": "open"}),
            "acknowledged_by": S,
            "acknowledged_date": S,
            "days_until_due": I,
            "client_id": S,
        },
    },
    "EmailDraft": {
        "table": "email_drafts",
        "fields": {
            "task_id": S,
            "client_id": S,
            "client_name": S,
            "client_email": S,
            "subject_line": S,
            "email_body": T,
            "status": (S, {"default": "draft"}),
            "sent_date": S,
            "sent_by": S,
            "notes": T,
        },
    },
    "Lead": {
        "table": "leads",
        "fields": {
            "contact_name": (S, {"nullable": False}),
            "company_name": S,
            "email": S,
            "phone": S,
            "lead_type": S,
            "pipeline_type": S,
            "lead_source": S,
            "referral_source": S,
            "services_interested": J,
            "estimated_value": N,
            "urgency": (S, {"default": "This Month"}),
            "notes": T,
            "next_follow_up": S,
            "assigned_to": S,
            "stage": (S, {"default": "New Lead"}),
            "probability": N,
            "meeting_type": S,
        },
    },
    "Signature": {
        "table": "signatures",
        "fields": {
            "document_id": S,
            "service_filing_id": S,
            # Denormalized (same reasoning as Document/DocumentComment's own
            # client_id) so a client-role user's read/create access can be
            # scoped directly, without a join through ServiceFiling.
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
        },
    },
    "WorkflowTemplate": {
        "table": "workflow_templates",
        "fields": {
            "template_name": (S, {"nullable": False}),
            "description": T,
            "service_category": S,
            "steps": J,
            "required_documents": J,
            "total_estimated_hours": N,
            "is_active": (B, {"default": True}),
        },
    },
    "FilingPipeline": {
        "table": "filing_pipelines",
        "fields": {
            "service_filing_id": (S, {"nullable": False}),
            "client_id": S,
            "filing_type": S,
            "current_stage": (S, {"default": "Client Data Collection"}),
            "stage_history": J,
            "cra_confirmation_number": S,
        },
    },
    "ProcessTemplate": {
        "table": "process_templates",
        "fields": {
            "process_name": (S, {"nullable": False}),
            "description": T,
            "frequency": S,
            "required_roles": J,
            "deadline_offset_days": I,
            "process_steps": J,
            "total_estimated_time": S,
            "service_type": S,
            "is_active": (B, {"default": True}),
        },
    },
    "Estimate": {
        "table": "estimates",
        "fields": {
            "client_id": S,
            "lead_id": S,
            "estimate_number": S,
            "services": J,
            "total_amount": N,
            "status": (S, {"default": "draft"}),
            "valid_until": S,
            "notes": T,
        },
    },
    "Activity": {
        "table": "activities",
        "fields": {
            "lead_id": S,
            # Populated for client-side activity (Client edits, ServiceFiling
            # created/status changes, Task created/completed, Document
            # uploaded) — see app/notify.py's log_activity, called as a
            # server-side side effect from routers/generic.py, never through
            # a user-initiated Activity.create.
            "client_id": S,
            "activity_type": S,
            "title": S,
            "from_stage": S,
            "to_stage": S,
            "performed_by": S,
            "activity_date": S,
            "details": T,
        },
    },
    "Communication": {
        "table": "communications",
        "fields": {
            "client_id": (S, {"nullable": False}),
            "communication_type": (S, {"default": "Note"}),  # Call | Email | Meeting | Note | Portal Message
            "subject": S,
            "notes": T,
            "communication_date": (S, {"nullable": False}),
            # Two-way thread support (Client Profile "Comms" tab + Client
            # Portal "Messages" tab share these rows): author_email/sender_type
            # are stamped server-side in routers/generic.py's create_entity,
            # never client-supplied, so a client can't post as staff or vice
            # versa.
            "author_email": S,
            "sender_type": (S, {"default": "staff"}),  # "staff" | "client"
        },
    },
    "AutomationRulesMaster": {
        "table": "automation_rules_masters",
        "fields": {
            "rule_name": S,
            "trigger_entity": S,
            "trigger_condition": S,
            "action_type": S,
            "is_active": (B, {"default": True}),
        },
    },
    "TaskTemplate": {
        "table": "task_templates",
        "fields": {
            "template_name": S,
            "description": T,
            "estimated_hours": N,
            "is_active": (B, {"default": True}),
        },
    },
    "Payment": {
        "table": "payments",
        "fields": {
            "invoice_id": S,
            "client_id": S,
            "payment_amount": N,
            "payment_date": S,
            "payment_method": S,
            "transaction_id": S,
            "payment_status": (S, {"default": "Completed"}),
        },
    },
    "PaymentMethod": {
        "table": "payment_methods",
        "fields": {
            "client_id": (S, {"nullable": False}),
            "payment_type": S,
            "is_active": (B, {"default": True}),
            "card_last4": S,
            "card_brand": S,
            "card_exp_month": S,
            "card_exp_year": S,
        },
    },
    "Announcement": {
        "table": "announcements",
        "fields": {
            "title": (S, {"nullable": False}),
            "body": T,
            "category": S,
            "published_by": S,
        },
    },
    "Conversation": {
        "table": "conversations",
        "fields": {
            "subject": S,
            "participant_emails": J,
            "created_by_email": S,
            "last_message_at": S,
        },
    },
    "Message": {
        "table": "messages",
        "fields": {
            "conversation_id": (S, {"nullable": False}),
            "sender_email": S,
            "body": T,
            "read_by": J,
        },
    },
    "Notification": {
        "table": "notifications",
        "fields": {
            "recipient_email": (S, {"nullable": False}),
            "type": S,
            "title": S,
            "body": T,
            "link_url": S,
            "is_read": (B, {"default": False}),
            "actor_email": S,
        },
    },
    "DocumentComment": {
        "table": "document_comments",
        "fields": {
            "document_id": (S, {"nullable": False}),
            "client_id": S,
            "author_email": S,
            "author_name": S,
            "body": T,
        },
    },
    "Office": {
        "table": "offices",
        "fields": {
            "name": (S, {"nullable": False}),
            "address": S,
            "city": S,
            "province": S,
            "phone": S,
            "email": S,
            "is_primary": (B, {"default": False}),
            "is_active": (B, {"default": True}),
        },
    },
    "Vendor": {
        "table": "vendors",
        "fields": {
            "name": (S, {"nullable": False}),
            "category": S,
            "contact_email": S,
            "phone": S,
            "website": S,
            "services": J,
            "status": (S, {"default": "Active"}),
        },
    },
    "DocumentType": {
        "table": "document_types_master",
        "fields": {
            "name": (S, {"nullable": False}),
            "category": S,
            "description": T,
            "is_active": (B, {"default": True}),
        },
    },
    "IndustryType": {
        "table": "industry_types",
        "fields": {
            "name": (S, {"nullable": False}),
            "is_active": (B, {"default": True}),
        },
    },
    "Package": {
        "table": "packages",
        "fields": {
            "name": (S, {"nullable": False}),
            "price": S,
            "billing_frequency": (S, {"default": "Monthly"}),
            "description": T,
            "is_active": (B, {"default": True}),
        },
    },
    "TeamMemberBookingProfile": {
        "table": "team_member_booking_profiles",
        "fields": {
            "user_email": (S, {"nullable": False}),
            "notify_email": S,
            "cc_emails": J,
            "zoom_link": S,
            "working_hours_start": (S, {"default": "09:00"}),
            "working_hours_end": (S, {"default": "17:00"}),
            "slot_duration_minutes": (I, {"default": 30}),
            "days_available": J,
            "is_active": (B, {"default": True}),
        },
    },
}

# Fields required on create, enforced by the generic router (mirrors each
# entity's `required` list from the original base44/entities/*.jsonc where
# one existed; left empty for entities that were always schemaless).
REQUIRED_FIELDS = {
    "Client": ["client_type", "legal_name", "primary_email"],
    "Service": ["service_category", "service_name"],
    "ServiceFiling": ["client_id", "service_name"],
    "User": ["role"],
    "Message": ["conversation_id"],
    "Notification": ["recipient_email"],
    "DocumentComment": ["document_id"],
    "Office": ["name"],
    "Vendor": ["name"],
    "DocumentType": ["name"],
    "IndustryType": ["name"],
    "Package": ["name"],
    "TeamMemberBookingProfile": ["user_email"],
    "Communication": ["client_id", "communication_date"],
}

# Columns that must never be serialized back to API clients.
EXCLUDED_FIELDS = {
    "User": {"hashed_password"},
}
