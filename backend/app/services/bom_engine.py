from __future__ import annotations

import math
from typing import Any

Number = int | float


def _apply_waste(value: Number, waste: float | None) -> Number:
    if waste is None:
        return value
    return value * (1 + waste)


def evaluate(expr: Any, vars: dict[str, Any]) -> Any:
    if isinstance(expr, bool):
        return expr
    if isinstance(expr, (int, float)):
        return expr
    if isinstance(expr, str):
        return expr
    if not isinstance(expr, dict):
        raise ValueError(f"Invalid expression: {expr!r}")

    op = expr.get("op")
    waste = expr.get("waste")

    if op == "var":
        name = expr["of"]
        if name not in vars:
            raise KeyError(f"Unknown variable: {name}")
        return vars[name]

    if op in ("add", "sub", "mul", "div"):
        operands = [evaluate(x, vars) for x in expr["of"]]
        if op == "add":
            result: Number = sum(operands)
        elif op == "sub":
            result = operands[0]
            for x in operands[1:]:
                result -= x
        elif op == "mul":
            result = 1
            for x in operands:
                result *= x
        else:
            result = operands[0]
            for x in operands[1:]:
                result /= x
        return _apply_waste(result, waste)

    if op in ("eq", "gt", "gte", "lt", "lte"):
        a, b = [evaluate(x, vars) for x in expr["of"][:2]]
        return {
            "eq": a == b,
            "gt": a > b,
            "gte": a >= b,
            "lt": a < b,
            "lte": a <= b,
        }[op]

    if op == "ceil":
        return _apply_waste(math.ceil(evaluate(expr["of"], vars)), waste)
    if op == "floor":
        return _apply_waste(math.floor(evaluate(expr["of"], vars)), waste)
    if op == "round":
        val = evaluate(expr["of"], vars)
        # "half-up" semantics to match TS behavior
        return _apply_waste(math.floor(val + 0.5) if val >= 0 else -math.floor(-val + 0.5), waste)

    if op == "if":
        cond = evaluate(expr["cond"], vars)
        branch = expr["then"] if cond else expr.get("else", expr.get("else_"))
        return _apply_waste(evaluate(branch, vars), waste)

    raise ValueError(f"Unknown op: {op!r}")
