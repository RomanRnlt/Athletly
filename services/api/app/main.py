from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from . import db, garmin
from .agent import complete_chat, stream_chat
from .config import settings
from .schemas import (
    ChatRequest,
    ChatResponse,
    GarminConnectRequest,
    GarminConnectResponse,
    GarminMfaRequest,
    GarminStatusResponse,
    GarminSyncRequest,
    GarminSyncResponse,
    HealthResponse,
)

logging.basicConfig(level=settings.log_level.upper())
log = logging.getLogger("athletly.api")

app = FastAPI(title="Athletly API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _on_startup() -> None:
    db.init_db()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(model=settings.chat_model)


# ---------------------------------------------------------------------------
# Garmin endpoints
# ---------------------------------------------------------------------------


@app.post("/garmin/connect", response_model=GarminConnectResponse)
async def garmin_connect(req: GarminConnectRequest) -> GarminConnectResponse:
    result = await garmin.connect(req.email, req.password)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.error or "Login fehlgeschlagen")
    return GarminConnectResponse(
        status=result.status,
        display_name=result.display_name,
        state_id=result.state_id,
    )


@app.post("/garmin/connect/mfa", response_model=GarminConnectResponse)
async def garmin_connect_mfa(req: GarminMfaRequest) -> GarminConnectResponse:
    result = await garmin.connect_mfa(req.state_id, req.code)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.error or "MFA fehlgeschlagen")
    return GarminConnectResponse(
        status=result.status,
        display_name=result.display_name,
    )


@app.get("/garmin/status", response_model=GarminStatusResponse)
async def garmin_status() -> GarminStatusResponse:
    return GarminStatusResponse(**garmin.get_status())


@app.post("/garmin/sync", response_model=GarminSyncResponse)
async def garmin_sync(req: GarminSyncRequest | None = None) -> GarminSyncResponse:
    if not garmin.is_connected():
        raise HTTPException(status_code=400, detail="Garmin nicht verbunden")
    days = req.days if req and req.days else 365
    try:
        result = await garmin.sync_all(days=days)
    except Exception as exc:
        log.exception("Garmin sync failed")
        raise HTTPException(status_code=502, detail=f"Sync fehlgeschlagen: {exc}") from exc
    return GarminSyncResponse(**result)


@app.delete("/garmin/disconnect")
async def garmin_disconnect() -> dict[str, str]:
    garmin.disconnect()
    return {"status": "disconnected"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    try:
        content, model_used = await complete_chat(req.messages, req.model)
    except Exception as exc:
        log.exception("chat failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return ChatResponse(
        id=str(uuid.uuid4()),
        content=content,
        model=model_used,
        created_at=datetime.now(timezone.utc),
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest) -> EventSourceResponse:
    """SSE endpoint. Event types emitted:

    - token        -> {"delta": "..."}            content token delta
    - tool_call    -> {"name": "...", "args": {}} agent invokes a tool
    - tool_result  -> {"name": "...", "preview": "..."} tool returned
    - done         -> {"id": "...", "model": "..."}    stream finished
    - error        -> {"message": "..."}               unrecoverable failure
    """
    message_id = str(uuid.uuid4())
    model = req.model or settings.chat_model

    async def event_source():
        try:
            async for event_type, payload in stream_chat(req.messages, req.model):
                yield {"event": event_type, "data": json.dumps(payload)}
            yield {
                "event": "done",
                "data": json.dumps({"id": message_id, "model": model}),
            }
        except Exception as exc:
            log.exception("stream failed")
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}

    return EventSourceResponse(event_source())
