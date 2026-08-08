"""Assembles ENTITY_DEFINITIONS/REQUIRED_FIELDS/EXCLUDED_FIELDS from every
services/<name>/schema.py -- each entity's full schema (fields + required +
excluded) now lives with that entity's service.py/route.py, not as one giant
dict literal here. This file is purely the assembly point models/factory.py
and models/__init__.py already import from, so neither of those needed to
change.

Explicit imports (not a dynamic services/ directory scan) -- matches this
codebase's existing preference for plain, greppable code.
"""

from ..services.user import schema as _user
from ..services.client import schema as _client
from ..services.service_catalog import schema as _service_catalog
from ..services.service_filing import schema as _service_filing
from ..services.task import schema as _task
from ..services.appointment import schema as _appointment
from ..services.invoice import schema as _invoice
from ..services.document import schema as _document
from ..services.retainer import schema as _retainer
from ..services.service_master import schema as _service_master
from ..services.status_stage_master import schema as _status_stage_master
from ..services.document_checklist import schema as _document_checklist
from ..services.task_comment import schema as _task_comment
from ..services.compliance_alert import schema as _compliance_alert
from ..services.email_draft import schema as _email_draft
from ..services.lead import schema as _lead
from ..services.signature import schema as _signature
from ..services.workflow_template import schema as _workflow_template
from ..services.filing_pipeline import schema as _filing_pipeline
from ..services.process_template import schema as _process_template
from ..services.estimate import schema as _estimate
from ..services.activity import schema as _activity
from ..services.communication import schema as _communication
from ..services.automation_rules_master import schema as _automation_rules_master
from ..services.task_template import schema as _task_template
from ..services.payment import schema as _payment
from ..services.payment_method import schema as _payment_method
from ..services.announcement import schema as _announcement
from ..services.conversation import schema as _conversation
from ..services.message import schema as _message
from ..services.notification import schema as _notification
from ..services.document_comment import schema as _document_comment
from ..services.office import schema as _office
from ..services.vendor import schema as _vendor
from ..services.document_type import schema as _document_type
from ..services.industry_type import schema as _industry_type
from ..services.package import schema as _package
from ..services.team_member_booking_profile import schema as _team_member_booking_profile
from ..services.recurring_email_sequence import schema as _recurring_email_sequence

ENTITY_DEFINITIONS = {
    "User": {"table": _user.TABLE, "fields": _user.FIELDS},
    "Client": {"table": _client.TABLE, "fields": _client.FIELDS},
    "Service": {"table": _service_catalog.TABLE, "fields": _service_catalog.FIELDS},
    "ServiceFiling": {"table": _service_filing.TABLE, "fields": _service_filing.FIELDS},
    "Task": {"table": _task.TABLE, "fields": _task.FIELDS},
    "Appointment": {"table": _appointment.TABLE, "fields": _appointment.FIELDS},
    "Invoice": {"table": _invoice.TABLE, "fields": _invoice.FIELDS},
    "Document": {"table": _document.TABLE, "fields": _document.FIELDS},
    "Retainer": {"table": _retainer.TABLE, "fields": _retainer.FIELDS},
    "ServiceMaster": {"table": _service_master.TABLE, "fields": _service_master.FIELDS},
    "StatusStageMaster": {"table": _status_stage_master.TABLE, "fields": _status_stage_master.FIELDS},
    "DocumentChecklist": {"table": _document_checklist.TABLE, "fields": _document_checklist.FIELDS},
    "TaskComment": {"table": _task_comment.TABLE, "fields": _task_comment.FIELDS},
    "ComplianceAlert": {"table": _compliance_alert.TABLE, "fields": _compliance_alert.FIELDS},
    "EmailDraft": {"table": _email_draft.TABLE, "fields": _email_draft.FIELDS},
    "Lead": {"table": _lead.TABLE, "fields": _lead.FIELDS},
    "Signature": {"table": _signature.TABLE, "fields": _signature.FIELDS},
    "WorkflowTemplate": {"table": _workflow_template.TABLE, "fields": _workflow_template.FIELDS},
    "FilingPipeline": {"table": _filing_pipeline.TABLE, "fields": _filing_pipeline.FIELDS},
    "ProcessTemplate": {"table": _process_template.TABLE, "fields": _process_template.FIELDS},
    "Estimate": {"table": _estimate.TABLE, "fields": _estimate.FIELDS},
    "Activity": {"table": _activity.TABLE, "fields": _activity.FIELDS},
    "Communication": {"table": _communication.TABLE, "fields": _communication.FIELDS},
    "AutomationRulesMaster": {"table": _automation_rules_master.TABLE, "fields": _automation_rules_master.FIELDS},
    "TaskTemplate": {"table": _task_template.TABLE, "fields": _task_template.FIELDS},
    "Payment": {"table": _payment.TABLE, "fields": _payment.FIELDS},
    "PaymentMethod": {"table": _payment_method.TABLE, "fields": _payment_method.FIELDS},
    "Announcement": {"table": _announcement.TABLE, "fields": _announcement.FIELDS},
    "Conversation": {"table": _conversation.TABLE, "fields": _conversation.FIELDS},
    "Message": {"table": _message.TABLE, "fields": _message.FIELDS},
    "Notification": {"table": _notification.TABLE, "fields": _notification.FIELDS},
    "DocumentComment": {"table": _document_comment.TABLE, "fields": _document_comment.FIELDS},
    "Office": {"table": _office.TABLE, "fields": _office.FIELDS},
    "Vendor": {"table": _vendor.TABLE, "fields": _vendor.FIELDS},
    "DocumentType": {"table": _document_type.TABLE, "fields": _document_type.FIELDS},
    "IndustryType": {"table": _industry_type.TABLE, "fields": _industry_type.FIELDS},
    "Package": {"table": _package.TABLE, "fields": _package.FIELDS},
    "TeamMemberBookingProfile": {"table": _team_member_booking_profile.TABLE, "fields": _team_member_booking_profile.FIELDS},
    "RecurringEmailSequence": {"table": _recurring_email_sequence.TABLE, "fields": _recurring_email_sequence.FIELDS},
}

