import type { Expr } from './formula';

export type TemplateKind = 'A' | 'B' | 'C' | 'D' | 'custom';

export interface TemplateA { kind: 'A'; varName: string }
export interface TemplateB { kind: 'B'; varName: string; fator: number }
export interface TemplateC { kind: 'C'; varName: string; cobertura: number; waste: number }
export interface TemplateD { kind: 'D'; constante: number }
export interface TemplateCustom { kind: 'custom'; expr: Expr }

export type ParsedTemplate = TemplateA | TemplateB | TemplateC | TemplateD | TemplateCustom;

export const TEMPLATE_LABEL: Record<TemplateKind, string> = {
  A: 'Variável direta — qtd = var(X)',
  B: 'Variável × fator — qtd = fator × var(X)',
  C: 'Cobertura com perda — qtd = ⌈var(X) / cob⌉ × (1 + waste)',
  D: 'Constante — qtd = N',
  custom: 'Fórmula custom (JSON)',
};

export interface VariableOption { name: string; label: string }

export const COMBO_VARIABLES: VariableOption[] = [
  { name: 'area_planta_m2', label: 'Área de planta (m²)' },
  { name: 'area_cobertura_m2', label: 'Área de cobertura (m²)' },
  { name: 'area_fechamento_ext_m2', label: 'Área fechamento externo líquida (m²)' },
  { name: 'area_fechamento_ext_bruta_m2', label: 'Área fechamento externo bruta (m²)' },
  { name: 'area_aberturas_ext_m2', label: 'Área aberturas externas (m²)' },
  { name: 'area_caixilhos_m2', label: 'Área caixilhos (m²)' },
  { name: 'area_parede_interna_m2', label: 'Área parede interna líquida (m²)' },
  { name: 'area_parede_interna_bruta_m2', label: 'Área parede interna bruta (m²)' },
  { name: 'area_parede_wc_m2', label: 'Área parede WC (m²)' },
  { name: 'area_parede_interna_nao_wc_m2', label: 'Área parede interna (sem WC) (m²)' },
  { name: 'perimetro_externo_m', label: 'Perímetro externo (m)' },
  { name: 'comp_parede_interna_m', label: 'Comprimento parede interna (m)' },
  { name: 'num_portas_ext', label: 'Número de portas externas' },
  { name: 'num_janelas', label: 'Número de janelas' },
  { name: 'num_portas_vidro', label: 'Número de portas de vidro' },
  { name: 'num_splits', label: 'Número de splits' },
];

const VAR_NAMES = new Set(COMBO_VARIABLES.map(v => v.name));

function isPlainNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function isVarExpr(x: unknown): x is { op: 'var'; of: string } {
  return !!x && typeof x === 'object' && (x as any).op === 'var' && typeof (x as any).of === 'string';
}

/** Detecta se uma Expr corresponde a um dos 4 templates (A/B/C/D), senão custom. */
export function detectTemplate(expr: Expr): ParsedTemplate {
  if (isPlainNumber(expr)) return { kind: 'D', constante: expr };

  if (isVarExpr(expr)) {
    if (!(expr as any).waste) return { kind: 'A', varName: expr.of };
  }

  const e = expr as any;

  // Template B: { op: 'mul', of: [number, var] | [var, number] }
  if (e?.op === 'mul' && Array.isArray(e.of) && e.of.length === 2 && !e.waste) {
    const [a, b] = e.of;
    if (isPlainNumber(a) && isVarExpr(b)) return { kind: 'B', varName: b.of, fator: a };
    if (isPlainNumber(b) && isVarExpr(a)) return { kind: 'B', varName: a.of, fator: b };
  }

  // Template C: { op: 'ceil', of: { op: 'div', of: [var, number] }, waste: number }
  if (e?.op === 'ceil' && e.of?.op === 'div' && Array.isArray(e.of.of) && e.of.of.length === 2) {
    const [num, den] = e.of.of;
    if (isVarExpr(num) && isPlainNumber(den)) {
      const waste = typeof e.waste === 'number' ? e.waste : 0;
      return { kind: 'C', varName: num.of, cobertura: den, waste };
    }
  }

  return { kind: 'custom', expr };
}

/** Constrói uma Expr a partir dos parâmetros do template. */
export function buildFormula(t: ParsedTemplate): Expr {
  switch (t.kind) {
    case 'A':
      return { op: 'var', of: t.varName };
    case 'B':
      return { op: 'mul', of: [t.fator, { op: 'var', of: t.varName }] };
    case 'C':
      return {
        op: 'ceil',
        of: { op: 'div', of: [{ op: 'var', of: t.varName }, t.cobertura] },
        waste: t.waste,
      };
    case 'D':
      return t.constante;
    case 'custom':
      return t.expr;
  }
}

export function isKnownVariable(name: string): boolean {
  return VAR_NAMES.has(name);
}

/** Render curto pra exibir numa tabela. */
export function renderFormulaShort(expr: Expr): string {
  const t = detectTemplate(expr);
  switch (t.kind) {
    case 'A': return `var(${t.varName})`;
    case 'B': return `${t.fator} × var(${t.varName})`;
    case 'C': return `⌈var(${t.varName}) / ${t.cobertura}⌉ × (1+${t.waste})`;
    case 'D': return String(t.constante);
    case 'custom': return JSON.stringify(t.expr);
  }
}
