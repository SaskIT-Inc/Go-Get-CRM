"""No special behavior beyond standard module-permission CRUD in the old
routers/generic.py — every hook defaults to a no-op."""
from .._shared.hooks import EntityHooks

hooks = EntityHooks()
