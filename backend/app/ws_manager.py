"""
In-memory WebSocket connection registry for live chat push (Conversations +
Communication). Keyed by lowercase user email so every open tab/device for a
user receives a push. This is correct for the current single-container
deployment (docker-compose.yml runs one app instance); a multi-replica
deployment would need a shared pub/sub layer (e.g. Redis) instead, since each
replica would only know about its own local connections.
"""

import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_connections: dict[str, set[WebSocket]] = {}


def register(email: str, ws: WebSocket) -> None:
    _connections.setdefault(email, set()).add(ws)


def unregister(email: str, ws: WebSocket) -> None:
    sockets = _connections.get(email)
    if not sockets:
        return
    sockets.discard(ws)
    if not sockets:
        _connections.pop(email, None)


async def push(emails: list[str], payload: dict) -> None:
    """Best-effort fan-out to every currently-connected socket for the given
    emails. Dead sockets are dropped silently — callers already wrap this in
    try/except, and a stale connection here is expected, not exceptional."""
    for email in set(emails):
        sockets = _connections.get(email)
        if not sockets:
            continue
        for ws in list(sockets):
            try:
                await ws.send_json(payload)
            except Exception:
                unregister(email, ws)
