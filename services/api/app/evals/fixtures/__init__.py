# SPDX-License-Identifier: MIT
"""Golden fixtures for the plan eval harness.

The single source is ``fixtures.data.FIXTURES``: a deterministic, self-contained
list of athlete scenarios with synthetic activities + metrics + profile sections
plus the deterministic invariants the plan must satisfy.
"""

from .data import FIXTURES, Fixture, find_fixture

__all__ = ["FIXTURES", "Fixture", "find_fixture"]
