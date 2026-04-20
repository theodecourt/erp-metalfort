# Configurador em Etapas — Plano 2 (UI StepConfigurator)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a UI do configurador em etapas em `/admin/orcamento/novo`, consumindo `/api/combos` e `/api/templates`, com template picker, 10 etapas em página rolável com índice sticky, combo cards mostrando R$/unidade e Δ-vs-Standard computados localmente.

**Architecture:** Novo componente `StepConfigurator` composto de primitivos (`TemplatePicker`, `StepSidebar`, `ComboCard`) + step components por etapa, todos em `frontend/src/components/StepConfigurator/`. `AdminOrcamentoNew` troca o `Configurator` antigo pelo novo. Δ-vs-Standard calculado client-side usando `formula.ts` + `derive()` existentes — sem novos endpoints. Site público (`/`) continua usando `Configurator` legado.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind, React Router, Vitest + @testing-library/react. Playwright opcional.

**Especificação:** `docs/superpowers/specs/2026-04-20-configurator-etapas-design.md`.
**Plano 1 (fundação backend):** já mergeado em `main` (merge commit `898976e`).

**Commits:** cada task termina num commit. Convenção do repo: `feat(frontend): ...`, `test(frontend): ...` em pt-BR sem acento.

---

## File Structure

**Novos arquivos:**
- `frontend/src/lib/combos.ts` — API client (`fetchCombos`, `fetchTemplates`) + tipos + helper `computeComboCost(combo, vars)`.
- `frontend/src/lib/combos.test.ts` — testes do `computeComboCost` e parsing.
- `frontend/src/components/StepConfigurator/StepConfigurator.tsx` — shell: grid de 3 colunas, fetch combos/templates, state de config, debounce calculate, IntersectionObserver.
- `frontend/src/components/StepConfigurator/TemplatePicker.tsx` — botões Básico / Premium / Personalizado + "↺ Voltar ao template" + modal de confirmação.
- `frontend/src/components/StepConfigurator/StepSidebar.tsx` — coluna esquerda sticky: lista de etapas com marcador de preenchimento + scroll-spy.
- `frontend/src/components/StepConfigurator/ComboCard.tsx` — card selecionável de combo, mostra nome, descrição curta, R$/unidade, Δ-vs-Standard.
- `frontend/src/components/StepConfigurator/StepSection.tsx` — wrapper comum de cada seção com header numerado + âncora para scroll.
- `frontend/src/components/StepConfigurator/steps/EstruturaStep.tsx` — etapa 1 (tamanho, qtd, pé-direito, paredes).
- `frontend/src/components/StepConfigurator/steps/CategoryComboStep.tsx` — etapas 2-6 (genérica: grid de ComboCard + título da etapa por categoria).
- `frontend/src/components/StepConfigurator/steps/EsquadriasStep.tsx` — etapa 7 (portas + caixilhos + combo vidro).
- `frontend/src/components/StepConfigurator/steps/WcStep.tsx` — etapa 8 (checkbox WC + wc_itens).
- `frontend/src/components/StepConfigurator/steps/AcabamentoStep.tsx` — etapa 9 (acabamento_ext + cores).
- `frontend/src/components/StepConfigurator/steps/ExtrasStep.tsx` — etapa 10 (splits + material avulso via PersonalizadoPicker).
- Testes correspondentes: `TemplatePicker.test.tsx`, `StepSidebar.test.tsx`, `ComboCard.test.tsx`, `StepConfigurator.test.tsx`.

**Modificados:**
- `frontend/src/lib/variables.ts` — `Configuracao` TS recebe `combos?` e `template_aplicado?`; `pacote_acabamento` vira opcional (já é).
- `frontend/src/pages/admin/AdminOrcamentoNew.tsx` — troca import `Configurator` por `StepConfigurator`.

**Intocados:**
- `frontend/src/components/Configurator/Configurator.tsx` — segue servindo `/` (site público).
- `frontend/src/pages/public/ConfigurarOrcamento.tsx` — intocado.

---

## Task 1: Atualizar `Configuracao` TS para aceitar combos

**Files:**
- Modify: `frontend/src/lib/variables.ts`

- [ ] **Step 1: Adicionar tipos e campos**

Ler `frontend/src/lib/variables.ts`. Localizar a interface `Configuracao` (por volta da linha 49). Adicionar:

```typescript
export type ComboCategoria =
  | 'fechamento_ext'
  | 'cobertura'
  | 'forro'
  | 'divisoria'
  | 'divisoria_wc'
  | 'piso'
  | 'subpiso'
  | 'vidro';

export type TemplateSlug = 'basico' | 'premium' | 'personalizado';
```

Colocar esses tipos antes da interface `Configuracao`. Modificar a interface:

```typescript
export interface Configuracao {
  tamanho_modulo: '3x3' | '3x6' | '3x9';
  qtd_modulos: number;
  pe_direito_m: number;
  acabamento_ext?: AcabamentoExt;
  cor_ext?: string;
  // Legado: pre-combos. Opcional; normalizer traduz no backend.
  pacote_acabamento?: 'padrao' | 'premium' | 'personalizado';
  itens_personalizados?: ItemPersonalizado[];
  // Configurador em etapas:
  template_aplicado?: TemplateSlug;
  combos?: Partial<Record<ComboCategoria, string>>;
  esquadrias_extras?: {
    portas: number;
    tamanhos_portas?: PortaSize[];
    caixilhos?: Caixilho[];
  };
  piso?: Piso;
  piso_cor?: string;
  tem_wc?: boolean;
  wc_itens?: {
    pia_parede?: boolean;
    pia_bancada?: boolean;
    privada?: boolean;
    chuveiro?: boolean;
  };
  num_splits?: number;
  comp_paredes_ext_m?: number;
  comp_paredes_int_m?: number;
}
```

- [ ] **Step 2: Verificar build TS**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Rodar testes frontend existentes**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npm test -- --run
```

Expected: todos passam (mudança é aditiva).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/variables.ts
git commit -m "feat(frontend): Configuracao aceita combos e template_aplicado"
```

---

## Task 2: API client `combos.ts` + helper `computeComboCost`

**Files:**
- Create: `frontend/src/lib/combos.ts`
- Create: `frontend/src/lib/combos.test.ts`

- [ ] **Step 1: Escrever testes falhando**

Criar `frontend/src/lib/combos.test.ts`:

```typescript
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
```

- [ ] **Step 2: Rodar — deve FALHAR**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/lib/combos.test.ts
```

Expected: FAIL — módulo `combos` não existe.

- [ ] **Step 3: Criar `frontend/src/lib/combos.ts`**

```typescript
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
```

- [ ] **Step 4: Rodar — deve PASSAR**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/lib/combos.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/combos.ts frontend/src/lib/combos.test.ts
git commit -m "feat(frontend): API client de combos/templates + computeComboCost"
```

---

## Task 3: Componente `ComboCard`

**Files:**
- Create: `frontend/src/components/StepConfigurator/ComboCard.tsx`
- Create: `frontend/src/components/StepConfigurator/ComboCard.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `frontend/src/components/StepConfigurator/ComboCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComboCard from './ComboCard';
import type { PacoteCombo } from '../../lib/combos';

