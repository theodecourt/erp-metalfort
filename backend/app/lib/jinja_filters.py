from __future__ import annotations

from jinja2 import Environment


def _fmt_pt_br(value: float, digits: int = 2) -> str:
    """Format a number using pt-BR conventions: '.' as thousands, ',' as decimal."""
    n = float(value)
    # Python's format doesn't speak pt-BR natively; format with comma thousands
    # and a dot decimal, then swap the separators.
    s = f"{n:,.{digits}f}"  # e.g. 1,234.56
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def brl(value: float) -> str:
    """`12345.6` -> `'R$ 12.345,60'`."""
    return f"R$ {_fmt_pt_br(value, 2)}"


def dec(value: float, digits: int = 2) -> str:
    """`2.7` -> `'2,70'`."""
    return _fmt_pt_br(value, digits)


def install(env: Environment) -> None:
    env.filters["brl"] = brl
    env.filters["dec"] = dec
