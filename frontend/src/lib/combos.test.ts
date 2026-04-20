import { describe, it, expect } from 'vitest';
import { computeComboCost, type PacoteCombo } from './combos';

const mockCombo: PacoteCombo = {
  id: '1',
  slug: 'fechamento-standard',
  categoria: 'fechamento_ext',
  nome: 'Standard',
  descricao: 'Glasroc + lã 50mm + gesso',
  ordem: 1,
  ativo: true,
  materiais: [
    {
      pacote_combo_id: '1',
      material_id: 'm1',
      formula_json: { op: 'var', of: 'area_fechamento_ext_m2' } as any,
      ordem: 1,
      material: {
        id: 'm1',
        sku: 'MT-FCH-001',
        nome: 'Placa Glasroc-X',
        unidade: 'pc',
        preco_unitario: 219.9,
      },
    },
    {
      pacote_combo_id: '1',
      material_id: 'm2',
      formula_json: { op: 'mul', of: [{ op: 'var', of: 'area_fechamento_ext_m2' }, 0.5] } as any,
      ordem: 2,
      material: {
        id: 'm2',
        sku: 'MT-FCH-004',
        nome: 'Membrana',
        unidade: 'rl',
        preco_unitario: 100,
      },
    },
  ],
};

describe('computeComboCost', () => {
  it('soma preco_unitario * quantidade de cada material', () => {
    const vars = { area_fechamento_ext_m2: 10 };
    // m1: 10 * 219.9 = 2199; m2: 10*0.5 * 100 = 500; total = 2699
    expect(computeComboCost(mockCombo, vars)).toBeCloseTo(2699);
  });

  it('retorna 0 para combo sem materiais (ex: forro-sem)', () => {
    const empty: PacoteCombo = { ...mockCombo, materiais: [] };
    expect(computeComboCost(empty, { area_fechamento_ext_m2: 10 })).toBe(0);
  });

  it('ignora quantidades <= 0', () => {
    const neg: PacoteCombo = {
      ...mockCombo,
      materiais: [
        { ...mockCombo.materiais[0], formula_json: { op: 'var', of: 'x' } as any },
      ],
    };
    expect(computeComboCost(neg, { x: -5 })).toBe(0);
    expect(computeComboCost(neg, { x: 0 })).toBe(0);
  });
});
