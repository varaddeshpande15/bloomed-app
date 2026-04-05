"""
WebSocket fan-out for multiplayer quiz rooms + internal notify endpoint.
Pairs with Next.js `notifyQuizPartySubscribers` and `/api/quiz-party/ws-token`.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from typing import Dict, List

from fastapi import APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter()

# party_id -> set of connected websockets
_rooms: Dict[str, List[WebSocket]] = {}


def _secret() -> str:
    return (os.environ.get("QUIZ_PARTY_NOTIFY_SECRET") or "").strip()


def verify_ws_token_simple(token: str, party_id: str) -> str | None:
    """
    Token format (UTF-8 before b64url): user_id|party_id|exp_unix|hex_hmac_sha256
    """
    sec = _secret()
    if not sec or not token:
        return None
    try:
        pad = "=" * (-len(token) % 4)
        decoded = base64.urlsafe_b64decode((token + pad).encode("ascii")).decode("utf-8")
    except Exception:
        return None
    parts = decoded.split("|")
    if len(parts) != 4:
        return None
    user_id, pid, exp_s, sig = parts
    if pid != party_id:
        return None
    if int(exp_s) < int(time.time()):
        return None
    msg = f"{user_id}|{pid}|{exp_s}"
    expected = hmac.new(sec.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return None
    return user_id


@router.websocket("/ws/quiz-party/{party_id}")
async def quiz_party_ws(websocket: WebSocket, party_id: str):
    token = websocket.query_params.get("token") or ""
    user_id = verify_ws_token_simple(token, party_id)
    if not user_id:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    if party_id not in _rooms:
        _rooms[party_id] = []
    _rooms[party_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        lst = _rooms.get(party_id)
        if lst and websocket in lst:
            lst.remove(websocket)
        if lst is not None and len(lst) == 0:
            _rooms.pop(party_id, None)


class NotifyBody(BaseModel):
    party_id: str


@router.post("/notify")
async def notify_party(
    body: NotifyBody,
    x_notify_secret: str | None = Header(None, alias="X-Notify-Secret"),
):
    sec = _secret()
    if not sec or x_notify_secret != sec:
        raise HTTPException(status_code=403, detail="Forbidden")
    party_id = body.party_id
    conns = list(_rooms.get(party_id) or [])
    dead: List[WebSocket] = []
    for ws in conns:
        try:
            await ws.send_json({"type": "refresh", "party_id": party_id})
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _rooms.get(party_id, []):
            _rooms[party_id].remove(ws)
    return {"ok": True, "delivered": len(conns) - len(dead)}
