# SPDX-License-Identifier: MIT
"""Garmin Connect integration.

Tokens stored in the garmin_tokens table (one row per account_id), sync
results written to activities + health_daily_metrics, also scoped by
account_id. MFA is handled via a short-lived in-memory dict of partially
authenticated Garmin clients keyed by random state_id.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from garminconnect import Garmin

from . import db
from .supabase_client import get_service_client

logger = logging.getLogger(__name__)

MFA_TTL_SECONDS = 300
_pending_mfa: dict[str, tuple[float, str, Garmin]] = {}


@dataclass
class ConnectResult:
    status: str
    display_name: str | None = None
    state_id: str | None = None
    error: str | None = None


# ---------------------------------------------------------------------------
# Token persistence (Supabase)
# ---------------------------------------------------------------------------


def _save_tokens(account_id: str, client_dump: str, email: str, display_name: str) -> None:
    sb = get_service_client()
    sb.table("garmin_tokens").upsert(
        {
            "account_id": account_id,
            "tokens_json": client_dump,
            "email": email,
            "display_name": display_name,
            "connected_since": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="account_id",
    ).execute()


def _load_tokens(account_id: str) -> dict[str, Any] | None:
    sb = get_service_client()
    res = (
        sb.table("garmin_tokens")
        .select("tokens_json, email, display_name, connected_since")
        .eq("account_id", account_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return None
    return rows[0]


def is_connected(account_id: str) -> bool:
    return _load_tokens(account_id) is not None


def get_status(account_id: str) -> dict[str, Any]:
    tokens = _load_tokens(account_id)
    return {
        "connected": tokens is not None,
        "display_name": tokens.get("display_name") if tokens else None,
        "email": tokens.get("email") if tokens else None,
        "connected_since": tokens.get("connected_since") if tokens else None,
        "last_sync_at": db.get_sync_state(account_id, "last_sync_at"),
        "activity_count": db.count_activities(account_id),
        "latest_activity_date": db.latest_activity_date(account_id),
    }


def disconnect(account_id: str, wipe_data: bool = True) -> None:
    sb = get_service_client()
    sb.table("garmin_tokens").delete().eq("account_id", account_id).execute()
    if wipe_data:
        for table in ("activities", "health_daily_metrics", "sync_state"):
            sb.table(table).delete().eq("account_id", account_id).execute()


# ---------------------------------------------------------------------------
# Connect flow
# ---------------------------------------------------------------------------


def _prune_pending_mfa() -> None:
    now = time.time()
    expired = [k for k, (ts, _, _) in _pending_mfa.items() if now - ts > MFA_TTL_SECONDS]
    for k in expired:
        _pending_mfa.pop(k, None)


def _finalize(account_id: str, garmin: Garmin, email: str) -> ConnectResult:
    token_str = garmin.client.dumps()
    display_name = garmin.display_name or garmin.full_name or email
    _save_tokens(account_id, token_str, email, display_name)
    return ConnectResult(status="connected", display_name=display_name)


def _login_sync(email: str, password: str) -> tuple[str | None, Garmin]:
    garmin = Garmin(email, password, return_on_mfa=True)
    mfa_status, _ = garmin.login()
    return mfa_status, garmin


async def connect(account_id: str, email: str, password: str) -> ConnectResult:
    _prune_pending_mfa()
    try:
        mfa_status, garmin = await asyncio.to_thread(_login_sync, email, password)
    except Exception as exc:
        logger.warning("Garmin login failed for account %s: %s", account_id, exc)
        return ConnectResult(status="error", error=str(exc))

    if mfa_status == "needs_mfa":
        state_id = secrets.token_urlsafe(16)
        _pending_mfa[state_id] = (time.time(), account_id, garmin)
        garmin._pending_email = email  # type: ignore[attr-defined]
        return ConnectResult(status="needs_mfa", state_id=state_id)

    return _finalize(account_id, garmin, email)


def _resume_sync(garmin: Garmin, code: str) -> None:
    garmin.resume_login({}, code)


async def connect_mfa(account_id: str, state_id: str, code: str) -> ConnectResult:
    _prune_pending_mfa()
    entry = _pending_mfa.pop(state_id, None)
    if not entry:
        return ConnectResult(status="error", error="MFA session expired. Bitte neu starten.")
    _, expected_account, garmin = entry
    if expected_account != account_id:
        return ConnectResult(status="error", error="MFA session belongs to a different account")
    email = getattr(garmin, "_pending_email", garmin.username)
    try:
        await asyncio.to_thread(_resume_sync, garmin, code)
    except Exception as exc:
        logger.warning("Garmin MFA verification failed: %s", exc)
        return ConnectResult(status="error", error=str(exc))
    return _finalize(account_id, garmin, email)


# ---------------------------------------------------------------------------
# Session restore + sync
# ---------------------------------------------------------------------------


def _restore_sync(account_id: str) -> Garmin:
    tokens = _load_tokens(account_id)
    if not tokens:
        raise RuntimeError("Garmin not connected")
    garmin = Garmin()
    garmin.login(tokenstore=tokens["tokens_json"])
    return garmin


async def _restore(account_id: str) -> Garmin:
    return await asyncio.to_thread(_restore_sync, account_id)


def _avg_pace_min_km(avg_speed_mps: float | None) -> float | None:
    if not avg_speed_mps or avg_speed_mps <= 0:
        return None
    return round(1000 / (avg_speed_mps * 60), 2)


def _to_int(val: Any) -> int | None:
    try:
        return int(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _sync_activities_sync(account_id: str, garmin: Garmin, days: int) -> int:
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
            "raw_data": act,
        }
        db.upsert_activity(account_id, row)
        synced += 1
    return synced


def _sync_daily_metrics_sync(account_id: str, garmin: Garmin, days: int) -> int:
    today = datetime.now(timezone.utc).date()
    synced = 0
    for offset in range(days):
        day = (today - timedelta(days=offset)).isoformat()
        row: dict[str, Any] = {"date": day}
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

        # Training Readiness is Garmin's blended 0-100 recovery score; when
        # present it overrides the HRV-status heuristic above.
        try:
            if hasattr(garmin, "get_training_readiness"):
                tr = garmin.get_training_readiness(day)
                if isinstance(tr, list) and tr:
                    tr = tr[0]
                if isinstance(tr, dict):
                    tr_score = tr.get("score") or tr.get("trainingReadinessScore")
                    if tr_score is not None:
                        row["recovery_score"] = _to_int(tr_score)
                        wrote_any = True
        except Exception:
            logger.debug("get_training_readiness failed for %s", day, exc_info=True)

        try:
            spo2 = garmin.get_spo2_data(day)
            if isinstance(spo2, dict):
                value = spo2.get("averageSpO2") or (spo2.get("allDaySpO2") or {}).get(
                    "averageSpO2Value"
                )
                if value is not None:
                    row["spo2_avg"] = float(value)
                    wrote_any = True
        except Exception:
            logger.debug("get_spo2_data failed for %s", day, exc_info=True)

        try:
            resp = garmin.get_respiration_data(day)
            if isinstance(resp, dict):
                value = resp.get("avgWakingRespirationValue")
                if value is not None:
                    row["respiration_avg"] = float(value)
                    wrote_any = True
        except Exception:
            logger.debug("get_respiration_data failed for %s", day, exc_info=True)

        try:
            maxm = garmin.get_max_metrics(day)
            generic: dict[str, Any] = {}
            if isinstance(maxm, dict):
                generic = maxm.get("generic") or {}
            elif isinstance(maxm, list) and maxm:
                generic = (maxm[0] or {}).get("generic") or {}
            vo2 = generic.get("vo2MaxPreciseValue") or generic.get("vo2MaxValue")
            if vo2 is not None:
                row["vo2max"] = float(vo2)
                wrote_any = True
        except Exception:
            logger.debug("get_max_metrics failed for %s", day, exc_info=True)

        try:
            im = garmin.get_intensity_minutes_data(day)
            if isinstance(im, dict):
                moderate = im.get("moderateIntensityMinutes") or 0
                vigorous = im.get("vigorousIntensityMinutes") or 0
                total = moderate + vigorous
                if total > 0:
                    row["intensity_minutes"] = _to_int(total)
                    wrote_any = True
        except Exception:
            logger.debug("get_intensity_minutes_data failed for %s", day, exc_info=True)

        if wrote_any:
            db.upsert_daily_metric(account_id, row)
            synced += 1
    return synced


async def sync_all(account_id: str, days: int = 365) -> dict[str, Any]:
    garmin = await _restore(account_id)
    activities = await asyncio.to_thread(_sync_activities_sync, account_id, garmin, days)
    metrics = await asyncio.to_thread(_sync_daily_metrics_sync, account_id, garmin, days)
    now_iso = datetime.now(timezone.utc).isoformat()
    db.set_sync_state(account_id, "last_sync_at", now_iso)
    return {
        "activities_synced": activities,
        "daily_metrics_synced": metrics,
        "days": days,
        "last_sync_at": now_iso,
    }
