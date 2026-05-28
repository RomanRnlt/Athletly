"""Eval-harness runner: drive each fixture through ``agents.spawn('plan', ...)``,
validate the result structurally + against the fixture's invariants + via LLM
judge, write a JSON report under ``app/evals/reports/<UTC-iso>.json``, print a
compact stdout summary.

Run all fixtures:
    cd services/api
    .venv/bin/python -m app.evals.run

Run a subset:
    .venv/bin/python -m app.evals.run beginner_no_data deload_needed

Env overrides:
    ATHLETLY_PLAN_MODEL=...   # the model agents.spawn('plan', ...) uses
    ATHLETLY_EVAL_JUDGE_MODEL=...  # the judge model
"""

from __future__ import annotations

import argparse
import asyncio
import importlib.util
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .. import agents
from ..config import settings
from . import asserts as eval_asserts
from . import judge
from .fixtures import FIXTURES, Fixture, find_fixture
from .mock_data import mock_account


logger = logging.getLogger(__name__)

REPORTS_DIR = Path(__file__).resolve().parent / "reports"
_DEFAULT_TASK = (
    "Build a 2-week training plan for this athlete now. Use the gathered data, "
    "research the science as needed, draft it in the universal session grammar, "
    "get it evaluated, revise, and submit."
)


# ---------------------------------------------------------------------------
# Plan validator (re-use the skill-shipped script, do not re-implement)
# ---------------------------------------------------------------------------


def _load_plan_validator() -> Any:
    """Import skills/plan/scripts/validate_plan.py once. It is self-contained
    (no app imports) so this is safe at module import time."""
    here = Path(__file__).resolve()
    # app/evals/run.py -> services/api/skills/plan/scripts/validate_plan.py
    validator_path = (
        here.parent.parent.parent / "skills" / "plan" / "scripts" / "validate_plan.py"
    )
    if not validator_path.exists():
        raise RuntimeError(f"plan validator not found at {validator_path}")
    spec = importlib.util.spec_from_file_location(
        "_eval_plan_validator", validator_path
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load validator from {validator_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_VALIDATOR = _load_plan_validator()


# ---------------------------------------------------------------------------
# Event logger for sub-agent runs (quiet by default, verbose for depth 0/1)
# ---------------------------------------------------------------------------


def _make_event_logger(fixture_id: str, verbose: bool):
    async def on_event(event_type: str, payload: dict[str, Any]) -> None:
        depth = payload.get("depth", 0)
        agent = payload.get("agent", "?")
        if depth > 1 and event_type == "tool_result":
            # Per-tool-result spam is too noisy; we already log tool_call.
            return
        if event_type == "status":
            print(f"  [{fixture_id}] depth={depth} {agent}: {payload.get('label', '')}")
        elif event_type == "tool_call":
            name = payload.get("name", "?")
            args = payload.get("args") or {}
            arg_keys = ", ".join(list(args.keys())[:4])
            print(f"  [{fixture_id}] depth={depth} {agent} -> {name}({arg_keys})")
        elif verbose and event_type == "tool_result":
            preview = payload.get("preview", "")
            print(f"  [{fixture_id}] depth={depth} {agent} <- {payload.get('name')}: {preview}")
    return on_event


# ---------------------------------------------------------------------------
# Per-fixture run
# ---------------------------------------------------------------------------


async def _run_one(fixture: Fixture, *, verbose: bool) -> dict[str, Any]:
    started = time.monotonic()
    print(f"\n=== {fixture.id} ===")
    print(f"  {fixture.description}")
    task = fixture.task.strip() or _DEFAULT_TASK

    result: dict[str, Any]
    error: str | None = None
    with mock_account(fixture) as account_id:
        try:
            result = await agents.spawn(
                "plan", task, account_id, on_event=_make_event_logger(fixture.id, verbose)
            )
        except Exception as exc:
            logger.exception("fixture %s crashed during agents.spawn", fixture.id)
            result = {"error": f"spawn crashed: {exc}"}
            error = str(exc)

    elapsed_s = round(time.monotonic() - started, 2)

    structural_problems: list[str]
    invariant_results: list[dict[str, Any]]
    qualitative: dict[str, Any]
    plan: dict[str, Any] | None = None

    if "error" in result:
        structural_problems = [result["error"]]
        invariant_results = [
            {"invariant": inv, "passed": False, "detail": "skipped: plan generation failed"}
            for inv in fixture.invariants
        ]
        qualitative = {"skipped": True, "reason": "plan generation failed"}
    else:
        plan = _VALIDATOR.coerce(result)
        structural_problems = list(_VALIDATOR.validate(plan))
        invariant_results = eval_asserts.check_all(
            fixture.invariants, plan, fixture.activities
        )
        # Score even structurally broken plans so the judge can flag deeper
        # quality issues; the pass/fail boolean still requires zero structural
        # problems + zero invariant failures.
        qualitative = await judge.score_plan(plan, fixture)

    invariant_failures = [r for r in invariant_results if not r["passed"]]
    passed = (
        error is None
        and not structural_problems
        and not invariant_failures
        and isinstance(plan, dict)
    )

    fixture_report: dict[str, Any] = {
        "id": fixture.id,
        "description": fixture.description,
        "task": task,
        "elapsed_seconds": elapsed_s,
        "passed": passed,
        "structural_problems": structural_problems,
        "invariant_results": invariant_results,
        "qualitative_score": qualitative,
        "intent_distribution": eval_asserts.summarize_intents(plan or {}),
        "plan": plan,
    }
    if error:
        fixture_report["spawn_error"] = error

    _print_fixture_summary(fixture_report)
    return fixture_report


def _print_fixture_summary(report: dict[str, Any]) -> None:
    status = "PASS" if report["passed"] else "FAIL"
    quality = report["qualitative_score"] or {}
    overall = quality.get("overall")
    quality_str = f"overall={overall}" if overall is not None else f"judge={quality.get('error', 'n/a')}"
    print(
        f"  -> {status} in {report['elapsed_seconds']}s | "
        f"structural={len(report['structural_problems'])} | "
        f"invariants_failed={sum(1 for r in report['invariant_results'] if not r['passed'])} | "
        f"{quality_str}"
    )
    for prob in report["structural_problems"][:3]:
        print(f"     structural: {prob}")
    for r in report["invariant_results"]:
        if not r["passed"]:
            print(f"     invariant: {r['detail']}")


# ---------------------------------------------------------------------------
# Top-level driver
# ---------------------------------------------------------------------------


MAX_CONCURRENCY = 3


async def _run_all(fixture_ids: list[str], *, verbose: bool) -> dict[str, Any]:
    if fixture_ids:
        selected: list[Fixture] = []
        for fid in fixture_ids:
            fx = find_fixture(fid)
            if fx is None:
                raise SystemExit(f"unknown fixture id: {fid}")
            selected.append(fx)
    else:
        selected = list(FIXTURES)

    started_at = datetime.now(timezone.utc).isoformat()
    started = time.monotonic()
    # Run up to MAX_CONCURRENCY fixtures in parallel (each is its own mocked
    # account + independent agent run). Sequential was ~60 min for 6 fixtures
    # and got stuck on transient Anthropic stalls; concurrency caps the wall
    # time and isolates one slow fixture from the rest.
    sem = asyncio.Semaphore(MAX_CONCURRENCY)

    async def _bounded(fx: Fixture) -> dict[str, Any]:
        async with sem:
            return await _run_one(fx, verbose=verbose)

    fixture_reports = await asyncio.gather(*[_bounded(fx) for fx in selected])
    # Preserve fixture order matching `selected` (gather preserves arg order).
    fixture_reports = list(fixture_reports)
    finished_at = datetime.now(timezone.utc).isoformat()
    total_elapsed = round(time.monotonic() - started, 2)

    report = {
        "run_id": started_at.replace(":", "-"),
        "started_at": started_at,
        "finished_at": finished_at,
        "total_elapsed_seconds": total_elapsed,
        "plan_model": settings.plan_model,
        "judge_model": judge._default_model(),
        "fixture_count": len(fixture_reports),
        "pass_count": sum(1 for r in fixture_reports if r["passed"]),
        "fixtures": fixture_reports,
    }
    return report


def _write_report(report: dict[str, Any]) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORTS_DIR / f"{report['run_id']}.json"
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str))
    return out_path


