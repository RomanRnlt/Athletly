# SPDX-License-Identifier: MIT
"""Golden fixtures for the plan eval harness.

Each fixture is a deterministic, self-contained athlete scenario: profile
sections (the 6 closed names from ``profile.SECTIONS``), synthetic activities
(rows in the same shape ``db.fetch_activities_between`` returns), daily metrics
(same shape as ``db.get_daily_metrics``), and a list of invariants the plan
must satisfy. ``invariants`` use the closed vocabulary documented in
``app.evals.asserts``.

The data here is fabricated but kept realistic + coherent with the fixture's
story so the LLM generator + evaluator see a plausible athlete signal. Dates
are stamped relative to ``TODAY`` so the harness stays time-stable inside a
single CI day; bump TODAY when you re-baseline if needed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from ...profile import SECTIONS


# Pin "today" once so all fixture timestamps are deterministic within a single
# run. We use the real today() so the plan agent's "next Monday" anchor lines
# up with the recent-activity dates the fixtures fabricate.
TODAY = date.today()


def _iso(d: date) -> str:
    return d.isoformat()


def _iso_ts(d: date, hour: int = 6) -> str:
    """Activities use a full ISO timestamp; keep it short + UTC-naive."""
    return f"{d.isoformat()}T{hour:02d}:00:00+00:00"


@dataclass(frozen=True)
class Fixture:
    """One eval scenario.

    profile_sections: maps the 6 closed German section names to free prose.
    onboarding_completed: True for normal scenarios.
    activities: rows matching ``db.fetch_activities_between`` output: sport,
        duration_seconds, distance_meters, training_effect, avg_hr, start_time.
    daily_metrics: rows matching ``db.get_daily_metrics`` output: date,
        resting_heart_rate, hrv_avg, sleep_score, recovery_score, ...
    invariants: list of dicts checked by ``app.evals.asserts``.
    task: optional plan-agent task override; falls back to the default in run.py.
    """

    id: str
    description: str
    profile_sections: dict[str, str]
    onboarding_completed: bool
    activities: list[dict[str, Any]]
    daily_metrics: list[dict[str, Any]]
    invariants: list[dict[str, Any]]
    task: str = ""
    notes: str = ""


# ---------------------------------------------------------------------------
# Helpers to build coherent activity/metric sequences without one-off math
# scattered through each fixture.
# ---------------------------------------------------------------------------


def _empty_profile() -> dict[str, str]:
    return {name: "" for name in SECTIONS}


def _profile(**overrides: str) -> dict[str, str]:
    """Build a full 6-section profile; missing sections default to ''."""
    base = _empty_profile()
    for name, value in overrides.items():
        if name not in base:
            raise ValueError(f"unknown section override: {name!r}")
        base[name] = value
    return base


def _metrics_row(
    days_ago: int,
    *,
    rhr: int,
    hrv: int,
    sleep: int,
    recovery: int,
    sleep_minutes: int = 420,
) -> dict[str, Any]:
    d = TODAY - timedelta(days=days_ago)
    return {
        "date": _iso(d),
        "resting_heart_rate": rhr,
        "hrv_avg": hrv,
        "sleep_score": sleep,
        "sleep_duration_minutes": sleep_minutes,
        "sleep_deep_minutes": int(sleep_minutes * 0.18),
        "sleep_light_minutes": int(sleep_minutes * 0.55),
        "sleep_rem_minutes": int(sleep_minutes * 0.22),
        "sleep_awake_minutes": int(sleep_minutes * 0.05),
        "stress_avg": 30,
        "body_battery_high": 80,
        "body_battery_low": 20,
        "recovery_score": recovery,
        "steps": 9000,
        "active_calories": 600,
        "total_calories": 2400,
        "vo2max": None,
        "intensity_minutes": 60,
        "spo2_avg": 96,
        "respiration_avg": 14,
    }


def _activity_row(
    days_ago: int,
    *,
    sport: str,
    duration_min: int,
    distance_km: float | None = None,
    avg_hr: int | None = None,
    training_effect: float | None = None,
    hour: int = 6,
) -> dict[str, Any]:
    d = TODAY - timedelta(days=days_ago)
    return {
        "sport": sport,
        "duration_seconds": int(duration_min * 60),
        "distance_meters": int(distance_km * 1000) if distance_km is not None else None,
        "training_effect": training_effect,
        "avg_hr": avg_hr,
        "start_time": _iso_ts(d, hour=hour),
    }


# ---------------------------------------------------------------------------
# Fixture: roman_shin_splints
# Half-marathon sub-1:30 goal, 3y experience, current shin pain -> recent
# running volume reduced. Cross-trained on the bike to keep aerobic load.
# ---------------------------------------------------------------------------


def _roman_shin_splints() -> Fixture:
    activities: list[dict[str, Any]] = []
    # Last 7 days: only 2 short easy runs + 2 bike sessions (managing pain).
    activities += [
        _activity_row(2, sport="running", duration_min=25, distance_km=4.0, avg_hr=140, training_effect=2.0),
        _activity_row(5, sport="running", duration_min=30, distance_km=5.0, avg_hr=142, training_effect=2.2),
        _activity_row(1, sport="cycling", duration_min=60, distance_km=22.0, avg_hr=135, training_effect=2.6),
        _activity_row(4, sport="cycling", duration_min=75, distance_km=28.0, avg_hr=140, training_effect=3.0),
    ]
    # Days 8-30: prior heavier running block (60-80km wks) + occasional bike.
    for week_back in range(2, 5):
        base = week_back * 7
        activities += [
            _activity_row(base + 1, sport="running", duration_min=55, distance_km=10.5, avg_hr=152, training_effect=3.5),
            _activity_row(base + 3, sport="running", duration_min=70, distance_km=12.0, avg_hr=158, training_effect=4.2),
            _activity_row(base + 5, sport="running", duration_min=40, distance_km=7.5, avg_hr=148, training_effect=2.8),
            _activity_row(base + 6, sport="running", duration_min=90, distance_km=16.5, avg_hr=150, training_effect=3.6),
        ]
    activities += [
        _activity_row(9, sport="cycling", duration_min=80, distance_km=30.0, avg_hr=140, training_effect=3.2),
    ]

    metrics = [
        _metrics_row(i, rhr=46, hrv=68, sleep=82, recovery=70) for i in range(0, 14)
    ] + [_metrics_row(i, rhr=48, hrv=64, sleep=78, recovery=65) for i in range(14, 30)]

    return Fixture(
        id="roman_shin_splints",
        description=(
            "Erfahrener Halbmarathon-Laeufer (3 Jahre, Sub-1:30 Ziel) mit akuten "
            "Schienbein-Beschwerden seit ca. 2 Wochen. Laufvolumen aktuell stark "
            "reduziert, Rad als Cross-Training. 4-5 Trainingstage pro Woche moeglich."
        ),
        profile_sections=_profile(
            **{
                "Warum ich trainiere": (
                    "Halbmarathon Sub-1:30 als naechstes konkretes Ziel. Liebe das "
                    "Gefuehl, wenn ein langer Lauf am Wochenende muehelos wird."
                ),
                "Sportarten & Rollen": (
                    "Hauptsport Laufen (Strasse + Schotter). Rad als Cross-Training "
                    "und Verletzungspuffer. Gelegentlich Kraft im Eigengewicht."
                ),
                "Nicht verhandelbar (Leben & Kontext)": (
                    "Job 9-17 Uhr, Training fast immer vor 7 Uhr morgens. 4-5 "
                    "Trainingstage pro Woche realistisch, mindestens 1 voller "
                    "Ruhetag. Wochenende einer der laengeren Einheiten."
                ),
                "Wie ich auf Belastung reagiere": (
                    "Aktuell Schienbein-Beschwerden links seit ca. 2 Wochen, "
                    "verstaerkt nach harten Tempolaeufen. Erholung normalerweise "
                    "gut, aber im Moment vorsichtig."
                ),
                "Geschichte & Erfahrung": (
                    "Laeuft seit 3 Jahren strukturiert. Beste Zeit Halbmarathon "
                    "1:34. Wochenvolumen vor der Verletzung 60-80 km."
                ),
                "Coaching-Stil & Praeferenzen": (
                    "Mag klare Wochenstruktur und konkrete Targets (Pace, HF). "
                    "Bevorzugt frueh am Morgen. Keine Doppeleinheiten taeglich."
                ),
            }
        ),
        onboarding_completed=True,
        activities=activities,
        daily_metrics=metrics,
        invariants=[
            {"kind": "max_volume_jump_pct", "sport": "running", "vs": "recent_week", "value": 20},
            {"kind": "min_rest_days_per_week", "value": 1},
            {"kind": "no_consecutive_hard_runs"},
        ],
        notes="Plan soll Reizung respektieren: kein Sprung im Laufvolumen, "
        "keine zwei harten Laufeinheiten nacheinander.",
    )


# ---------------------------------------------------------------------------
# Fixture: beginner_no_data
# Fresh user. Says "fitter werden", 2-3x/week. No activities. No metrics.
# Plan must be conservative + clearly say so.
# ---------------------------------------------------------------------------


def _beginner_no_data() -> Fixture:
    return Fixture(
        id="beginner_no_data",
        description=(
            "Anfaenger, will allgemein fitter werden. 2-3 Tage pro Woche moeglich. "
            "Keine bisherigen Aktivitaeten, kein Garmin-Datensatz."
        ),
        profile_sections=_profile(
            **{
                "Warum ich trainiere": "Allgemein fitter werden, regelmaessiger bewegen.",
                "Sportarten & Rollen": "Offen, eher Joggen + Bodyweight-Kraft am Anfang.",
                "Nicht verhandelbar (Leben & Kontext)": "2-3 Trainingstage pro Woche, max 45 min.",
                "Wie ich auf Belastung reagiere": "Unbekannt, Anfaenger.",
                "Geschichte & Erfahrung": "Kein strukturiertes Training bisher.",
                "Coaching-Stil & Praeferenzen": "Sanft starten, klare Anleitungen.",
            }
        ),
        onboarding_completed=True,
        activities=[],
        daily_metrics=[],
        invariants=[
            {"kind": "max_session_duration_min", "value": 45},
            {"kind": "min_rest_days_per_week", "value": 2},
            {"kind": "forbidden_intent", "intents": ["vo2max", "threshold"]},
        ],
        notes="Konservativer Plan; keine Intervalle/Threshold; klare Ruhetage.",
    )


# ---------------------------------------------------------------------------
# Fixture: multisport_hyrox
# Hyrox in 8 weeks, 6 days/week capacity. Lots of cross-modal recent volume.
# ---------------------------------------------------------------------------


def _multisport_hyrox() -> Fixture:
    activities: list[dict[str, Any]] = []
    # 30 days of rich mixed training. Pattern: run + gym + row + swim recurring.
    schedule = [
        ("running", 50, 9.0, 150, 3.4),
        ("strength_training", 60, None, 130, 3.0),
        ("rowing", 30, 7.5, 155, 3.2),
        ("running", 40, 7.0, 145, 2.8),
        ("strength_training", 55, None, 128, 2.8),
        ("swimming", 35, 1.5, 140, 2.5),
        ("rest", 0, None, None, None),
    ]
    for days_ago in range(1, 29):
        slot = schedule[(days_ago - 1) % len(schedule)]
        sport, dur, dist, hr, te = slot
        if sport == "rest":
            continue
        activities.append(
            _activity_row(
                days_ago,
                sport=sport,
                duration_min=dur,
                distance_km=dist,
                avg_hr=hr,
                training_effect=te,
            )
        )

    metrics = [_metrics_row(i, rhr=50, hrv=72, sleep=84, recovery=75) for i in range(0, 30)]

    return Fixture(
        id="multisport_hyrox",
        description=(
            "Hyrox-Wettkampf in 8 Wochen. Multisport-Athlet (Laufen, Rudern, "
            "Schwimmen, Kraft/Functional). 6 Trainingstage pro Woche moeglich, "
            "letzte 30 Tage gemischte Sessions reichlich."
        ),
        profile_sections=_profile(
            **{
                "Warum ich trainiere": "Hyrox in 8 Wochen, Ziel Top-Altersklassen-Platzierung.",
                "Sportarten & Rollen": "Laufen, Rudern, Schwimmen als Cardio. Funktionelles Krafttraining + Hyrox-Stations.",
                "Nicht verhandelbar (Leben & Kontext)": "6 Trainingstage/Woche moeglich, max 75 min pro Einheit.",
                "Wie ich auf Belastung reagiere": "Vertraegt hohe Volumina, regeneriert mit gutem Schlaf gut.",
                "Geschichte & Erfahrung": "2 Jahre Crossfit + Marathon-Background.",
                "Coaching-Stil & Praeferenzen": "Klare Periodisierung, harte Sessions mit konkreten Targets.",
            }
        ),
        onboarding_completed=True,
        activities=activities,
        daily_metrics=metrics,
        invariants=[
            {"kind": "required_sports_present", "sports": ["running", "gym", "rowing", "swimming"]},
            {"kind": "required_session_kind", "kind_filter": "functional"},
        ],
        notes="Plan muss alle 4 Sportarten + mindestens ein functional-Format enthalten.",
    )


# ---------------------------------------------------------------------------
# Fixture: gym_only
# Hypertrophy goal, 4x/week strength only, no cardio.
# ---------------------------------------------------------------------------


def _gym_only() -> Fixture:
    activities: list[dict[str, Any]] = []
    # 4 strength sessions per week, last 28 days. Push/Pull/Legs rotation.
    schedule = ["strength_training", "rest", "strength_training", "rest",
                "strength_training", "strength_training", "rest"]
    for days_ago in range(1, 29):
        sport = schedule[(days_ago - 1) % 7]
        if sport == "rest":
            continue
        activities.append(
            _activity_row(
                days_ago,
                sport=sport,
                duration_min=65,
                distance_km=None,
                avg_hr=115,
                training_effect=2.8,
            )
        )

    metrics = [_metrics_row(i, rhr=58, hrv=60, sleep=80, recovery=72) for i in range(0, 28)]

    return Fixture(
        id="gym_only",
        description=(
            "Hypertrophie-Ziel, reines Krafttraining. 4 Trainingstage pro Woche, "
            "keine Cardio-Aktivitaeten in den letzten 30 Tagen."
        ),
        profile_sections=_profile(
            **{
                "Warum ich trainiere": "Hypertrophie und Kraft aufbauen. Mehr Muskelmasse + Optik.",
                "Sportarten & Rollen": "Ausschliesslich Krafttraining im Studio. Push/Pull/Legs-Split.",
                "Nicht verhandelbar (Leben & Kontext)": "4 Tage pro Woche, 60-75 min pro Einheit, abends.",
                "Wie ich auf Belastung reagiere": "Reagiert gut auf Volumen, braucht 48h zwischen gleicher Muskelgruppe.",
                "Geschichte & Erfahrung": "Seit 4 Jahren strukturiertes Krafttraining.",
                "Coaching-Stil & Praeferenzen": "Klare Sets/Reps/RPE, progressive Overload.",
            }
        ),
        onboarding_completed=True,
        activities=activities,
        daily_metrics=metrics,
        invariants=[
            {"kind": "sport_family_only", "families": ["strength"]},
        ],
        notes="Nur Kraft-Familie zulaessig; keine Cardio-Sessions.",
    )


# ---------------------------------------------------------------------------
# Fixture: deload_needed
# 14 days of low HRV + low recovery + high-frequency activities -> overreached.
# Plan should reduce volume and avoid vo2max/threshold work in week 1.
# ---------------------------------------------------------------------------


def _deload_needed() -> Fixture:
    activities: list[dict[str, Any]] = []
    # Last 28 days: high frequency (almost daily), mix of run + bike with high TE.
    pattern = [
        ("running", 70, 12.0, 165, 4.4),
        ("cycling", 90, 35.0, 150, 4.0),
        ("running", 60, 10.5, 158, 3.8),
        ("running", 80, 14.0, 162, 4.2),
        ("cycling", 75, 28.0, 148, 3.6),
        ("running", 55, 9.5, 155, 3.5),
        ("strength_training", 45, None, 125, 2.8),
    ]
    for days_ago in range(1, 29):
        slot = pattern[(days_ago - 1) % len(pattern)]
        sport, dur, dist, hr, te = slot
        activities.append(
            _activity_row(
                days_ago,
                sport=sport,
                duration_min=dur,
                distance_km=dist,
                avg_hr=hr,
                training_effect=te,
            )
        )

    # HRV trending down + low recovery for 14 days.
    metrics = []
    for i in range(0, 14):
        metrics.append(_metrics_row(i, rhr=58, hrv=42, sleep=68, recovery=35, sleep_minutes=380))
    for i in range(14, 28):
        metrics.append(_metrics_row(i, rhr=52, hrv=58, sleep=78, recovery=65))

    return Fixture(
        id="deload_needed",
        description=(
            "Athlet zeigt klare Ueberlastung: HRV seit 14 Tagen tief, "
            "Recovery-Scores niedrig, sehr hochfrequentes Trainingsvolumen "
            "der letzten 4 Wochen. Plan muss deload Woche 1."
        ),
        profile_sections=_profile(
            **{
                "Warum ich trainiere": "Triathlon-Saison, will Form aufbauen.",
                "Sportarten & Rollen": "Laufen + Rad als Hauptsportarten, Kraft als Beifang.",
                "Nicht verhandelbar (Leben & Kontext)": "6 Trainingstage pro Woche, normalerweise 60-90 min.",
                "Wie ich auf Belastung reagiere": "Aktuell stark uebermuedet, schlaeft schlecht, HRV unten.",
                "Geschichte & Erfahrung": "5 Jahre Ausdauer-Training. Bereits 2 Marathons.",
                "Coaching-Stil & Praeferenzen": "Datengetrieben, hoert auf Recovery-Signale.",
            }
        ),
        onboarding_completed=True,
        activities=activities,
        daily_metrics=metrics,
        invariants=[
            {"kind": "forbidden_intent", "intents": ["vo2max", "threshold"]},
            {"kind": "required_intent_dominant", "intents": ["recovery", "aerobic_base"]},
        ],
        notes="Woche 1 deutlich reduziert; nur leichte aerobe Einheiten + Recovery.",
    )


# ---------------------------------------------------------------------------
# Fixture: time_crunched_parent
# 30 min cap, 3 days/week, evenings. Maintenance goal.
# ---------------------------------------------------------------------------


def _time_crunched_parent() -> Fixture:
    activities: list[dict[str, Any]] = []
    # Last 4 weeks: 2-3 short sessions per week (run + bodyweight).
    for week_back in range(0, 4):
        base = week_back * 7
        activities += [
            _activity_row(base + 1, sport="running", duration_min=25, distance_km=4.0, avg_hr=148, hour=20, training_effect=2.4),
            _activity_row(base + 3, sport="strength_training", duration_min=28, distance_km=None, avg_hr=120, hour=20, training_effect=2.2),
            _activity_row(base + 5, sport="running", duration_min=30, distance_km=4.5, avg_hr=150, hour=20, training_effect=2.6),
        ]

    metrics = [_metrics_row(i, rhr=55, hrv=62, sleep=72, recovery=60, sleep_minutes=360) for i in range(0, 28)]

    return Fixture(
        id="time_crunched_parent",
        description=(
            "Elternteil mit wenig Zeit: max 30 min pro Einheit, 3 Tage pro Woche, "
            "nur abends. Ziel: Gesundheit erhalten, nicht maximale Performance."
        ),
        profile_sections=_profile(
            **{
                "Warum ich trainiere": "Gesundheit erhalten, fit fuer die Kinder bleiben.",
                "Sportarten & Rollen": "Joggen + kurze Kraft-Routinen. Was passt, passt.",
                "Nicht verhandelbar (Leben & Kontext)": "Max 30 min pro Einheit, 3 Tage pro Woche, nur abends nach 20 Uhr.",
                "Wie ich auf Belastung reagiere": "Schlafdefizit chronisch, braucht moderate Belastung.",
                "Geschichte & Erfahrung": "Hat frueher Marathon gemacht, jetzt 5 Jahre Pause-Modus.",
                "Coaching-Stil & Praeferenzen": "Kurz, klar, kein Schnickschnack.",
            }
        ),
        onboarding_completed=True,
        activities=activities,
        daily_metrics=metrics,
        invariants=[
            {"kind": "max_session_duration_min", "value": 35},
            {"kind": "max_training_days_per_week", "value": 3},
            {"kind": "min_rest_days_per_week", "value": 4},
        ],
        notes="Strikte Zeit- und Tagebudgets; viel Erholung.",
    )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


FIXTURES: list[Fixture] = [
    _roman_shin_splints(),
    _beginner_no_data(),
    _multisport_hyrox(),
    _gym_only(),
    _deload_needed(),
    _time_crunched_parent(),
]


def find_fixture(fixture_id: str) -> Fixture | None:
    for fx in FIXTURES:
        if fx.id == fixture_id:
            return fx
    return None
