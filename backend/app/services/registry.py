"""Collects every entity service's router into one list, so main.py
registers all 39 with a single loop instead of 39 explicit import + 
include_router lines. Still fully explicit (a plain Python list, no
filesystem scanning/importlib magic) -- just centralizes the list here
instead of in main.py."""

from .user import route as _user
from .client import route as _client
from .service_catalog import route as _service_catalog
from .service_filing import route as _service_filing
from .task import route as _task
from .appointment import route as _appointment
from .invoice import route as _invoice
from .document import route as _document
from .retainer import route as _retainer
from .service_master import route as _service_master
from .status_stage_master import route as _status_stage_master
from .document_checklist import route as _document_checklist
from .task_comment import route as _task_comment
from .compliance_alert import route as _compliance_alert
from .email_draft import route as _email_draft
from .lead import route as _lead
from .signature import route as _signature
from .workflow_template import route as _workflow_template
from .filing_pipeline import route as _filing_pipeline
from .process_template import route as _process_template
from .estimate import route as _estimate
from .activity import route as _activity
from .communication import route as _communication
from .automation_rules_master import route as _automation_rules_master
from .task_template import route as _task_template
from .payment import route as _payment
from .payment_method import route as _payment_method
from .announcement import route as _announcement
from .conversation import route as _conversation
from .message import route as _message
from .notification import route as _notification
from .document_comment import route as _document_comment
from .office import route as _office
from .vendor import route as _vendor
from .document_type import route as _document_type
from .industry_type import route as _industry_type
from .package import route as _package
from .team_member_booking_profile import route as _team_member_booking_profile
from .recurring_email_sequence import route as _recurring_email_sequence

ALL_ENTITY_ROUTERS = [
    _user.router,
    _client.router,
    _service_catalog.router,
    _service_filing.router,
    _task.router,
    _appointment.router,
    _invoice.router,
    _document.router,
    _retainer.router,
    _service_master.router,
    _status_stage_master.router,
    _document_checklist.router,
    _task_comment.router,
    _compliance_alert.router,
    _email_draft.router,
    _lead.router,
    _signature.router,
    _workflow_template.router,
    _filing_pipeline.router,
    _process_template.router,
    _estimate.router,
    _activity.router,
    _communication.router,
    _automation_rules_master.router,
    _task_template.router,
    _payment.router,
    _payment_method.router,
    _announcement.router,
    _conversation.router,
    _message.router,
    _notification.router,
    _document_comment.router,
    _office.router,
    _vendor.router,
    _document_type.router,
    _industry_type.router,
    _package.router,
    _team_member_booking_profile.router,
    _recurring_email_sequence.router,
]

# Routes with a fixed path outside their own entity prefix (e.g.
# /api/notifications/mark-all-read, not /api/Notification/...).
EXTRA_ROUTERS = [
    _notification.extra_router,
]
