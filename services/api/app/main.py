from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from . import db, garmin, profile
from .agent import complete_chat, stream_chat
from .auth import get_account_id
from .config import settings
from .schemas import (
    ActivityDetailResponse,
    ActivityDTO,
    ActivityListResponse,
    ChatRequest,
    ChatResponse,
    DailyMetricDTO,
    GarminConnectRequest,
    GarminConnectResponse,
    GarminMfaRequest,
    GarminStatusResponse,
    GarminSyncRequest,
    GarminSyncResponse,
    HealthResponse,
    MetricsListResponse,
    PlanResponse,
    ProfileResponse,
    ProfileSectionDTO,
)


def _extract_activity_extras(raw: dict) -> dict:
    extras = {
        "training_effect_aerobic": raw.get("aerobicTrainingEffect"),
        "training_effect_anaerobic": raw.get("anaerobicTrainingEffect"),
        "training_effect_label": raw.get("trainingEffectLabel"),
        "avg_cadence": raw.get("averageRunningCadenceInStepsPerMinute")
        or raw.get("averageBikingCadenceInRevPerMinute"),
        "max_cadence": raw.get("maxRunningCadenceInStepsPerMinute")
        or raw.get("maxBikingCadenceInRevPerMinute"),
        "avg_power_w": raw.get("avgPower"),
        "max_power_w": raw.get("maxPower"),
        "normalized_power_w": raw.get("normPower"),
        "avg_stride_length_m": raw.get("avgStrideLength"),
        "avg_vertical_oscillation": raw.get("avgVerticalOscillation"),
        "avg_ground_contact_ms": raw.get("avgGroundContactTime"),
        "elevation_loss_m": raw.get("elevationLoss"),
        "min_elevation_m": raw.get("minElevation"),
        "max_elevation_m": raw.get("maxElevation"),
        "moving_duration_s": raw.get("movingDuration"),
        "lap_count": raw.get("lapCount"),
        "steps": raw.get("steps"),
        "min_temperature_c": raw.get("minTemperature"),
        "max_temperature_c": raw.get("maxTemperature"),
        "device": raw.get("deviceName"),
        "location": raw.get("locationName"),
        "activity_name": raw.get("activityName"),
    }
    return {k: v for k, v in extras.items() if v is not None}

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


AccountId = Annotated[str, Depends(get_account_id)]


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(model=settings.chat_model)


@app.get("/auth/me")
async def me(account_id: AccountId) -> dict[str, str]:
    return {"account_id": account_id}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, account_id: AccountId) -> ChatResponse:
    try:
        content, model_used = await complete_chat(account_id, req.messages, req.model)
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
async def chat_stream(req: ChatRequest, account_id: AccountId) -> EventSourceResponse:
    """SSE endpoint. Event types: token, tool_call, tool_result, done, error."""
    message_id = str(uuid.uuid4())
    model = req.model or settings.chat_model

    async def event_source():
        try:
            async for event_type, payload in stream_chat(account_id, req.messages, req.model):
                # Default nesting metadata for coach-origin events. Sub-agent
                # events already carry depth/agent (set in agents.spawn), so
                # setdefault leaves those untouched.
                if event_type in ("tool_call", "tool_result", "status"):
                    payload.setdefault("depth", 0)
                    payload.setdefault("agent", "coach")
                yield {"event": event_type, "data": json.dumps(payload)}
            yield {
                "event": "done",
                "data": json.dumps({"id": message_id, "model": model}),
            }
        except Exception as exc:
            log.exception("stream failed")
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}

    return EventSourceResponse(event_source())


# ---------------------------------------------------------------------------
# Garmin endpoints
# ---------------------------------------------------------------------------


@app.post("/garmin/connect", response_model=GarminConnectResponse)
async def garmin_connect(
    req: GarminConnectRequest, account_id: AccountId
) -> GarminConnectResponse:
    result = await garmin.connect(account_id, req.email, req.password)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.error or "Login fehlgeschlagen")
    return GarminConnectResponse(
        status=result.status,
        display_name=result.display_name,
        state_id=result.state_id,
    )


@app.post("/garmin/connect/mfa", response_model=GarminConnectResponse)
async def garmin_connect_mfa(
    req: GarminMfaRequest, account_id: AccountId
) -> GarminConnectResponse:
    result = await garmin.connect_mfa(account_id, req.state_id, req.code)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.error or "MFA fehlgeschlagen")
    return GarminConnectResponse(
        status=result.status,
        display_name=result.display_name,
    )


