import json
from pathlib import Path

import pytest

from app.services.bom_engine import evaluate

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[2] / "database/tests/formula-fixtures.json").read_text()
)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda c: c["name"])
def test_formula_fixture(case):
    result = evaluate(case["formula"], case["vars"])
    expected = case["expect"]
    if isinstance(expected, float):
        assert result == pytest.approx(expected, rel=1e-9)
    else:
        assert result == expected