const combo: PacoteCombo = {
  id: '1', slug: 'fechamento-premium', categoria: 'fechamento_ext',
  nome: 'Premium', descricao: 'Cimentícia Infibra + Glasroc dupla',
  ordem: 4, ativo: true, materiais: [],
};

describe('ComboCard', () => {
  it('mostra nome e descricao', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={328} unitLabel="m² parede" delta={0} onSelect={() => {}} />);
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText(/Cimentícia Infibra/)).toBeInTheDocument();
  });

  it('mostra preco unitario em formato pt-BR', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={328.50} unitLabel="m² parede" delta={0} onSelect={() => {}} />);
    expect(screen.getByText(/R\$\s?328,50/)).toBeInTheDocument();
    expect(screen.getByText(/m² parede/)).toBeInTheDocument();
  });

  it('mostra Delta positivo vs Standard', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={328} unitLabel="m² parede" delta={12450} onSelect={() => {}} />);
    expect(screen.getByText(/\+R\$\s?12\.450/)).toBeInTheDocument();
    expect(screen.getByText(/vs Standard/i)).toBeInTheDocument();
  });

  it('oculta Delta quando e o proprio Standard (delta===0)', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={245} unitLabel="m² parede" delta={0} onSelect={() => {}} />);
    expect(screen.queryByText(/vs Standard/i)).not.toBeInTheDocument();
  });

  it('aplica estilo de selecionado e chama onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ComboCard combo={combo} selected={true} unitPrice={328} unitLabel="m² parede" delta={0} onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Premium/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar — deve FALHAR**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/ComboCard.test.tsx
```

Expected: FAIL — componente não existe.

- [ ] **Step 3: Criar `frontend/src/components/StepConfigurator/ComboCard.tsx`**

```typescript
import type { PacoteCombo } from '../../lib/combos';
import { fmtBRL } from '../../lib/format';

interface Props {
  combo: PacoteCombo;
  selected: boolean;
  unitPrice: number;
  unitLabel: string; // ex: "m² parede", "m²", "un"
  delta: number;     // diferenca no total do orcamento vs Standard da mesma categoria
  onSelect: () => void;
}

export default function ComboCard({ combo, selected, unitPrice, unitLabel, delta, onSelect }: Props) {
  const mark = selected ? '●' : '○';
  const baseBorder = selected ? 'border-mf-yellow' : 'border-mf-border hover:border-mf-text-secondary';
  const signed = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left w-full bg-mf-black-soft border-2 ${baseBorder} rounded-lg p-4 transition-colors`}
    >
      <div className="flex items-center gap-2 text-mf-yellow text-sm font-bold">
        <span aria-hidden>{mark}</span>
        <span>{combo.nome}</span>
      </div>
      {combo.descricao && (
        <div className="mt-2 text-sm text-mf-text-secondary">{combo.descricao}</div>
      )}
      <div className="mt-3 text-white font-semibold">
        {fmtBRL(unitPrice)} <span className="text-xs text-mf-text-secondary">/ {unitLabel}</span>
      </div>
      {delta !== 0 && (
        <div className={`mt-1 text-xs ${delta > 0 ? 'text-mf-text-secondary' : 'text-mf-success'}`}>
          {signed}{fmtBRL(Math.abs(delta)).replace('R$', 'R$')} vs Standard
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Rodar — deve PASSAR**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/ComboCard.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StepConfigurator/ComboCard.tsx frontend/src/components/StepConfigurator/ComboCard.test.tsx
git commit -m "feat(frontend): ComboCard com preco unitario e delta vs standard"
```

---

## Task 4: Componente `StepSidebar` (índice sticky)

**Files:**
- Create: `frontend/src/components/StepConfigurator/StepSidebar.tsx`
- Create: `frontend/src/components/StepConfigurator/StepSidebar.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `frontend/src/components/StepConfigurator/StepSidebar.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepSidebar, { type StepItem } from './StepSidebar';

const steps: StepItem[] = [
  { id: 'estrutura', label: 'Estrutura', filled: true },
  { id: 'fechamento', label: 'Fechamento', filled: true },
  { id: 'cobertura', label: 'Cobertura', filled: false },
];

describe('StepSidebar', () => {
  it('renderiza os items numerados com marcador de preenchido', () => {
    render(<StepSidebar steps={steps} activeId="estrutura" onJump={() => {}} />);
    expect(screen.getByText(/1\b/)).toBeInTheDocument();
    expect(screen.getByText('Estrutura')).toBeInTheDocument();
    expect(screen.getByText('Fechamento')).toBeInTheDocument();
    expect(screen.getByText('Cobertura')).toBeInTheDocument();
  });

  it('chama onJump com o id ao clicar', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(<StepSidebar steps={steps} activeId="estrutura" onJump={onJump} />);
    await user.click(screen.getByRole('button', { name: /Cobertura/ }));
    expect(onJump).toHaveBeenCalledWith('cobertura');
  });

  it('marca ativo no aria-current', () => {
    render(<StepSidebar steps={steps} activeId="fechamento" onJump={() => {}} />);
    const active = screen.getByRole('button', { name: /Fechamento/ });
    expect(active).toHaveAttribute('aria-current', 'step');
  });
});
```

- [ ] **Step 2: Rodar — FALHA**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/StepSidebar.test.tsx
```

Expected: FAIL — componente não existe.

- [ ] **Step 3: Criar `frontend/src/components/StepConfigurator/StepSidebar.tsx`**

```typescript
export interface StepItem {
  id: string;
  label: string;
  filled: boolean;
}

interface Props {
  steps: StepItem[];
  activeId: string | null;
  onJump: (id: string) => void;
}

export default function StepSidebar({ steps, activeId, onJump }: Props) {
  return (
    <nav aria-label="Etapas do orcamento" className="flex flex-col gap-1 text-sm">
      {steps.map((s, i) => {
        const active = s.id === activeId;
        const mark = s.filled ? '●' : '○';
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onJump(s.id)}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 text-left py-2 px-3 rounded transition-colors ${
              active ? 'bg-mf-black-soft text-mf-yellow' : 'text-mf-text-secondary hover:text-white'
            }`}
          >
            <span aria-hidden className="w-5 text-center text-xs">{i + 1}</span>
            <span aria-hidden>{mark}</span>
            <span className="flex-1">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Rodar — PASSA**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/StepSidebar.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StepConfigurator/StepSidebar.tsx frontend/src/components/StepConfigurator/StepSidebar.test.tsx
git commit -m "feat(frontend): StepSidebar com marcador de etapa e scroll-jump"
```

---

## Task 5: Componente `TemplatePicker`

**Files:**
- Create: `frontend/src/components/StepConfigurator/TemplatePicker.tsx`
- Create: `frontend/src/components/StepConfigurator/TemplatePicker.test.tsx`

- [ ] **Step 1: Escrever teste falhando**

Criar `frontend/src/components/StepConfigurator/TemplatePicker.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplatePicker from './TemplatePicker';

