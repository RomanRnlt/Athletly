# Plan-generation eval harness

A deterministic, offline-friendly harness for the plan-generation pipeline
(generator + nested evaluator sub-agents). Run it after every skill edit or
evaluator calibration to see quantitatively whether things improved.

## What it does

For each golden fixture in `fixtures/data.py`:

1. Mocks the Supabase + web-search layer so the agent sees only the fixture's
   synthetic profile, activities, and metrics.
2. Calls `agents.spawn("plan", ...)` end-to-end (real LLM, real generator +
   evaluator loop, real validator).
3. Structurally validates the plan via the skill-shipped
   `skills/plan/scripts/validate_plan.py` (same script the runtime uses).
4. Runs deterministic invariants from the fixture (e.g. "no consecutive hard
   runs", "max 30 min sessions", "all required sports present"). See
   `asserts.py` for the closed vocabulary.
5. Scores the plan qualitatively with an LLM judge on six axes
   (`goal_alignment`, `load_progression`, `recovery_adequacy`,
   `constraint_adherence`, `specificity`, `science_grounding`), 0-10 each,
   summed to a 0-100 overall.
6. Writes a JSON report to `app/evals/reports/<UTC-iso>.json` and prints a
   compact stdout summary.

The harness is the only thing in the repo that drives the plan pipeline with
fake athletes; everything else lives in `app/` and is unchanged.

## When to run

- Before / after every edit to `skills/plan/SKILL.md` or
  `skills/evaluate-plan/SKILL.md`.
- After changing the agent registry, validator, evaluator round cap, or model.
- As a smoke check before shipping a release.

## Usage

Full run (all 6 fixtures):

```
cd services/api
.venv/bin/python -m app.evals.run
```

A single fixture (fastest is `beginner_no_data`: no synthetic data to chew on):

```
.venv/bin/python -m app.evals.run beginner_no_data
```

A subset:

```
.venv/bin/python -m app.evals.run roman_shin_splints deload_needed
```

Override the judge model:

```
ATHLETLY_EVAL_JUDGE_MODEL=anthropic/claude-opus-4-7 \
  .venv/bin/python -m app.evals.run
```

Override the plan model the same way:

```
ATHLETLY_PLAN_MODEL=anthropic/claude-sonnet-4-5 \
  .venv/bin/python -m app.evals.run
```

Verbose (every sub-agent tool result; noisy):

```
.venv/bin/python -m app.evals.run -v
```

## Exit code

`0` when every fixture passes structurally and on its invariants; `1`
otherwise. The qualitative judge score is informational only and does not
affect the exit code (use it to track drift, not as a gate).

## What is mocked

- `app.db.search_activities` / `fetch_activities_between` / `get_daily_metrics`
  return the fixture's synthetic rows (filtered by sport/days).
- `app.profile.read_sections` returns the fixture's 6 profile sections.
- `app.profile.is_onboarded` returns the fixture's flag (always True in the
  bundled fixtures).
- `app.tools.web_search` returns an empty result set (no network, no
  flakiness). The model handles "no results" cleanly.
- `app.db.insert_plan` / `update_plan` / `archive_plans` raise if called -
  belt and braces, the eval never persists anything.

The plan agent itself, the validator, the evaluator sub-agent, all schemas,
and the LLM model selection are NOT mocked. We exercise the real path.

## Fixtures

| id | what it tests |
| --- | --- |
| `roman_shin_splints` | Injury-aware reduction, recent volume vs plan jump, no hard runs back-to-back. |
| `beginner_no_data` | Cold-start conservatism: short sessions, plenty of rest, no threshold work. |
| `multisport_hyrox` | Multi-sport coverage + at least one functional format (for_time/amrap/emom). |
| `gym_only` | Strength-only family, no cardio sessions injected. |
| `deload_needed` | Overreach signals (HRV low, recovery low) -> week 1 must be aerobic_base/recovery, no vo2max/threshold. |
| `time_crunched_parent` | Strict time + day budgets (max 35 min, max 3 training days, >= 4 rest days). |

Bump or add fixtures in `fixtures/data.py`. New invariant kinds go into
`asserts.py` with a unit-test-like check.

## Cost note

Each fixture runs the real plan agent (generator + at least one evaluator
round) PLUS one judge call. With Sonnet-4.5 as both plan and judge model,
expect roughly 6 fixtures x (a few hundred K input + 30-50K output) tokens
per full run. Budget accordingly.
