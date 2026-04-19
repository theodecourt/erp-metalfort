import json
from pathlib import Path

import pytest

from app.services.variables import derive

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[2] / "database/tests/variables-fixtures.json").read_text()
)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda c: c["name"])
def test_derive(case):
    assert derive(case["config"]) == case["expect"]
