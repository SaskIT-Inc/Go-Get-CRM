from .._shared.crud_engine import build_entity_router
from .service import hooks

router = build_entity_router("Communication", hooks=hooks)