describe('TemplatePicker', () => {
  it('renderiza 3 botoes: Basico, Premium, Personalizado', () => {
    render(<TemplatePicker active="basico" hasCustomizations={false} onApply={() => {}} onRevert={() => {}} />);
    expect(screen.getByRole('button', { name: /Básico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Premium/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personalizado/i })).toBeInTheDocument();
  });

  it('marca o ativo com aria-pressed=true', () => {
    render(<TemplatePicker active="premium" hasCustomizations={false} onApply={() => {}} onRevert={() => {}} />);
    expect(screen.getByRole('button', { name: /Premium/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Básico/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('chama onApply sem modal quando nao ha customizacoes', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<TemplatePicker active="basico" hasCustomizations={false} onApply={onApply} onRevert={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Premium/i }));
    expect(onApply).toHaveBeenCalledWith('premium');
  });

  it('abre modal de confirmacao quando ha customizacoes e confirma', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<TemplatePicker active="basico" hasCustomizations={true} onApply={onApply} onRevert={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Premium/i }));
    // modal aberto
    expect(screen.getByText(/sobrescrever/i)).toBeInTheDocument();
    // onApply NAO deve ter sido chamado ainda
    expect(onApply).not.toHaveBeenCalled();
    // confirmar
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(onApply).toHaveBeenCalledWith('premium');
  });

  it('mostra botao de voltar ao template quando hasCustomizations=true', async () => {
    const user = userEvent.setup();
    const onRevert = vi.fn();
    render(<TemplatePicker active="basico" hasCustomizations={true} onApply={() => {}} onRevert={onRevert} />);
    const revert = screen.getByRole('button', { name: /voltar ao template/i });
    await user.click(revert);
    expect(onRevert).toHaveBeenCalledOnce();
  });

  it('oculta o botao voltar quando nao ha customizacoes', () => {
    render(<TemplatePicker active="basico" hasCustomizations={false} onApply={() => {}} onRevert={() => {}} />);
    expect(screen.queryByRole('button', { name: /voltar ao template/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — FALHA**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/TemplatePicker.test.tsx
```

Expected: FAIL — componente não existe.

- [ ] **Step 3: Criar `frontend/src/components/StepConfigurator/TemplatePicker.tsx`**

```typescript
import { useState } from 'react';
import type { TemplateSlug } from '../../lib/variables';

interface Props {
  active: TemplateSlug;
  hasCustomizations: boolean;
  onApply: (slug: TemplateSlug) => void;
  onRevert: () => void;
}

const OPTIONS: Array<{ slug: TemplateSlug; label: string }> = [
  { slug: 'basico', label: 'Básico' },
  { slug: 'premium', label: 'Premium' },
  { slug: 'personalizado', label: 'Personalizado' },
];

export default function TemplatePicker({ active, hasCustomizations, onApply, onRevert }: Props) {
  const [pending, setPending] = useState<TemplateSlug | null>(null);

  function handleClick(slug: TemplateSlug) {
    if (slug === active) return;
    if (hasCustomizations) {
      setPending(slug);
    } else {
      onApply(slug);
    }
  }

  function confirm() {
    if (pending) onApply(pending);
    setPending(null);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {OPTIONS.map(o => {
        const selected = active === o.slug;
        return (
          <button
            key={o.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => handleClick(o.slug)}
            className={`px-4 py-2 rounded font-semibold ${
              selected ? 'bg-mf-yellow text-mf-black' : 'bg-mf-black-soft text-white'
            }`}
          >
            {o.label}
          </button>
        );
      })}
      {hasCustomizations && (
        <button
          type="button"
          onClick={onRevert}
          className="ml-2 text-sm text-mf-yellow hover:underline"
        >
          ↺ Voltar ao template
        </button>
      )}

      {pending && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-mf-black-soft border border-mf-border rounded-lg p-6 max-w-md">
            <p className="text-white">
              Isso vai sobrescrever as seleções customizadas. Continuar?
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="px-4 py-2 text-mf-text-secondary hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                className="px-4 py-2 bg-mf-yellow text-mf-black font-bold rounded"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar — PASSA**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/TemplatePicker.test.tsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StepConfigurator/TemplatePicker.tsx frontend/src/components/StepConfigurator/TemplatePicker.test.tsx
git commit -m "feat(frontend): TemplatePicker com modal de confirmacao e voltar ao template"
```

---

## Task 6: `StepSection` wrapper + etapa 1 `EstruturaStep`

**Files:**
- Create: `frontend/src/components/StepConfigurator/StepSection.tsx`
- Create: `frontend/src/components/StepConfigurator/steps/EstruturaStep.tsx`

- [ ] **Step 1: Criar `StepSection.tsx`**

```typescript
import type { ReactNode } from 'react';

interface Props {
  id: string;      // id do DOM node, usado pelo IntersectionObserver e pelo scroll-jump
  number: number;  // numero mostrado no header
  title: string;
  children: ReactNode;
}

export default function StepSection({ id, number, title, children }: Props) {
  return (
    <section id={id} className="scroll-mt-8 py-6 border-b border-mf-border">
      <header className="mb-4">
        <h2 className="text-xl font-extrabold text-white">
          <span className="text-mf-yellow mr-2">{number}.</span>
          {title}
        </h2>
      </header>
      <div>{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Criar `steps/EstruturaStep.tsx` (porta os inputs da etapa Estrutura do Configurator antigo)**

```typescript
import NumberField from '../../NumberField/NumberField';
import type { Configuracao } from '../../../lib/variables';

const MODULO_SIZES = { '3x3': [3, 3], '3x6': [3, 6], '3x9': [3, 9] } as const;

function perimetroSingle(tipo: '3x3' | '3x6' | '3x9'): number {
  const [larg, comp] = MODULO_SIZES[tipo];
  return 2 * larg + 2 * comp;
}

function perimetrosEsperados(tipo: '3x3' | '3x6' | '3x9', qtd: number): Array<{ face: number; perim: number }> {
  if (qtd <= 1) return [];
  const [larg, comp] = MODULO_SIZES[tipo];
  const pelaLarg = { face: larg, perim: 2 * larg + 2 * (comp * qtd) };
  const pelaComp = { face: comp, perim: 2 * (larg * qtd) + 2 * comp };
  return larg === comp ? [pelaLarg] : [pelaLarg, pelaComp];
}

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
  peSuggested: number;
}

export default function EstruturaStep({ config, onChange, peSuggested }: Props) {
  function changeTamanho(t: '3x3' | '3x6' | '3x9') {
    onChange({
      ...config,
      tamanho_modulo: t,
      pe_direito_m: ({ '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 } as const)[t],
      comp_paredes_ext_m: config.qtd_modulos === 1 ? perimetroSingle(t) : config.comp_paredes_ext_m,
    });
  }

  function changeQtd(n: number) {
    if (n === 1) {
      onChange({ ...config, qtd_modulos: n, comp_paredes_ext_m: perimetroSingle(config.tamanho_modulo) });
    } else if (config.qtd_modulos === 1) {
      onChange({ ...config, qtd_modulos: n, comp_paredes_ext_m: 0 });
    } else {
      onChange({ ...config, qtd_modulos: n });
    }
  }

  const esperados = perimetrosEsperados(config.tamanho_modulo, config.qtd_modulos);
  const ext = config.comp_paredes_ext_m ?? 0;
  const match = esperados.find(e => Math.abs(e.perim - ext) < 0.01);
  const esperadosLabel = esperados.map(e => `${e.perim.toLocaleString('pt-BR')} m (face ${e.face} m)`).join(' · ');

  return (
    <div className="grid gap-5">
      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Tamanho do módulo</div>
        <div className="flex gap-2">
          {(['3x3', '3x6', '3x9'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => changeTamanho(t)}
              className={`flex-1 py-3 rounded ${
                config.tamanho_modulo === t ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </label>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Quantidade de módulos</div>
        <NumberField
          min={1} max={3} unit="módulos" value={config.qtd_modulos}
          onChange={changeQtd}
          className="w-32 bg-mf-black-soft text-white p-2 rounded border border-mf-border"
        />
      </label>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Pé direito — sugerido: {peSuggested.toLocaleString('pt-BR')} m
        </div>
        <NumberField
          min={2.4} max={3.5} step={0.1} unit="m" value={config.pe_direito_m}
          onChange={n => onChange({ ...config, pe_direito_m: n })}
          className="w-32 bg-mf-black-soft text-white p-2 rounded border border-mf-border"
        />
      </label>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Paredes (metros lineares)</div>
        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-mf-text-secondary">
            Externas:
            <NumberField
              min={0} step={0.1} unit="m" value={config.comp_paredes_ext_m ?? 0}
              onChange={n => onChange({ ...config, comp_paredes_ext_m: n })}
              className="ml-2 w-32 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
            />
          </label>
          <label className="text-sm text-mf-text-secondary">
            Internas:
            <NumberField
              min={0} step={0.1} unit="m" value={config.comp_paredes_int_m ?? 0}
              onChange={n => onChange({ ...config, comp_paredes_int_m: n })}
              className="ml-2 w-32 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
            />
          </label>
        </div>
        {config.qtd_modulos > 1 && (() => {
          if (!ext) return (
            <p className="mt-2 text-xs text-mf-yellow">
              Informe o perímetro externo total. Esperado: {esperadosLabel}.
            </p>
          );
          if (match) return (
            <p className="mt-2 text-xs text-mf-success">✓ Consistente com conexão pela face de {match.face} m.</p>
          );
          return (
            <p className="mt-2 text-xs text-mf-danger">
              ⚠ Não bate com conexão linear (esperado: {esperadosLabel}). Pode estar certo em L/T — confira.
            </p>
          );
        })()}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/StepConfigurator/StepSection.tsx frontend/src/components/StepConfigurator/steps/EstruturaStep.tsx
git commit -m "feat(frontend): StepSection wrapper + EstruturaStep (etapa 1)"
```

---

## Task 7: `CategoryComboStep` (etapas 2-6 genéricas)

**Files:**
- Create: `frontend/src/components/StepConfigurator/steps/CategoryComboStep.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import { useMemo } from 'react';
import ComboCard from '../ComboCard';
import { computeComboCost, findStandardCombo, type PacoteCombo } from '../../../lib/combos';
import type { ComboCategoria } from '../../../lib/variables';

interface Props {
  categoria: ComboCategoria;
  unitLabel: string;                       // ex: "m² parede", "m² piso", "un"
  unitVar: string;                         // chave em `vars` que representa 1 unidade (ex: area_fechamento_ext_m2). Usado para derivar preco unitario.
  combos: PacoteCombo[];                   // todos os combos (ja carregados pela pagina)
  vars: Record<string, any>;               // saida de derive(config)
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
}

export default function CategoryComboStep({ categoria, unitLabel, unitVar, combos, vars, selectedSlug, onSelect }: Props) {
  const categoryCombos = useMemo(
    () => combos.filter(c => c.categoria === categoria).sort((a, b) => a.ordem - b.ordem),
    [combos, categoria],
  );

  const standard = findStandardCombo(combos, categoria);
  const standardTotalCost = standard ? computeComboCost(standard, vars) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {categoryCombos.map(combo => {
        const totalCost = computeComboCost(combo, vars);
        const unit = vars[unitVar];
        const unitPrice = typeof unit === 'number' && unit > 0 ? totalCost / unit : totalCost;
        const delta = combo.slug === standard?.slug ? 0 : totalCost - standardTotalCost;
        return (
          <ComboCard
            key={combo.id}
            combo={combo}
            selected={combo.slug === selectedSlug}
            unitPrice={unitPrice}
            unitLabel={unitLabel}
            delta={delta}
            onSelect={() => onSelect(combo.slug)}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StepConfigurator/steps/CategoryComboStep.tsx
git commit -m "feat(frontend): CategoryComboStep renderiza combos de uma categoria"
```

---

## Task 8: Etapa 7 `EsquadriasStep`

**Files:**
- Create: `frontend/src/components/StepConfigurator/steps/EsquadriasStep.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import NumberField from '../../NumberField/NumberField';
import CategoryComboStep from './CategoryComboStep';
import type { Caixilho, Configuracao } from '../../../lib/variables';
import type { PacoteCombo } from '../../../lib/combos';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
  combos: PacoteCombo[];
  vars: Record<string, any>;
}

export default function EsquadriasStep({ config, onChange, combos, vars }: Props) {
  const esq = config.esquadrias_extras ?? { portas: 0 };
  const portas = esq.portas ?? 0;
  const caixilhos: Caixilho[] = esq.caixilhos ?? [];

  function updateEsq(patch: Partial<NonNullable<Configuracao['esquadrias_extras']>>) {
    onChange({
      ...config,
      esquadrias_extras: {
        portas,
        tamanhos_portas: esq.tamanhos_portas ?? [],
        caixilhos,
        ...patch,
      },
    });
  }

  function addCaixilho() {
    updateEsq({ caixilhos: [...caixilhos, { tipo: 'janela', largura_m: 1.2, altura_m: 1.0, qtd: 1 }] });
  }
  function updateCaixilho(i: number, patch: Partial<Caixilho>) {
    updateEsq({ caixilhos: caixilhos.map((c, idx) => idx === i ? { ...c, ...patch } : c) });
  }
  function removeCaixilho(i: number) {
    updateEsq({ caixilhos: caixilhos.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Portas opacas extras</div>
        <label className="text-sm text-mf-text-secondary">
          Quantidade:
          <NumberField
            min={0} unit="un" value={portas}
            onChange={n => {
              const prev = esq.tamanhos_portas ?? [];
              const next = n > prev.length
                ? [...prev, ...Array(n - prev.length).fill('80x210' as const)]
                : prev.slice(0, n);
              updateEsq({ portas: n, tamanhos_portas: next });
            }}
            className="ml-2 w-24 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
          />
        </label>
        {portas > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {Array.from({ length: portas }).map((_, i) => {
              const current = esq.tamanhos_portas?.[i] ?? '80x210';
              return (
                <label key={i} className="text-sm text-mf-text-secondary">
                  {portas === 1 ? 'Tamanho da porta:' : `Porta ${i + 1}:`}
                  <select
                    value={current}
                    onChange={e => {
                      const arr = [...(esq.tamanhos_portas ?? Array(portas).fill('80x210'))];
                      arr[i] = e.target.value as any;
                      updateEsq({ tamanhos_portas: arr });
                    }}
                    className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
                  >
                    <option value="60x210">60 × 210 cm (banheiro)</option>
                    <option value="70x210">70 × 210 cm (serviço)</option>
                    <option value="80x210">80 × 210 cm (padrão)</option>
                    <option value="90x210">90 × 210 cm (entrada)</option>
                  </select>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Caixilhos (janelas e portas de vidro)
        </div>
        {caixilhos.length === 0 && (
          <p className="text-xs text-mf-text-secondary">Nenhum caixilho. Adicione abaixo.</p>
        )}
        <div className="flex flex-col gap-2">
          {caixilhos.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 bg-mf-black-soft/40 border border-mf-border rounded p-2">
              <label className="text-xs text-mf-text-secondary">
                Tipo
                <select value={c.tipo} onChange={e => updateCaixilho(i, { tipo: e.target.value as any })}
                  className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border">
                  <option value="janela">Janela</option>
                  <option value="porta_vidro">Porta de vidro</option>
                </select>
              </label>
              <label className="text-xs text-mf-text-secondary">
                Largura
                <NumberField min={0.1} step={0.1} unit="m" value={c.largura_m}
                  onChange={n => updateCaixilho(i, { largura_m: n })}
                  className="ml-2 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border" />
              </label>
              <label className="text-xs text-mf-text-secondary">
                Altura
                <NumberField min={0.1} step={0.1} unit="m" value={c.altura_m}
                  onChange={n => updateCaixilho(i, { altura_m: n })}
                  className="ml-2 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border" />
              </label>
              <label className="text-xs text-mf-text-secondary">
                Qtd
                <NumberField min={1} unit="un" value={c.qtd}
                  onChange={n => updateCaixilho(i, { qtd: n })}
                  className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border" />
              </label>
              <button type="button" onClick={() => removeCaixilho(i)}
                className="ml-auto text-mf-danger text-xs px-2 py-1 hover:underline">
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCaixilho}
          className="mt-3 text-sm text-mf-yellow font-semibold hover:underline">
          + Adicionar caixilho
        </button>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Tipo de vidro nos caixilhos
        </div>
        <CategoryComboStep
          categoria="vidro"
          unitLabel="m² vidro"
          unitVar="area_caixilhos_m2"
          combos={combos}
          vars={vars}
          selectedSlug={config.combos?.vidro}
          onSelect={slug => onChange({
            ...config,
            combos: { ...(config.combos ?? {}), vidro: slug },
          })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
git add frontend/src/components/StepConfigurator/steps/EsquadriasStep.tsx
git commit -m "feat(frontend): EsquadriasStep com portas, caixilhos e combo vidro"
```

---

## Task 9: Etapa 8 `WcStep`

**Files:**
- Create: `frontend/src/components/StepConfigurator/steps/WcStep.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import type { Configuracao } from '../../../lib/variables';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
}

export default function WcStep({ config, onChange }: Props) {
  const temWc = !!config.tem_wc;

  function toggleWc(checked: boolean) {
    const nextCombos = { ...(config.combos ?? {}) };
    if (checked) {
      nextCombos.divisoria_wc = 'divisoria-umida';
    } else {
      delete nextCombos.divisoria_wc;
    }
    onChange({
      ...config,
      tem_wc: checked,
      wc_itens: checked
        ? (config.wc_itens ?? { pia_parede: true, pia_bancada: false, privada: true, chuveiro: false })
        : config.wc_itens,
      combos: nextCombos,
    });
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={temWc} onChange={e => toggleWc(e.target.checked)} />
        <span className="text-white">Incluir WC</span>
      </label>
      {temWc && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {([
            ['pia_parede', 'Pia de parede'],
            ['pia_bancada', 'Pia com bancada'],
            ['privada', 'Privada'],
            ['chuveiro', 'Chuveiro'],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 text-mf-text-secondary">
              <input type="checkbox"
                checked={!!config.wc_itens?.[key]}
                onChange={e => onChange({
                  ...config,
                  wc_itens: { ...(config.wc_itens ?? {}), [key]: e.target.checked },
                })} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
      {temWc && (
        <p className="mt-3 text-xs text-mf-text-secondary">
          Parede interna do WC usa placa RU (combo "Úmida" aplicado automaticamente).
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
git add frontend/src/components/StepConfigurator/steps/WcStep.tsx
git commit -m "feat(frontend): WcStep com toggle WC e auto divisoria_wc"
```

---

## Task 10: Etapa 9 `AcabamentoStep`

**Files:**
- Create: `frontend/src/components/StepConfigurator/steps/AcabamentoStep.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import type { AcabamentoExt, Configuracao, Piso } from '../../../lib/variables';
import { ACABAMENTO_EXT_CORES, PISO_CORES } from '../../../lib/variables';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
}

export default function AcabamentoStep({ config, onChange }: Props) {
  return (
    <div className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Acabamento externo</div>
        <div className="flex gap-2 flex-wrap">
          {(['textura', 'pintura', 'cimenticia'] as const).map(a => (
            <button key={a} type="button"
              onClick={() => onChange({
                ...config,
                acabamento_ext: a,
                cor_ext: ACABAMENTO_EXT_CORES[a][0],
              })}
              className={`px-4 py-2 rounded capitalize ${
                config.acabamento_ext === a ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
              }`}>
              {a}
            </button>
          ))}
        </div>
        {config.acabamento_ext && (
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
              Cor do {config.acabamento_ext}
            </div>
            <div className="flex flex-wrap gap-2">
              {ACABAMENTO_EXT_CORES[config.acabamento_ext as AcabamentoExt].map(c => (
                <button key={c} type="button"
                  onClick={() => onChange({ ...config, cor_ext: c })}
                  className={`px-3 py-1.5 rounded text-sm ${
                    config.cor_ext === c ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Cor do piso</div>
        <div className="flex flex-wrap gap-2">
          {PISO_CORES[(config.piso ?? 'vinilico') as Piso].map(c => (
            <button key={c} type="button"
              onClick={() => onChange({ ...config, piso_cor: c })}
              className={`px-3 py-1.5 rounded text-sm ${
                config.piso_cor === c ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
              }`}>
              {c}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mf-text-secondary">
          Tipo de piso é escolhido na etapa "Piso e subpiso".
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
git add frontend/src/components/StepConfigurator/steps/AcabamentoStep.tsx
git commit -m "feat(frontend): AcabamentoStep com acabamento_ext e cores"
```

---

## Task 11: Etapa 10 `ExtrasStep`

**Files:**
- Create: `frontend/src/components/StepConfigurator/steps/ExtrasStep.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import NumberField from '../../NumberField/NumberField';
import PersonalizadoPicker from '../../Configurator/PersonalizadoPicker';
import type { Configuracao } from '../../../lib/variables';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
}

export default function ExtrasStep({ config, onChange }: Props) {
  return (
    <div className="grid gap-5">
      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Splits de ar-condicionado</div>
        <NumberField
          min={0} max={6} unit="un" value={config.num_splits ?? 0}
          onChange={n => onChange({ ...config, num_splits: n })}
          className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"
        />
      </label>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Material avulso (escape hatch)
        </div>
        <PersonalizadoPicker
          itens={config.itens_personalizados ?? []}
          onChange={itens => onChange({ ...config, itens_personalizados: itens })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
git add frontend/src/components/StepConfigurator/steps/ExtrasStep.tsx
git commit -m "feat(frontend): ExtrasStep com splits e material avulso"
```

---

## Task 12: Shell `StepConfigurator` — layout e orquestração

**Files:**
- Create: `frontend/src/components/StepConfigurator/StepConfigurator.tsx`
- Create: `frontend/src/components/StepConfigurator/StepConfigurator.test.tsx`

Este é o componente mais complexo do plano. Shell de 3 colunas, faz fetch de combos/templates, mantém state da config, debounce no `/api/quote/calculate`, e usa IntersectionObserver pra sincronizar sidebar com scroll.

- [ ] **Step 1: Escrever teste falhando (smoke + troca de template)**

Criar `frontend/src/components/StepConfigurator/StepConfigurator.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  (window as any).IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} takeRecords(){return [];} rootMargin=''; thresholds=[]; root=null; };
});

describe('StepConfigurator', () => {
  it('renderiza template picker e etapas principais', async () => {
    const calculate = vi.fn().mockResolvedValue({ subtotal: 0, total: 0, gerenciamento_pct: 8, itens: [] });
    render(<StepConfigurator
      produto={produto}
      initialCombos={combos}
      initialTemplates={templates}
      onConfigChange={() => {}}
      onQuoteChange={() => {}}
      calculate={calculate}
    />);
    expect(screen.getByRole('button', { name: /Básico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Premium/i })).toBeInTheDocument();
    expect(screen.getByText(/Estrutura/)).toBeInTheDocument();
    expect(screen.getByText(/Fechamento/)).toBeInTheDocument();
    expect(screen.getByText(/Cobertura/)).toBeInTheDocument();
    expect(screen.getByText(/Extras/)).toBeInTheDocument();
    // basico vem aplicado por default: calculate foi chamado
    await waitFor(() => expect(calculate).toHaveBeenCalled());
  });

  it('troca de Basico para Premium sem modal (sem customizacoes)', async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole('button', { name: /Premium/i }));
    await waitFor(() => {
      const last = onConfigChange.mock.calls.at(-1)?.[0];
      expect(last?.template_aplicado).toBe('premium');
      expect(last?.combos?.fechamento_ext).toBe('fechamento-premium');
    });
  });
});
```

- [ ] **Step 2: Rodar — FALHA**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/StepConfigurator.test.tsx
```

Expected: FAIL — componente não existe.

- [ ] **Step 3: Criar `StepConfigurator.tsx`**

```typescript
import { useEffect, useMemo, useRef, useState } from 'react';
import TemplatePicker from './TemplatePicker';
import StepSidebar, { type StepItem } from './StepSidebar';
import StepSection from './StepSection';
import EstruturaStep from './steps/EstruturaStep';
import CategoryComboStep from './steps/CategoryComboStep';
import EsquadriasStep from './steps/EsquadriasStep';
import WcStep from './steps/WcStep';
import AcabamentoStep from './steps/AcabamentoStep';
import ExtrasStep from './steps/ExtrasStep';
import PriceBox from '../Configurator/PriceBox';
import { derive, type Configuracao, type TemplateSlug } from '../../lib/variables';
import { fetchCombos, fetchTemplates, type PacoteCombo, type TemplateOrcamento } from '../../lib/combos';
import { apiFetch } from '../../lib/api';

interface ProdutoInput {
  id: string;
  slug: string;
  nome: string;
  tipo_base: '3x3' | '3x6' | '3x9';
  pe_direito_sugerido_m: number;
  opcoes: any[];
}

interface Props {
  produto: ProdutoInput;
  initialCombos?: PacoteCombo[];        // para tests; em producao, fetched from API
  initialTemplates?: TemplateOrcamento[]; // idem
  onConfigChange: (c: Configuracao) => void;
  onQuoteChange: (q: { subtotal: number; total: number; itemCount: number }) => void;
  calculate?: (body: unknown) => Promise<any>;
}

function applyTemplateSelecoes(
  base: Configuracao,
  template: TemplateOrcamento | undefined,
  slug: TemplateSlug,
): Configuracao {
  const selecoes = template?.selecoes ?? {};
  const combos = { ...selecoes };
  // aplicar regra de divisoria_wc conforme tem_wc
  if (base.tem_wc) combos.divisoria_wc = 'divisoria-umida';
  else delete combos.divisoria_wc;
  // Personalizado: zera combos (exceto divisoria_wc se tem_wc)
  if (slug === 'personalizado') {
    return {
      ...base,
      template_aplicado: 'personalizado',
      combos: base.tem_wc ? { divisoria_wc: 'divisoria-umida' } : {},
    };
  }
  return { ...base, template_aplicado: slug, combos };
}

const MODULO_SIZES = { '3x3': [3, 3], '3x6': [3, 6], '3x9': [3, 9] } as const;

function defaultConfig(produto: ProdutoInput): Configuracao {
  const [larg, comp] = MODULO_SIZES[produto.tipo_base];
  return {
    tamanho_modulo: produto.tipo_base,
    qtd_modulos: 1,
    pe_direito_m: produto.pe_direito_sugerido_m,
    acabamento_ext: 'textura',
    cor_ext: 'branco',
    piso: 'vinilico',
    piso_cor: 'carvalho claro',
    esquadrias_extras: { portas: 0, tamanhos_portas: [], caixilhos: [] },
    tem_wc: false,
    num_splits: 0,
    comp_paredes_ext_m: 2 * larg + 2 * comp,
    comp_paredes_int_m: 0,
    combos: {},
    template_aplicado: 'basico',
  };
}

function combosMatchTemplate(
  combos: Configuracao['combos'],
  template: TemplateOrcamento | undefined,
): boolean {
  if (!template) return true;
  const sel = template.selecoes;
  const actual = combos ?? {};
  for (const key of Object.keys(sel)) {
    if ((actual as any)[key] !== (sel as any)[key]) return false;
  }
  return true;
}

export default function StepConfigurator({
  produto, initialCombos, initialTemplates, onConfigChange, onQuoteChange, calculate,
}: Props) {
  const [combos, setCombos] = useState<PacoteCombo[]>(initialCombos ?? []);
  const [templates, setTemplates] = useState<TemplateOrcamento[]>(initialTemplates ?? []);
  const [config, setConfig] = useState<Configuracao>(() => defaultConfig(produto));
  const [activeId, setActiveId] = useState<string>('estrutura');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ subtotal: number; total: number; gerenciamento_pct: number; itens: any[] }>({
    subtotal: 0, total: 0, gerenciamento_pct: 8, itens: [],
  });

  // fetch combos/templates on mount (unless injected for test)
  useEffect(() => {
    if (initialCombos && initialTemplates) return;
    (async () => {
      try {
        const [cs, ts] = await Promise.all([fetchCombos(), fetchTemplates()]);
        setCombos(cs);
        setTemplates(ts);
      } catch { /* ignored in UI */ }
    })();
  }, []);

  // aplicar template basico quando templates carregam (primeira vez)
  const appliedInitialTemplate = useRef(false);
  useEffect(() => {
    if (appliedInitialTemplate.current || templates.length === 0) return;
    const basico = templates.find(t => t.slug === 'basico');
    setConfig(prev => applyTemplateSelecoes(prev, basico, 'basico'));
    appliedInitialTemplate.current = true;
  }, [templates]);

  const defaultCalculate = (body: unknown) =>
    apiFetch<any>('/api/public/quote/calculate', { method: 'POST', body: JSON.stringify(body) });

  // debounce calculate on config change
  useEffect(() => {
    onConfigChange(config);
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      (calculate ?? defaultCalculate)({ produto_id: produto.id, configuracao: config })
        .then((r: any) => {
          if (cancelled) return;
          setQuote({ subtotal: r.subtotal, total: r.total, gerenciamento_pct: r.gerenciamento_pct, itens: r.itens });
          onQuoteChange({ subtotal: r.subtotal, total: r.total, itemCount: r.itens.length });
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(id); };
  }, [JSON.stringify(config), produto.id]);

  const vars = useMemo(() => derive(config), [JSON.stringify(config)]);

  const activeTemplate = templates.find(t => t.slug === config.template_aplicado);
  const hasCustomizations = config.template_aplicado !== 'personalizado'
    && !combosMatchTemplate(config.combos, activeTemplate);

  function handleApplyTemplate(slug: TemplateSlug) {
    const t = templates.find(x => x.slug === slug);
    setConfig(prev => applyTemplateSelecoes(prev, t, slug));
  }

  function handleRevert() {
    const t = templates.find(x => x.slug === config.template_aplicado);
    if (!t) return;
    setConfig(prev => applyTemplateSelecoes(prev, t, (config.template_aplicado ?? 'basico') as TemplateSlug));
  }

  function setComboForCategoria(cat: keyof NonNullable<Configuracao['combos']>, slug: string) {
    setConfig(prev => ({
      ...prev,
      combos: { ...(prev.combos ?? {}), [cat]: slug },
    }));
  }

  // Scroll-spy: observa quais secoes estao visiveis
  const sectionIds = [
    'estrutura', 'fechamento_ext', 'cobertura', 'forro', 'divisoria',
    'piso', 'esquadrias', 'wc', 'acabamento', 'extras',
  ];
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  function handleJump(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  }

  const stepItems: StepItem[] = [
    { id: 'estrutura', label: 'Estrutura', filled: true },
    { id: 'fechamento_ext', label: 'Fechamento', filled: !!config.combos?.fechamento_ext },
    { id: 'cobertura', label: 'Cobertura', filled: !!config.combos?.cobertura },
    { id: 'forro', label: 'Forro', filled: !!config.combos?.forro },
    { id: 'divisoria', label: 'Divisórias', filled: !!config.combos?.divisoria },
    { id: 'piso', label: 'Piso', filled: !!config.combos?.piso && !!config.combos?.subpiso },
    { id: 'esquadrias', label: 'Esquadrias', filled: !!config.combos?.vidro },
    { id: 'wc', label: 'WC', filled: true },
    { id: 'acabamento', label: 'Acabamento', filled: !!config.cor_ext && !!config.piso_cor },
    { id: 'extras', label: 'Extras', filled: true },
  ];

  const peSuggested = ({ '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 } as const)[config.tamanho_modulo];

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm text-mf-text-secondary">Template</div>
        <div className="mt-2">
          <TemplatePicker
            active={(config.template_aplicado ?? 'basico') as TemplateSlug}
            hasCustomizations={hasCustomizations}
            onApply={handleApplyTemplate}
            onRevert={handleRevert}
          />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[200px_1fr_320px]">
        <aside className="md:sticky md:top-4 md:self-start">
          <StepSidebar steps={stepItems} activeId={activeId} onJump={handleJump} />
        </aside>

        <main>
          <StepSection id="estrutura" number={1} title="Estrutura & geometria">
            <EstruturaStep config={config} onChange={setConfig} peSuggested={peSuggested} />
          </StepSection>

          <StepSection id="fechamento_ext" number={2} title="Fechamento de parede externa">
            <CategoryComboStep
              categoria="fechamento_ext" unitLabel="m² parede" unitVar="area_fechamento_ext_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.fechamento_ext}
              onSelect={slug => setComboForCategoria('fechamento_ext', slug)}
            />
          </StepSection>

          <StepSection id="cobertura" number={3} title="Cobertura">
            <CategoryComboStep
              categoria="cobertura" unitLabel="m² cobertura" unitVar="area_cobertura_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.cobertura}
              onSelect={slug => setComboForCategoria('cobertura', slug)}
            />
          </StepSection>

          <StepSection id="forro" number={4} title="Forro interno">
            <CategoryComboStep
              categoria="forro" unitLabel="m² piso" unitVar="area_planta_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.forro}
              onSelect={slug => setComboForCategoria('forro', slug)}
            />
          </StepSection>

          <StepSection id="divisoria" number={5} title="Divisórias internas">
            <CategoryComboStep
              categoria="divisoria" unitLabel="m² parede" unitVar="area_parede_interna_nao_wc_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.divisoria}
              onSelect={slug => setComboForCategoria('divisoria', slug)}
            />
          </StepSection>

          <StepSection id="piso" number={6} title="Piso e subpiso">
            <div className="mb-6">
              <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Piso</div>
              <CategoryComboStep
                categoria="piso" unitLabel="m² piso" unitVar="area_planta_m2"
                combos={combos} vars={vars}
                selectedSlug={config.combos?.piso}
                onSelect={slug => setComboForCategoria('piso', slug)}
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Subpiso</div>
              <CategoryComboStep
                categoria="subpiso" unitLabel="m² piso" unitVar="area_planta_m2"
                combos={combos} vars={vars}
                selectedSlug={config.combos?.subpiso}
                onSelect={slug => setComboForCategoria('subpiso', slug)}
              />
            </div>
          </StepSection>

          <StepSection id="esquadrias" number={7} title="Esquadrias (portas e caixilhos)">
            <EsquadriasStep config={config} onChange={setConfig} combos={combos} vars={vars} />
          </StepSection>

          <StepSection id="wc" number={8} title="WC interno">
            <WcStep config={config} onChange={setConfig} />
          </StepSection>

          <StepSection id="acabamento" number={9} title="Acabamento de superfície & cores">
            <AcabamentoStep config={config} onChange={setConfig} />
          </StepSection>

          <StepSection id="extras" number={10} title="Extras & instalações">
            <ExtrasStep config={config} onChange={setConfig} />
          </StepSection>
        </main>

        <aside className="md:sticky md:top-4 md:self-start space-y-4">
          <PriceBox
            subtotal={quote.subtotal}
            total={quote.total}
            gerenciamentoPct={quote.gerenciamento_pct}
            itemCount={quote.itens.length}
            loading={loading}
          />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes — devem PASSAR**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx vitest run src/components/StepConfigurator/StepConfigurator.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Rodar suite completa**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npm test -- --run
```

Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/StepConfigurator/StepConfigurator.tsx frontend/src/components/StepConfigurator/StepConfigurator.test.tsx
git commit -m "feat(frontend): shell StepConfigurator com layout de 3 colunas e orquestracao"
```

---

## Task 13: Trocar `Configurator` por `StepConfigurator` em `AdminOrcamentoNew`

**Files:**
- Modify: `frontend/src/pages/admin/AdminOrcamentoNew.tsx`

- [ ] **Step 1: Swap do import e uso**

Ler `frontend/src/pages/admin/AdminOrcamentoNew.tsx`. Substituir:

```typescript
import Configurator from '../../components/Configurator/Configurator';
```

por:

```typescript
import StepConfigurator from '../../components/StepConfigurator/StepConfigurator';
```

E no JSX, trocar:

```tsx
<Configurator
  produto={produto}
  onConfigChange={setConfig}
  onQuoteChange={() => {}}
  calculate={calculateInternal}
/>
```

por:

```tsx
<StepConfigurator
  produto={produto}
  onConfigChange={setConfig}
  onQuoteChange={() => {}}
  calculate={calculateInternal}
/>
```

Nada mais muda — a interface de callback é a mesma.

- [ ] **Step 2: Build check**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx tsc --noEmit
```

- [ ] **Step 3: Rodar dev e validar manualmente**

Em um terminal: `cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort && make dev`.

No browser:
1. `/admin/login` com `admin@metalfort.tech / metalfort2026!`.
2. `/admin/orcamento/novo`.
3. Escolher "Metalfort Home".
4. Verificar: index lateral com 10 etapas, botões Básico/Premium/Personalizado, combo cards em cada categoria.
5. Clicar em Premium — modal não aparece (sem customizações), combos mudam, preço atualiza.
6. Voltar para Básico — idem.
7. Selecionar um combo diferente em "Fechamento" — aparece botão "↺ Voltar ao template".
8. Clicar em "↺ Voltar ao template" — seleção original do template volta.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminOrcamentoNew.tsx
git commit -m "feat(admin): AdminOrcamentoNew usa StepConfigurator"
```

---

## Task 14: Polish mobile e sanity final

**Files:**
- Modify: `frontend/src/components/StepConfigurator/StepConfigurator.tsx`

- [ ] **Step 1: Ajustar grid para mobile**

No `StepConfigurator.tsx`, atual:
```tsx
<div className="grid gap-8 md:grid-cols-[200px_1fr_320px]">
```

Já é responsivo: em mobile (<768px) cai pra uma coluna única. O `md:sticky` aplica só no desktop. Como polish adicional, fazer o `aside` esquerdo virar scroll horizontal no mobile (scrollable chip list):

Substituir o `<aside>` esquerdo por:

```tsx
<aside className="md:sticky md:top-4 md:self-start">
  <div className="md:hidden overflow-x-auto -mx-4 px-4 pb-2 mb-4 border-b border-mf-border">
    <div className="flex gap-2 whitespace-nowrap">
      <StepSidebar steps={stepItems} activeId={activeId} onJump={handleJump} />
    </div>
  </div>
  <div className="hidden md:block">
    <StepSidebar steps={stepItems} activeId={activeId} onJump={handleJump} />
  </div>
</aside>
```

(Isso faz o sidebar ficar como chips horizontais no mobile e coluna vertical no desktop. Simples; aceitável para uma primeira iteração.)

- [ ] **Step 2: Rodar dev e verificar no browser**

Com `make dev`, redimensionar a janela para 375px (iPhone) e confirmar que a UI não quebra e a navegação ainda funciona.

- [ ] **Step 3: Suite final**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npm test -- --run
```

Expected: todos passam.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/StepConfigurator/StepConfigurator.tsx
git commit -m "feat(frontend): StepConfigurator sidebar responsivo no mobile"
```

---

## Task 15: Smoke E2E Playwright (opcional mas recomendado)

**Files:**
- Create: `frontend/e2e/step-configurator.spec.ts`

- [ ] **Step 1: Criar spec**

```typescript
import { test, expect } from '@playwright/test';

test.describe('StepConfigurator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill('admin@metalfort.tech');
    await page.getByLabel(/senha/i).fill('metalfort2026!');
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL(/\/admin/);
  });

  test('admin cria orcamento com template Basico', async ({ page }) => {
    await page.goto('/admin/orcamento/novo');
    await page.getByLabel(/produto/i).selectOption({ label: 'Metalfort Home' });

    // sidebar tem 10 etapas
    await expect(page.getByRole('button', { name: /Estrutura/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fechamento/ })).toBeVisible();

    // template Basico esta ativo
    const basico = page.getByRole('button', { name: /^Básico$/ });
    await expect(basico).toHaveAttribute('aria-pressed', 'true');

    // troca pra Premium
    await page.getByRole('button', { name: /^Premium$/ }).click();
    await expect(page.getByRole('button', { name: /^Premium$/ })).toHaveAttribute('aria-pressed', 'true');

    // preenche cliente e submete
    await page.getByPlaceholder(/Nome/).fill('Teste E2E');
    await page.getByPlaceholder(/Email/).fill('e2e@test.local');
    await page.getByLabel(/Enviar PDF/).uncheck();
    await page.getByRole('button', { name: /Criar rascunho/i }).click();
    await page.waitForURL(/\/admin\/orcamento\/[a-z0-9-]+$/);
    await expect(page.getByText(/Teste E2E/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar (requer make dev em outro terminal)**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort/frontend
npx playwright test step-configurator.spec.ts --headed
```

Expected: o teste passa.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/step-configurator.spec.ts
git commit -m "test(e2e): smoke do StepConfigurator com troca de template"
```

---

## Resumo das entregas do Plano 2

Após 15 tasks:
- `Configuracao` TS aceita `combos` e `template_aplicado`.
- `lib/combos.ts` expõe `fetchCombos`, `fetchTemplates`, `computeComboCost`, `findStandardCombo`, `groupCombosByCategoria`.
- 3 primitivos (`ComboCard`, `StepSidebar`, `TemplatePicker`) + `StepSection` wrapper.
- 6 step components (`EstruturaStep`, `CategoryComboStep`, `EsquadriasStep`, `WcStep`, `AcabamentoStep`, `ExtrasStep`).
- Shell `StepConfigurator` orquestrando tudo: grid 3-colunas, sticky sidebar + price box, debounce calculate, IntersectionObserver para scroll-spy, aplica template inicial, detecta customizações.
- `AdminOrcamentoNew` passa a usar `StepConfigurator`.
- Site público inalterado (continua em `Configurator` antigo).
- Polish mobile (sidebar horizontal).
- Smoke E2E opcional.

**Como validar no dia-a-dia:** `make dev` → `/admin/login` → `/admin/orcamento/novo` → escolher produto → ver as 10 etapas + template picker + price sticky.

**O que fica para ondas futuras:**
- Migrar site público (`/`) para o novo fluxo em etapas.
- Admin CRUD de combos/templates (hoje seedados, requerem deploy pra mudar).
