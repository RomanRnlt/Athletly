"""SQLite storage for Garmin-synced data.

Single-user local-dev MVP. Database lives at services/api/.data/athletly.db
(gitignored). Schema mirrors a slim subset of the legacy Supabase tables
without RLS, user_id, or tenant scoping.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

DATA_DIR = Path(__file__).resolve().parent.parent / ".data"
DB_PATH = DATA_DIR / "athletly.db"


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS activities (
    garmin_activity_id   TEXT PRIMARY KEY,
    sport                TEXT,
    start_time           TEXT,
    duration_seconds     INTEGER,
    distance_meters      REAL,
    avg_hr               INTEGER,
    max_hr               INTEGER,
    calories             INTEGER,
    training_effect      REAL,
    vo2max_activity      REAL,
    avg_pace_min_km      REAL,
    elevation_gain_m     REAL,
    raw_data             TEXT,
    synced_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_activities_sport ON activities(sport);

CREATE TABLE IF NOT EXISTS health_daily_metrics (
    date                     TEXT PRIMARY KEY,
    resting_heart_rate       INTEGER,
    hrv_avg                  REAL,
    sleep_score              INTEGER,
    sleep_duration_minutes   REAL,
    sleep_deep_minutes       REAL,
    sleep_light_minutes      REAL,
    sleep_rem_minutes        REAL,
    sleep_awake_minutes      REAL,
    stress_avg               INTEGER,
    body_battery_high        INTEGER,
    body_battery_low         INTEGER,
    recovery_score           INTEGER,
    steps                    INTEGER,
    active_calories          INTEGER,
    total_calories           INTEGER,
    vo2max                   REAL,
    intensity_minutes        INTEGER,
    raw_data                 TEXT,
    synced_at                TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON health_daily_metrics(date DESC);

CREATE TABLE IF NOT EXISTS sync_state (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA_SQL)
        conn.commit()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def upsert_activity(row: dict[str, Any]) -> None:
    columns = [
        "garmin_activity_id",
        "sport",
        "start_time",
        "duration_seconds",
        "distance_meters",
        "avg_hr",
        "max_hr",
        "calories",
        "training_effect",
        "vo2max_activity",
        "avg_pace_min_km",
        "elevation_gain_m",
        "raw_data",
    ]
    placeholders = ", ".join(["?"] * len(columns))
    set_clause = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "garmin_activity_id")
    sql = (
        f"INSERT INTO activities ({', '.join(columns)}) VALUES ({placeholders}) "
        f"ON CONFLICT(garmin_activity_id) DO UPDATE SET {set_clause}, "
        f"synced_at = datetime('now')"
    )
    values = tuple(row.get(c) for c in columns)
    with connect() as conn:
        conn.execute(sql, values)


def upsert_daily_metric(row: dict[str, Any]) -> None:
    columns = [
        "date",
        "resting_heart_rate",
        "hrv_avg",
        "sleep_score",
        "sleep_duration_minutes",
        "sleep_deep_minutes",
        "sleep_light_minutes",
        "sleep_rem_minutes",
        "sleep_awake_minutes",
        "stress_avg",
        "body_battery_high",
        "body_battery_low",
        "recovery_score",
        "steps",
        "active_calories",
        "total_calories",
        "vo2max",
        "intensity_minutes",
        "raw_data",
    ]
    placeholders = ", ".join(["?"] * len(columns))
    set_clause = ", ".join(
        f"{c} = COALESCE(excluded.{c}, {c})" for c in columns if c != "date"
    )
    sql = (
        f"INSERT INTO health_daily_metrics ({', '.join(columns)}) "
        f"VALUES ({placeholders}) "
        f"ON CONFLICT(date) DO UPDATE SET {set_clause}, synced_at = datetime('now')"
    )
    values = tuple(row.get(c) for c in columns)
    with connect() as conn:
        conn.execute(sql, values)


def set_sync_state(key: str, value: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO sync_state(key, value) VALUES(?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


def get_sync_state(key: str) -> str | None:
    with connect() as conn:
        row = conn.execute("SELECT value FROM sync_state WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def count_activities() -> int:
    with connect() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM activities").fetchone()
    return int(row["c"]) if row else 0


def latest_activity_date() -> str | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT start_time FROM activities ORDER BY start_time DESC LIMIT 1"
        ).fetchone()
    return row["start_time"] if row else None


def truncate_all() -> None:
    with connect() as conn:
        conn.execute("DELETE FROM activities")
        conn.execute("DELETE FROM health_daily_metrics")
        conn.execute("DELETE FROM sync_state")
