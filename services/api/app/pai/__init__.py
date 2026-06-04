# SPDX-License-Identifier: MIT
"""Pydantic AI migration layer.

Houses the typed building blocks the skill-based agents compile into:
- ``models``: typed agent outputs (TrainingPlan, EvaluationResult) that replace
  the hand-written JSON Schemas (PLAN_SCHEMA / EVALUATION_SCHEMA) and enforce
  structural invariants (e.g. exactly 7 days per week) via Pydantic validation,
  so pydantic-ai retries the model on a violation instead of shipping it.

This package is built up phase by phase during the litellm -> pydantic-ai
migration; see the migration branch history.
"""
