"""Allow ``python -m app.evals`` as a shortcut for ``python -m app.evals.run``."""

from __future__ import annotations

import sys

from .run import main


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
