from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .agent import complete_chat, stream_chat
from .config import settings
from .schemas import ChatRequest, ChatResponse, HealthResponse

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


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(model=settings.chat_model)


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
    """SSE endpoint. Emits events:
    - event: token   -> {"delta": "..."}
    - event: done    -> {"id": "...", "model": "..."}
    - event: error   -> {"message": "..."}
    """
    message_id = str(uuid.uuid4())
    model = req.model or settings.chat_model

    async def event_source():
        try:
            async for token in stream_chat(req.messages, req.model):
                yield {"event": "token", "data": json.dumps({"delta": token})}
            yield {
                "event": "done",
                "data": json.dumps({"id": message_id, "model": model}),
            }
        except Exception as exc:
            log.exception("stream failed")
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}

    return EventSourceResponse(event_source())