@app.get("/garmin/status", response_model=GarminStatusResponse)
async def garmin_status(account_id: AccountId) -> GarminStatusResponse:
    return GarminStatusResponse(**garmin.get_status(account_id))


@app.get("/activities", response_model=ActivityListResponse)
async def list_activities(
    account_id: AccountId,
    sport: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> ActivityListResponse:
    rows = db.list_activities(account_id, sport=sport, limit=min(limit, 200), offset=offset)
    sports = db.distinct_sports(account_id)
    activities = [ActivityDTO(**{k: r.get(k) for k in ActivityDTO.model_fields}) for r in rows]
    return ActivityListResponse(activities=activities, sports=sports, returned=len(activities))


@app.get("/metrics", response_model=MetricsListResponse)
async def list_metrics(account_id: AccountId, days: int = 30) -> MetricsListResponse:
    rows = db.get_daily_metrics(account_id, max(1, min(days, 180)))
    metrics = [DailyMetricDTO(**{k: r.get(k) for k in DailyMetricDTO.model_fields}) for r in rows]
    return MetricsListResponse(metrics=metrics, returned=len(metrics))


@app.get("/activities/{garmin_activity_id}", response_model=ActivityDetailResponse)
async def activity_detail(
    garmin_activity_id: str, account_id: AccountId
) -> ActivityDetailResponse:
    row = db.get_activity(account_id, garmin_activity_id)
    if not row:
        raise HTTPException(status_code=404, detail="Activity nicht gefunden")
    raw = row.get("raw_data") or {}
    activity = ActivityDTO(**{k: row.get(k) for k in ActivityDTO.model_fields})
    return ActivityDetailResponse(activity=activity, extras=_extract_activity_extras(raw))


@app.post("/garmin/sync", response_model=GarminSyncResponse)
async def garmin_sync(
    account_id: AccountId,
    req: GarminSyncRequest | None = None,
) -> GarminSyncResponse:
    if not garmin.is_connected(account_id):
        raise HTTPException(status_code=400, detail="Garmin nicht verbunden")
    days = req.days if req and req.days else 365
    try:
        result = await garmin.sync_all(account_id, days=days)
    except Exception as exc:
        log.exception("Garmin sync failed")
        raise HTTPException(status_code=502, detail=f"Sync fehlgeschlagen: {exc}") from exc
    return GarminSyncResponse(**result)


@app.delete("/garmin/disconnect")
async def garmin_disconnect(account_id: AccountId) -> dict[str, str]:
    garmin.disconnect(account_id)
    return {"status": "disconnected"}


# ---------------------------------------------------------------------------
# Athlete profile
# ---------------------------------------------------------------------------


@app.get("/profile", response_model=ProfileResponse)
async def get_profile(account_id: AccountId) -> ProfileResponse:
    sections = profile.read_sections_ordered(account_id)
    dtos = [
        ProfileSectionDTO(
            name=s["name"],
            content=s["content"],
            empty=not s["content"].strip(),
        )
        for s in sections
    ]
    filled = sum(1 for d in dtos if not d.empty)
    return ProfileResponse(
        sections=dtos,
        is_empty=all(d.empty for d in dtos),
        onboarding_completed=profile.is_onboarded(account_id),
        filled_sections=filled,
    )


# ---------------------------------------------------------------------------
# Account-level reset
# ---------------------------------------------------------------------------


@app.get("/plan", response_model=PlanResponse)
async def get_plan(account_id: AccountId) -> PlanResponse:
    row = db.get_plan_by_status(account_id, "active") or db.get_plan_by_status(
        account_id, "draft"
    )
    if not row:
        return PlanResponse(has_plan=False)
    return PlanResponse(
        has_plan=True,
        status=row["status"],
        plan_id=row["id"],
        rationale=row.get("rationale"),
        weeks=(row.get("plan_data") or {}).get("weeks", []),
    )


@app.post("/account/reset")
async def account_reset(account_id: AccountId) -> dict[str, str]:
    """Wipe all account-scoped data: garmin tokens, synced data, profile sections."""
    garmin.disconnect(account_id, wipe_data=True)
    profile.reset(account_id)
    log.info("Account reset for %s", account_id)
    return {"status": "reset"}
