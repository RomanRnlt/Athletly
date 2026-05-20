"""Garmin Connect integration.

Single-user MVP: persists Garth tokens in a JSON file on disk, restores a
logged-in client on demand, syncs activities + daily metrics into SQLite
via the helpers in ``app.db``.

MFA is supported via the two-step ``connect`` / ``connect_mfa`` flow.
Partially-authenticated Garmin instances are kept in a module-level dict
keyed by a short-lived state_id while the UI prompts the user for the
6-digit code.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from garminconnect import Garmin

from . import db

logger = logging.getLogger(__name__)

TOKENS_PATH = db.DATA_DIR / "garmin_tokens.json"
MFA_TTL_SECONDS = 300
_pending_mfa: dict[str, tuple[float, Garmin]] = {}


@dataclass
class ConnectResult:
    status: str
    display_name: str | None = None
    state_id: str | None = None
    error: str | None = None


# ---------------------------------------------------------------------------
# Token persistence
# ---------------------------------------------------------------------------


def _save_tokens(client_dump: str, email: str, display_name: str) -> None:
    TOKENS_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "tokens": client_dump,
        "email": email,
        "display_name": display_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    TOKENS_PATH.write_text(json.dumps(payload))


def _load_tokens() -> dict[str, Any] | None:
    if not TOKENS_PATH.exists():
        return None
    try:
        return json.loads(TOKENS_PATH.read_text())
    except Exception:
        logger.exception("Failed to read garmin_tokens.json")
        return None


def is_connected() -> bool:
    return _load_tokens() is not None


def get_status() -> dict[str, Any]:
    tokens = _load_tokens()
    return {
        "connected": tokens is not None,
        "display_name": tokens.get("display_name") if tokens else None,
        "email": tokens.get("email") if tokens else None,
        "connected_since": tokens.get("created_at") if tokens else None,
        "last_sync_at": db.get_sync_state("last_sync_at"),
        "activity_count": db.count_activities(),
        "latest_activity_date": db.latest_activity_date(),
    }


def disconnect(wipe_data: bool = True) -> None:
    if TOKENS_PATH.exists():
        TOKENS_PATH.unlink()
    if wipe_data:
        db.truncate_all()


# ---------------------------------------------------------------------------
# Connect flow
# ---------------------------------------------------------------------------


def _prune_pending_mfa() -> None:
    now = time.time()
    expired = [k for k, (ts, _) in _pending_mfa.items() if now - ts > MFA_TTL_SECONDS]
    for k in expired:
        _pending_mfa.pop(k, None)


def _finalize(garmin: Garmin, email: str) -> ConnectResult:
    token_str = garmin.client.dumps()
    display_name = garmin.display_name or garmin.full_name or email
    _save_tokens(token_str, email, display_name)
    db.set_sync_state("display_name", display_name)
    return ConnectResult(status="connected", display_name=display_name)


def _login_sync(email: str, password: str) -> tuple[str | None, Garmin]:
    garmin = Garmin(email, password, return_on_mfa=True)
    mfa_status, _ = garmin.login()
    return mfa_status, garmin


async def connect(email: str, password: str) -> ConnectResult:
    _prune_pending_mfa()
    try:
        mfa_status, garmin = await asyncio.to_thread(_login_sync, email, password)
    except Exception as exc:
        logger.warning("Garmin login failed for %s: %s", email, exc)
        return ConnectResult(status="error", error=str(exc))

    if mfa_status == "needs_mfa":
        state_id = secrets.token_urlsafe(16)
        _pending_mfa[state_id] = (time.time(), garmin)
        # Garmin instance carries the partial-auth state internally.
        # We just keep the live instance until the user supplies the code.
        garmin._pending_email = email  # type: ignore[attr-defined]
        return ConnectResult(status="needs_mfa", state_id=state_id)

    return _finalize(garmin, email)


def _resume_sync(garmin: Garmin, code: str) -> None:
    garmin.resume_login({}, code)


async def connect_mfa(state_id: str, code: str) -> ConnectResult:
    _prune_pending_mfa()
    entry = _pending_mfa.pop(state_id, None)
    if not entry:
        return ConnectResult(status="error", error="MFA session expired. Bitte neu starten.")
    _, garmin = entry
    email = getattr(garmin, "_pending_email", garmin.username)
    try:
        await asyncio.to_thread(_resume_sync, garmin, code)
    except Exception as exc:
        logger.warning("Garmin MFA verification failed: %s", exc)
        return ConnectResult(status="error", error=str(exc))
    return _finalize(garmin, email)


# ---------------------------------------------------------------------------
# Session restore + sync
# ---------------------------------------------------------------------------


def _restore_sync() -> Garmin:
    tokens = _load_tokens()
    if not tokens:
        raise RuntimeError("Garmin not connected")
    garmin = Garmin()
    garmin.login(tokenstore=tokens["tokens"])
    return garmin


async def _restore() -> Garmin:
    return await asyncio.to_thread(_restore_sync)


def _avg_pace_min_km(avg_speed_mps: float | None) -> float | None:
    if not avg_speed_mps or avg_speed_mps <= 0:
        return None
    return round(1000 / (avg_speed_mps * 60), 2)


def _to_int(val: Any) -> int | None:
    try:
        return int(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _sync_activities_sync(garmin: Garmin, days: int) -> int:
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    activities = garmin.get_activities_by_date(start.isoformat(), end.isoformat())
    synced = 0
    for act in activities or []:
        gid = str(act.get("activityId") or "")
        if not gid:
            continue
        sport = (act.get("activityType") or {}).get("typeKey") or "unknown"
        row = {
            "garmin_activity_id": gid,
            "sport": sport,
            "start_time": act.get("startTimeLocal"),
            "duration_seconds": _to_int(act.get("duration")),
            "distance_meters": act.get("distance"),
            "avg_hr": _to_int(act.get("averageHR")),
            "max_hr": _to_int(act.get("maxHR")),
            "calories": _to_int(act.get("calories")),
            "training_effect": act.get("aerobicTrainingEffect"),
            "vo2max_activity": act.get("vO2MaxValue"),
            "avg_pace_min_km": _avg_pace_min_km(act.get("averageSpeed")),
            "elevation_gain_m": act.get("elevationGain"),
            "raw_data": json.dumps(act),
        }
        db.upsert_activity(row)
        synced += 1
    return synced


def _sync_daily_metrics_sync(garmin: Garmin, days: int) -> int:
    today = datetime.now(timezone.utc).date()
    synced = 0
    for offset in range(days):
        day = (today - timedelta(days=offset)).isoformat()
        row: dict[str, Any] = {"date": day, "raw_data": None}
        wrote_any = False

        try:
            stats = garmin.get_stats(day) or {}
            if stats:
                row.update(
                    {
                        "resting_heart_rate": _to_int(stats.get("restingHeartRate")),
                        "steps": _to_int(stats.get("totalSteps")),
                        "stress_avg": _to_int(stats.get("averageStressLevel")),
                        "body_battery_high": _to_int(stats.get("bodyBatteryChargedValue")),
                        "body_battery_low": _to_int(stats.get("bodyBatteryDrainedValue")),
                        "active_calories": _to_int(stats.get("activeKilocalories")),
                        "total_calories": _to_int(stats.get("totalKilocalories")),
                    }
                )
                wrote_any = True
        except Exception:
            logger.debug("get_stats failed for %s", day, exc_info=True)

        try:
            hrv = garmin.get_hrv_data(day)
            if isinstance(hrv, dict):
                summary = hrv.get("hrvSummary") or {}
                hrv_value = summary.get("lastNightAvg") or summary.get("weeklyAvg")
                if hrv_value is not None:
                    row["hrv_avg"] = float(hrv_value)
                    wrote_any = True
                status = summary.get("status")
                hrv_score = {
                    "BALANCED": 75,
                    "UNBALANCED": 50,
                    "LOW": 30,
                    "POOR": 20,
                }.get(status)
                if hrv_score is not None:
                    row["recovery_score"] = hrv_score
        except Exception:
            logger.debug("get_hrv_data failed for %s", day, exc_info=True)

        try:
            sleep = garmin.get_sleep_data(day)
            if isinstance(sleep, dict):
                daily = sleep.get("dailySleepDTO") or {}
                sleep_score = ((daily.get("sleepScores") or {}).get("overall") or {}).get(
                    "value"
                )
                duration_s = daily.get("sleepTimeSeconds")

                def _s2m(key: str) -> float | None:
                    val = daily.get(key)
                    return round(val / 60, 1) if isinstance(val, (int, float)) else None

                if sleep_score is not None or duration_s is not None:
                    row.update(
                        {
                            "sleep_score": _to_int(sleep_score),
                            "sleep_duration_minutes": (
                                round(duration_s / 60, 1)
                                if isinstance(duration_s, (int, float))
                                else None
                            ),
                            "sleep_deep_minutes": _s2m("deepSleepSeconds"),
                            "sleep_light_minutes": _s2m("lightSleepSeconds"),
                            "sleep_rem_minutes": _s2m("remSleepSeconds"),
                            "sleep_awake_minutes": _s2m("awakeSleepSeconds"),
                        }
                    )
                    wrote_any = True
        except Exception:
            logger.debug("get_sleep_data failed for %s", day, exc_info=True)

        if wrote_any:
            db.upsert_daily_metric(row)
            synced += 1
    return synced


async def sync_all(days: int = 365) -> dict[str, Any]:
    garmin = await _restore()
    activities = await asyncio.to_thread(_sync_activities_sync, garmin, days)
    metrics = await asyncio.to_thread(_sync_daily_metrics_sync, garmin, days)
    now_iso = datetime.now(timezone.utc).isoformat()
    db.set_sync_state("last_sync_at", now_iso)
    return {
        "activities_synced": activities,
        "daily_metrics_synced": metrics,
        "days": days,
        "last_sync_at": now_iso,
    }
