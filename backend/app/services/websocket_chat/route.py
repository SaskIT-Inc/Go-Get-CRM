"""
Live chat push endpoint for Conversations (internal staff/director chat) and
Communication (restricted client chat) — moved verbatim from the old
routers/ws_chat.py. A browser WebSocket handshake can't carry a custom
Authorization header, so the access token travels as a query param instead
— same JWT apiClient.js already sends as a Bearer header on every REST
call, just relocated for this one connection.

This endpoint only ever *receives* to detect disconnects; all real payloads
are server-initiated pushes from ws_manager.push(), called from each
entity's after_create hook right after a Message/Communication commit.
"""

from fastapi import APIRouter, WebSocketDisconnect
from sqlalchemy import select
from starlette.websockets import WebSocket

from ... import ws_manager
from ...database import SessionLocal
from ...models import MODELS
from ...security import decode_access_token

router = APIRouter(tags=["ws"])

User = MODELS["User"]


@router.websocket("/ws/chat")
async def chat_socket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    email = decode_access_token(token) if token else None
    if email is None:
        await websocket.close(code=1008)
        return

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    ws_manager.register(user.email, websocket)
    try:
        while True:
            # No client-originated messages are expected — this just blocks
            # until the socket closes so we notice the disconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.unregister(user.email, websocket)