# Fields required on create, enforced by the CRUD engine (mirrors each
# entity's `required` list from the original base44/entities/*.jsonc where
# one existed; omitted for entities that were always schemaless).
REQUIRED_FIELDS = {
    "User": _user.REQUIRED,
    "Client": _client.REQUIRED,
    "Service": _service_catalog.REQUIRED,
    "ServiceFiling": _service_filing.REQUIRED,
    "Task": _task.REQUIRED,
    "Appointment": _appointment.REQUIRED,
    "Invoice": _invoice.REQUIRED,
    "Document": _document.REQUIRED,
    "Retainer": _retainer.REQUIRED,
    "ServiceMaster": _service_master.REQUIRED,
    "StatusStageMaster": _status_stage_master.REQUIRED,
    "DocumentChecklist": _document_checklist.REQUIRED,
    "TaskComment": _task_comment.REQUIRED,
    "ComplianceAlert": _compliance_alert.REQUIRED,
    "EmailDraft": _email_draft.REQUIRED,
    "Lead": _lead.REQUIRED,
    "Signature": _signature.REQUIRED,
    "WorkflowTemplate": _workflow_template.REQUIRED,
    "FilingPipeline": _filing_pipeline.REQUIRED,
    "ProcessTemplate": _process_template.REQUIRED,
    "Estimate": _estimate.REQUIRED,
    "Activity": _activity.REQUIRED,
    "Communication": _communication.REQUIRED,
    "AutomationRulesMaster": _automation_rules_master.REQUIRED,
    "TaskTemplate": _task_template.REQUIRED,
    "Payment": _payment.REQUIRED,
    "PaymentMethod": _payment_method.REQUIRED,
    "Announcement": _announcement.REQUIRED,
    "Conversation": _conversation.REQUIRED,
    "Message": _message.REQUIRED,
    "Notification": _notification.REQUIRED,
    "DocumentComment": _document_comment.REQUIRED,
    "Office": _office.REQUIRED,
    "Vendor": _vendor.REQUIRED,
    "DocumentType": _document_type.REQUIRED,
    "IndustryType": _industry_type.REQUIRED,
    "Package": _package.REQUIRED,
    "TeamMemberBookingProfile": _team_member_booking_profile.REQUIRED,
    "RecurringEmailSequence": _recurring_email_sequence.REQUIRED,
}
REQUIRED_FIELDS = {k: v for k, v in REQUIRED_FIELDS.items() if v}

# Columns that must never be serialized back to API clients.
EXCLUDED_FIELDS = {
    "User": _user.EXCLUDED,
    "Client": _client.EXCLUDED,
    "Service": _service_catalog.EXCLUDED,
    "ServiceFiling": _service_filing.EXCLUDED,
    "Task": _task.EXCLUDED,
    "Appointment": _appointment.EXCLUDED,
    "Invoice": _invoice.EXCLUDED,
    "Document": _document.EXCLUDED,
    "Retainer": _retainer.EXCLUDED,
    "ServiceMaster": _service_master.EXCLUDED,
    "StatusStageMaster": _status_stage_master.EXCLUDED,
    "DocumentChecklist": _document_checklist.EXCLUDED,
    "TaskComment": _task_comment.EXCLUDED,
    "ComplianceAlert": _compliance_alert.EXCLUDED,
    "EmailDraft": _email_draft.EXCLUDED,
    "Lead": _lead.EXCLUDED,
    "Signature": _signature.EXCLUDED,
    "WorkflowTemplate": _workflow_template.EXCLUDED,
    "FilingPipeline": _filing_pipeline.EXCLUDED,
    "ProcessTemplate": _process_template.EXCLUDED,
    "Estimate": _estimate.EXCLUDED,
    "Activity": _activity.EXCLUDED,
    "Communication": _communication.EXCLUDED,
    "AutomationRulesMaster": _automation_rules_master.EXCLUDED,
    "TaskTemplate": _task_template.EXCLUDED,
    "Payment": _payment.EXCLUDED,
    "PaymentMethod": _payment_method.EXCLUDED,
    "Announcement": _announcement.EXCLUDED,
    "Conversation": _conversation.EXCLUDED,
    "Message": _message.EXCLUDED,
    "Notification": _notification.EXCLUDED,
    "DocumentComment": _document_comment.EXCLUDED,
    "Office": _office.EXCLUDED,
    "Vendor": _vendor.EXCLUDED,
    "DocumentType": _document_type.EXCLUDED,
    "IndustryType": _industry_type.EXCLUDED,
    "Package": _package.EXCLUDED,
    "TeamMemberBookingProfile": _team_member_booking_profile.EXCLUDED,
    "RecurringEmailSequence": _recurring_email_sequence.EXCLUDED,
}
EXCLUDED_FIELDS = {k: v for k, v in EXCLUDED_FIELDS.items() if v}
