from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "assistant", "system"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=200)
    model: str | None = Field(
        default=None,
        description="Optional litellm model override (e.g. 'gemini/gemini-2.5-flash').",
    )


class ChatResponse(BaseModel):
    id: str
    content: str
    model: str
    created_at: datetime


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    model: str


class GarminConnectRequest(BaseModel):
    email: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class GarminMfaRequest(BaseModel):
    state_id: str = Field(min_length=1)
    code: str = Field(min_length=1, max_length=20)


class GarminConnectResponse(BaseModel):
    status: Literal["connected", "needs_mfa", "error"]
    display_name: str | None = None
    state_id: str | None = None
    error: str | None = None


class GarminStatusResponse(BaseModel):
    connected: bool
    display_name: str | None = None
    email: str | None = None
    connected_since: str | None = None
    last_sync_at: str | None = None
    activity_count: int
    latest_activity_date: str | None = None


class GarminSyncRequest(BaseModel):
    days: int | None = Field(default=None, ge=1, le=365)


class GarminSyncResponse(BaseModel):
    activities_synced: int
    daily_metrics_synced: int
    days: int
    last_sync_at: str


class ProfileSectionDTO(BaseModel):
    name: str
    content: str
    empty: bool


class ProfileResponse(BaseModel):
    sections: list[ProfileSectionDTO]
    is_empty: bool
    onboarding_completed: bool
    filled_sections: int


class ActivityDTO(BaseModel):
    garmin_activity_id: str
    sport: str | None = None
    start_time: str | None = None
    duration_seconds: int | None = None
    distance_meters: float | None = None
    avg_hr: int | None = None
    max_hr: int | None = None
    calories: int | None = None
    training_effect: float | None = None
    avg_pace_min_km: float | None = None
    elevation_gain_m: float | None = None


class ActivityListResponse(BaseModel):
    activities: list[ActivityDTO]
    sports: list[str]
    returned: int


class DailyMetricDTO(BaseModel):
    date: str
    resting_heart_rate: int | None = None
    hrv_avg: float | None = None
    sleep_score: int | None = None
    sleep_duration_minutes: float | None = None
    sleep_deep_minutes: float | None = None
    sleep_light_minutes: float | None = None
    sleep_rem_minutes: float | None = None
    sleep_awake_minutes: float | None = None
    stress_avg: int | None = None
    body_battery_high: int | None = None
    body_battery_low: int | None = None
    recovery_score: int | None = None
    steps: int | None = None
    active_calories: int | None = None
    total_calories: int | None = None
    vo2max: float | None = None
    intensity_minutes: int | None = None
    spo2_avg: float | None = None
    respiration_avg: float | None = None


class MetricsListResponse(BaseModel):
    metrics: list[DailyMetricDTO]
    returned: int


class ActivityDetailResponse(BaseModel):
    activity: ActivityDTO
    extras: dict[str, object] = {}
