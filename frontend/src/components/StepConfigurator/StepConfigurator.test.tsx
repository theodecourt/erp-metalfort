import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StepConfigurator from './StepConfigurator';
import type { PacoteCombo, TemplateOrcamento } from '../../lib/combos';

const combos: PacoteCombo[] = [
  { id: '1', slug: 'fechamento-standard', categoria: 'fechamento_ext', nome: 'Standard', descricao: 'std', ordem: 1, ativo: true, materiais: [] },
  { id: '2', slug: 'fechamento-premium',  categoria: 'fechamento_ext', nome: 'Premium',  descricao: 'prem', ordem: 4, ativo: true, materiais: [] },
  { id: '3', slug: 'cobertura-standard',  categoria: 'cobertura',      nome: 'Standard', descricao: 'std', ordem: 1, ativo: true, materiais: [] },
  { id: '4', slug: 'cobertura-termica',   categoria: 'cobertura',      nome: 'Térmica',  descricao: 't',  ordem: 2, ativo: true, materiais: [] },
  { id: '5', slug: 'forro-standard',      categoria: 'forro',          nome: 'Standard', descricao: 's', ordem: 1, ativo: true, materiais: [] },
  { id: '6', slug: 'forro-acustico',      categoria: 'forro',          nome: 'Acústico', descricao: 'a', ordem: 2, ativo: true, materiais: [] },
  { id: '7', slug: 'divisoria-simples',   categoria: 'divisoria',      nome: 'Simples',  descricao: 's', ordem: 1, ativo: true, materiais: [] },
  { id: '8', slug: 'divisoria-acustica',  categoria: 'divisoria',      nome: 'Acústica', descricao: 'a', ordem: 2, ativo: true, materiais: [] },
  { id: '9', slug: 'divisoria-umida',     categoria: 'divisoria_wc',   nome: 'Úmida',    descricao: 'u', ordem: 1, ativo: true, materiais: [] },
  { id: '10', slug: 'piso-vinilico',      categoria: 'piso',           nome: 'Vinílico', descricao: 'v', ordem: 1, ativo: true, materiais: [] },
  { id: '11', slug: 'piso-porcelanato',   categoria: 'piso',           nome: 'Porcelanato', descricao: 'p', ordem: 3, ativo: true, materiais: [] },
  { id: '12', slug: 'subpiso-seco',       categoria: 'subpiso',        nome: 'Seco',     descricao: 's', ordem: 1, ativo: true, materiais: [] },
  { id: '13', slug: 'vidro-simples',      categoria: 'vidro',          nome: 'Simples',  descricao: 's', ordem: 1, ativo: true, materiais: [] },
  { id: '14', slug: 'vidro-duplo',        categoria: 'vidro',          nome: 'Duplo',    descricao: 'd', ordem: 2, ativo: true, materiais: [] },
];

const templates: TemplateOrcamento[] = [
  { id: 't1', slug: 'basico', nome: 'Básico', ordem: 1, selecoes: {
    fechamento_ext: 'fechamento-standard', cobertura: 'cobertura-standard', forro: 'forro-standard',
    divisoria: 'divisoria-simples', piso: 'piso-vinilico', subpiso: 'subpiso-seco', vidro: 'vidro-simples',
  }},
  { id: 't2', slug: 'premium', nome: 'Premium', ordem: 2, selecoes: {
    fechamento_ext: 'fechamento-premium', cobertura: 'cobertura-termica', forro: 'forro-acustico',
    divisoria: 'divisoria-acustica', piso: 'piso-porcelanato', subpiso: 'subpiso-seco', vidro: 'vidro-duplo',
  }},
];

const produto = {
  id: 'p1', slug: 'metalfort-home', nome: 'Metalfort Home',
  tipo_base: '3x6' as const, pe_direito_sugerido_m: 2.7, opcoes: [],
};

beforeEach(() => {
  // Mock IntersectionObserver (jsdom)
  (window as any).IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
    rootMargin = '';
    thresholds = [] as ReadonlyArray<number>;
    root = null;
  };
});

describe('StepConfigurator', () => {
  it('renderiza as etapas principais e aplica defaults do template basico', async () => {
    const onConfigChange = vi.fn();
    const calculate = vi.fn().mockResolvedValue({ subtotal: 0, total: 0, gerenciamento_pct: 8, itens: [] });
    render(<StepConfigurator
      produto={produto}
      initialCombos={combos}
      initialTemplates={templates}
      onConfigChange={onConfigChange}
      onQuoteChange={() => {}}
      calculate={calculate}
    />);

    // sections use h2 headings — query by role="heading" for precision
    expect(screen.getByRole('heading', { name: /Estrutura/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Fechamento/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cobertura/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Extras/ })).toBeInTheDocument();

    // defaults do template basico aplicados silenciosamente (sem UI de template)
    await waitFor(() => {
      const last = onConfigChange.mock.calls.at(-1)?.[0];
      expect(last?.combos?.fechamento_ext).toBe('fechamento-standard');
      expect(last?.combos?.cobertura).toBe('cobertura-standard');
    });
    await waitFor(() => expect(calculate).toHaveBeenCalled(), { timeout: 2000 });
  });
});