def _print_overall_summary(report: dict[str, Any], report_path: Path) -> None:
    print("\n=== Eval summary ===")
    print(f"  plan_model:  {report['plan_model']}")
    print(f"  judge_model: {report['judge_model']}")
    print(
        f"  fixtures:    {report['pass_count']}/{report['fixture_count']} passed "
        f"in {report['total_elapsed_seconds']}s"
    )
    for fr in report["fixtures"]:
        status = "PASS" if fr["passed"] else "FAIL"
        overall = (fr["qualitative_score"] or {}).get("overall")
        score_str = f"score={overall}" if overall is not None else "score=n/a"
        print(f"  {status}  {fr['id']:24s} {score_str:11s}  ({fr['elapsed_seconds']}s)")
    print(f"\n  report written: {report_path}")


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="app.evals.run",
        description="Run the plan-generation eval harness over golden fixtures.",
    )
    parser.add_argument(
        "fixtures",
        nargs="*",
        help="Optional fixture ids to run (default: all).",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Print every sub-agent tool_result preview (noisy).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # Quiet the very chatty subagent trace logs unless verbose was requested.
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    if not args.verbose:
        logging.getLogger("app.subagent").setLevel(logging.WARNING)
        logging.getLogger("LiteLLM").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)

    report = asyncio.run(_run_all(args.fixtures, verbose=args.verbose))
    report_path = _write_report(report)
    _print_overall_summary(report, report_path)
    return 0 if report["pass_count"] == report["fixture_count"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
