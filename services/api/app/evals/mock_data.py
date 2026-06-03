# SPDX-License-Identifier: MIT
"""Mock the Supabase + web-search layer so the plan agent runs offline.

Strategy: patch the narrow data-access functions actually called from
``app.tools`` (search_activities, get_daily_metrics, fetch_activities_between)
plus the two profile reads (read_sections, is_onboarded). Tool functions
themselves are not patched - the agent loop still goes through them, so we
exercise the same code paths a real account would.

``web_search`` is replaced by mutating the entry in ``tools.TOOL_REGISTRY``
(it is a dict of callables snapshotted at import time, so patching the module
attribute alone does not redirect ``dispatch``).

DB writes (``insert_plan`` etc.) are noop-patched: we drive the generator via
``agents.spawn`` directly, which never writes to the DB - persistence happens
in ``agent._persist_specialist_result`` higher up in the chat agent. The noop
patches are a belt-and-suspenders guard against accidental writes during a
mocked run.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterator
from unittest.mock import patch

from .fixtures import Fixture


MOCK_ACCOUNT_ID = "eval-fixture-account"


def _date_of(activity: dict[str, Any]) -> date | None:
    raw = activity.get("start_time")
    if not raw:
        return None
    try:
        # Tolerate naive + tz-aware ISO strings.
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).date()
    except Exception:
        return None


def _filter_activities(
    activities: list[dict[str, Any]],
    *,
    sport: str | None = None,
    days: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    cutoff: date | None = None
    if days is not None and days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date()
    start: date | None = None
    end: date | None = None
    if start_date:
        try:
            start = date.fromisoformat(str(start_date)[:10])
        except ValueError:
            start = None
    if end_date:
        try:
            end = date.fromisoformat(str(end_date)[:10])
        except ValueError:
            end = None

    out: list[dict[str, Any]] = []
    for activity in activities:
        d = _date_of(activity)
        if d is None:
            continue
        if cutoff is not None and d < cutoff:
            continue
        if start is not None and d < start:
            continue
        if end is not None and d > end:
            continue
        if sport:
            if (activity.get("sport") or "").lower() != sport.strip().lower():
                continue
        out.append(activity)

    # Sort newest first to match real DB behaviour.
    out.sort(key=lambda a: a.get("start_time") or "", reverse=True)
    if limit is not None:
        out = out[: max(1, min(int(limit), 100))]
    return out


def _filter_metrics(metrics: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=max(1, int(days)))).date()
    out = [m for m in metrics if date.fromisoformat(m["date"]) >= cutoff]
    out.sort(key=lambda m: m["date"], reverse=True)
    return out


def _noop_write(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
    raise AssertionError(
        "DB write attempted during eval run - agents.spawn should not persist"
    )


@contextmanager
def mock_account(fixture: Fixture) -> Iterator[str]:
    """Patch db + profile + web_search so the plan agent sees this fixture only.

    Yields a stable fake ``account_id`` to pass to ``agents.spawn``.
    """

    def _mock_search_activities(
        account_id: str,
        sport: str | None = None,
        days: int | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        return _filter_activities(
            fixture.activities, sport=sport, days=days, limit=limit
        )

    def _mock_fetch_between(
        account_id: str,
        start_date: str,
        end_date: str | None = None,
    ) -> list[dict[str, Any]]:
        return _filter_activities(
            fixture.activities, start_date=start_date, end_date=end_date
        )

    def _mock_get_daily_metrics(account_id: str, days: int) -> list[dict[str, Any]]:
        return _filter_metrics(fixture.daily_metrics, days)

    def _mock_read_sections(account_id: str) -> dict[str, str]:
        # profile_sections already contains all 6 closed names with ''-defaults.
        return dict(fixture.profile_sections)

    def _mock_is_onboarded(account_id: str) -> bool:
        return fixture.onboarding_completed

    def _mock_web_search(account_id: str, query: str, count: int = 5) -> dict[str, Any]:
        # Deterministic empty payload: no network, no flakiness, still valid
        # tool-response shape so the model handles it.
        return {"query": query, "results": [], "returned": 0}

    patches = [
        # Data tool path: app.tools imports these as `db.<fn>` and `profile.<fn>`.
        patch("app.db.search_activities", side_effect=_mock_search_activities),
        patch("app.db.fetch_activities_between", side_effect=_mock_fetch_between),
        patch("app.db.get_daily_metrics", side_effect=_mock_get_daily_metrics),
        patch("app.profile.read_sections", side_effect=_mock_read_sections),
        patch("app.profile.is_onboarded", side_effect=_mock_is_onboarded),
        # Web search: keyless ddgs is unreliable + non-deterministic; replace.
        # Patch both the module attribute (in case anything reads it directly)
        # AND the TOOL_REGISTRY entry, which dispatch() reads.
        patch("app.tools.web_search", side_effect=_mock_web_search),
        patch.dict(
            "app.tools.TOOL_REGISTRY",
            {"web_search": _mock_web_search},
            clear=False,
        ),
        # Belt-and-suspenders: DB writes must never fire here.
        patch("app.db.insert_plan", side_effect=_noop_write),
        patch("app.db.update_plan", side_effect=_noop_write),
        patch("app.db.archive_plans", side_effect=_noop_write),
    ]

    started: list[Any] = []
    try:
        for p in patches:
            started.append(p.start())
        yield MOCK_ACCOUNT_ID
    finally:
        for p in patches:
            try:
                p.stop()
            except Exception:
                pass
