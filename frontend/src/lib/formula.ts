export type Scalar = number | boolean | string;

export type Expr =
  | Scalar
  | { op: 'var'; of: string }
  | { op: 'add' | 'sub' | 'mul' | 'div' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte'; of: Expr[]; waste?: number }
  | { op: 'ceil' | 'floor' | 'round'; of: Expr; waste?: number }
  | { op: 'if'; cond: Expr; then: Expr; else: Expr; waste?: number };

function applyWaste(value: number, waste?: number): number {
  return waste == null ? value : value * (1 + waste);
}

export function evaluate(expr: Expr, vars: Record<string, any>): any {
  if (typeof expr === 'number' || typeof expr === 'boolean' || typeof expr === 'string') {
    return expr;
  }
  const e = expr as any;
  const op = e.op;
  const waste = e.waste as number | undefined;

  if (op === 'var') {
    if (!(e.of in vars)) throw new Error(`Unknown variable: ${e.of}`);
    return vars[e.of];
  }

  if (['add', 'sub', 'mul', 'div'].includes(op)) {
    const operands = (e.of as Expr[]).map(x => evaluate(x, vars) as number);
    let r: number;
    if (op === 'add') r = operands.reduce((a, b) => a + b, 0);
    else if (op === 'sub') r = operands.reduce((a, b, i) => i === 0 ? b : a - b, 0);
    else if (op === 'mul') r = operands.reduce((a, b) => a * b, 1);
    else r = operands.reduce((a, b, i) => i === 0 ? b : a / b, 0);
    return applyWaste(r, waste);
  }

  if (['eq', 'gt', 'gte', 'lt', 'lte'].includes(op)) {
    const [a, b] = (e.of as Expr[]).map(x => evaluate(x, vars));
    switch (op) {
      case 'eq': return a === b;
      case 'gt': return a > b;
      case 'gte': return a >= b;
      case 'lt': return a < b;
      case 'lte': return a <= b;
    }
  }

  if (op === 'ceil') return applyWaste(Math.ceil(evaluate(e.of, vars) as number), waste);
  if (op === 'floor') return applyWaste(Math.floor(evaluate(e.of, vars) as number), waste);
  if (op === 'round') {
    const v = evaluate(e.of, vars) as number;
    const rounded = v >= 0 ? Math.floor(v + 0.5) : -Math.floor(-v + 0.5);
    return applyWaste(rounded, waste);
  }

  if (op === 'if') {
    const c = evaluate(e.cond, vars);
    return applyWaste(evaluate(c ? e.then : e.else, vars), waste);
  }

  throw new Error(`Unknown op: ${op}`);
}
