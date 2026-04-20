import { apiFetch } from './api';
import { evaluate, type Expr } from './formula';
import type { ComboCategoria } from './variables';

export interface Material {
  id: string;
  sku: string;
  nome: string;
  unidade: string;
  preco_unitario: number;
}

export interface PacoteComboMaterial {
  pacote_combo_id: string;
  material_id: string;
  formula_json: Expr;
  ordem: number;
  material: Material;
}

export interface PacoteCombo {
  id: string;
  slug: string;
  categoria: ComboCategoria;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  materiais: PacoteComboMaterial[];
}

export interface TemplateOrcamento {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  selecoes: Partial<Record<ComboCategoria, string>>;
}

export async function fetchCombos(): Promise<PacoteCombo[]> {
  return apiFetch<PacoteCombo[]>('/api/combos');
}

export async function fetchTemplates(): Promise<TemplateOrcamento[]> {
  return apiFetch<TemplateOrcamento[]>('/api/templates');
}

/** Soma preco_unitario * quantidade (avaliada) para cada material do combo. */
export function computeComboCost(
  combo: PacoteCombo,
  vars: Record<string, any>,
): number {
  let total = 0;
  for (const m of combo.materiais) {
    const qtyRaw = evaluate(m.formula_json, vars);
    const qty = typeof qtyRaw === 'number' ? qtyRaw : 0;
    if (qty <= 0) continue;
    total += qty * m.material.preco_unitario;
  }
  return total;
}

/** Agrupa combos por categoria, preservando a ordem retornada pela API. */
export function groupCombosByCategoria(
  combos: PacoteCombo[],
): Record<ComboCategoria, PacoteCombo[]> {
  const out = {} as Record<ComboCategoria, PacoteCombo[]>;
  for (const c of combos) {
    (out[c.categoria] ??= []).push(c);
  }
  return out;
}

/** Encontra o combo Standard (primeiro na ordem) de uma categoria. */
export function findStandardCombo(
  combos: PacoteCombo[],
  categoria: ComboCategoria,
): PacoteCombo | undefined {
  return combos.filter(c => c.categoria === categoria).sort((a, b) => a.ordem - b.ordem)[0];
}
