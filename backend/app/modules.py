"""
Single source of truth for the role/permission system: which CRM module each
entity belongs to, which actions exist, who can invite whom, and the fixed
client-portal allowlists. Read by routers/generic.py (enforcement) and
routers/auth.py (invite rights). Same "plain dict, no DB table" philosophy as
plans.py — a permission change ships atomically with the code that enforces
it.

Role hierarchy: director > admin > manager > bookkeeper > client. Director
registers the firm and is never invited; admin/manager/bookkeeper carry a
`permissions` matrix set at invite time; client is a fixed, uneditable
surface (see CLIENT_READ_ENTITIES/CLIENT_CREATE_ENTITIES).
"""

from .models import ENTITY_DEFINITIONS

ACTIONS = ("view", "create", "edit", "delete")

STAFF_ROLES = {
    "director", "admin", "manager", "bookkeeper",
    "accountant", "business_consultant", "cpa", "intern", "other",
}

# Roles that can see and oversee every team member's tasks (not just their
# own) — director/admin already have full-firm reach via other modules;
# manager joins them here specifically for task oversight. Every other
# STAFF_ROLE is an individual contributor, scoped to their own assignments
# (see generic.py's _task_scope_filter).
MANAGERIAL_ROLES = {"director", "admin", "manager"}

# Who each role is allowed to invite. Director can invite anyone but itself;
# Admin can invite anyone but director/admin; every other role invites no one
# (absent from this dict -> INVITABLE.get(role, set()) is empty).
INVITABLE = {
    "director": {"admin", "manager", "bookkeeper", "accountant", "business_consultant", "cpa", "intern", "other", "client"},
    "admin": {"manager", "bookkeeper", "accountant", "business_consultant", "cpa", "intern", "other", "client"},
}

# key -> {label, entities, director_implied}. director_implied=True means a
# Director's access to that module is always-on (not stored, see
# effective_permissions below) rather than governed by their own matrix.
MODULES = {
    "tasks": {
        "label": "Tasks & Workspace",
        "entities": {"Task", "TaskComment", "TaskTemplate"},
        "director_implied": True,
    },
    "calendar": {
        "label": "Calendar",
        "entities": {"Appointment"},
        "director_implied": True,
    },
    "documents": {
        "label": "Documents",
        "entities": {"Document", "DocumentChecklist", "Signature", "DocumentComment"},
        "director_implied": True,
    },
    "email": {
        "label": "Email",
        "entities": {"EmailDraft"},
        "director_implied": True,
    },
    "clients": {
        "label": "Clients",
        "entities": {"Client", "Communication", "RecurringEmailSequence"},
        "director_implied": True,
    },
    "filings": {
        "label": "Filings & Work",
        "entities": {"ServiceFiling", "FilingPipeline"},
        "director_implied": True,
    },
    "compliance": {
        "label": "Compliance",
        "entities": {"ComplianceAlert"},
        "director_implied": True,
    },
    "leads": {
        "label": "Leads & Sales",
        "entities": {"Lead", "Activity"},
        "director_implied": True,
    },
    "billing": {
        "label": "Billing & Payments",
        "entities": {"Invoice", "Payment", "PaymentMethod", "Estimate", "Retainer"},
        "director_implied": True,
    },
    "services": {
        "label": "Service Catalog",
        "entities": {"Service", "Package"},
        "director_implied": True,
    },
    "team": {
        "label": "Team",
        "entities": {"User"},
        "director_implied": True,
    },
    "settings": {
        "label": "Firm Settings",
        "entities": {
            "ServiceMaster",
            "StatusStageMaster",
            "WorkflowTemplate",
            "ProcessTemplate",
            "AutomationRulesMaster",
            "Office",
            "Vendor",
            "DocumentType",
            "TeamMemberBookingProfile",
            "IndustryType",
        },
        "director_implied": True,
    },
    "analytics": {
        "label": "Reports & Analytics",
        "entities": set(),  # page-gating only; underlying data comes from other modules
        "director_implied": True,
    },
    "announcements": {
        "label": "Announcements",
        "entities": {"Announcement"},
        "director_implied": True,
    },
    "conversations": {
        "label": "Conversations",
        "entities": {"Conversation", "Message"},
        # Live internal chat: every staff member (Director included) can
        # always reach it, same as every other module — a Director isn't
        # excluded from the firm's own chat by default.
        "director_implied": True,
    },
    "notifications": {
        "label": "Notifications",
        "entities": {"Notification"},
        # Bookkeeping only — generic.py special-cases Notification before
        # this module is ever consulted (own-feed-only for every staff role,
        # regardless of their matrix; see _authorize_notification).
        "director_implied": True,
    },
}

ENTITY_MODULE: dict[str, str] = {
    entity: key for key, spec in MODULES.items() for entity in spec["entities"]
}

_unmapped = set(ENTITY_DEFINITIONS) - set(ENTITY_MODULE)
assert not _unmapped, f"modules.py: entities missing from MODULES: {_unmapped}"
_duplicates = [e for e in ENTITY_MODULE if sum(e in spec["entities"] for spec in MODULES.values()) > 1]
assert not _duplicates, f"modules.py: entities mapped to more than one module: {_duplicates}"

# Client portal: a fixed, non-configurable surface (not part of the
# permissions matrix at all — clients never get a matrix).
CLIENT_READ_ENTITIES = {
    "Client", "ServiceFiling", "FilingPipeline", "Task", "Document", "DocumentChecklist", "DocumentComment",
    "Communication", "Signature",
}
CLIENT_CREATE_ENTITIES = {"Document", "DocumentComment", "Communication", "Signature"}


def normalize_matrix(raw: dict | None) -> dict[str, list[str]]:
    """Validate + normalize a permissions payload for storage: unknown
    modules/actions are rejected (so a typo surfaces immediately rather than
    silently granting nothing), and create/edit/delete each imply view."""
    if not raw:
        return {}
    normalized: dict[str, set[str]] = {}
    for module, actions in raw.items():
        if module not in MODULES:
            raise ValueError(f"Unknown module '{module}'")
        action_set = set(actions or [])
        unknown = action_set - set(ACTIONS)
        if unknown:
            raise ValueError(f"Unknown action(s) for module '{module}': {sorted(unknown)}")
        if action_set & {"create", "edit", "delete"}:
            action_set.add("view")
        normalized[module] = action_set
    return {module: sorted(actions) for module, actions in normalized.items() if actions}


def effective_permissions(user) -> dict[str, set[str]]:
    """The actual, current module->actions grant for a user: their stored
    matrix (filtered to modules that still exist), plus every
    director_implied module fully granted if they're a director. Computing
    this instead of storing a director's full matrix means new modules are
    automatically available to directors without a data migration."""
    stored = {
        module: set(actions)
        for module, actions in (user.permissions or {}).items()
        if module in MODULES
    }
    if getattr(user, "role", None) == "director":
        for key, spec in MODULES.items():
            if spec["director_implied"]:
                stored[key] = set(ACTIONS)
    return stored


def has_permission(user, module: str, action: str) -> bool:
    return action in effective_permissions(user).get(module, set())
