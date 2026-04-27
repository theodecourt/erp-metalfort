import { useEffect, useState } from 'react';
import {
  COMBO_VARIABLES,
  TEMPLATE_LABEL,
  buildFormula,
  detectTemplate,
  isKnownVariable,
  type ParsedTemplate,
  type TemplateKind,
} from '../../lib/comboFormula';
import type { Expr } from '../../lib/formula';

interface Props {
  /** Fórmula inicial — se omitida, default = template A com primeira var. */
  initial?: Expr;
  /** Chamado a cada mudança válida (ou null se inválido). */
  onChange: (expr: Expr | null) => void;
}

const KINDS: TemplateKind[] = ['A', 'B', 'C', 'D'];

export default function MaterialFormulaEditor({ initial, onChange }: Props) {
  const [parsed, setParsed] = useState<ParsedTemplate>(() =>
    initial !== undefined ? detectTemplate(initial) : { kind: 'A', varName: COMBO_VARIABLES[0].name }
  );
  const [kindOverride, setKindOverride] = useState<TemplateKind | 'custom' | null>(null);
  const [varInvalid, setVarInvalid] = useState(false);

  const currentKind: TemplateKind | 'custom' = kindOverride ?? parsed.kind;

  // Avisa parent
  useEffect(() => {
    if (parsed.kind === 'custom') {
      onChange(parsed.expr);
      return;
    }
    if (parsed.kind === 'A' || parsed.kind === 'B' || parsed.kind === 'C') {
      if (!isKnownVariable(parsed.varName)) {
        setVarInvalid(true);
        onChange(null);
        return;
      }
      setVarInvalid(false);
    }
    if (parsed.kind === 'B' && !Number.isFinite(parsed.fator)) { onChange(null); return; }
    if (parsed.kind === 'C' && (!Number.isFinite(parsed.cobertura) || parsed.cobertura <= 0)) {
      onChange(null);
      return;
    }
    if (parsed.kind === 'C' && (!Number.isFinite(parsed.waste) || parsed.waste < 0)) {
      onChange(null);
      return;
    }
    if (parsed.kind === 'D' && !Number.isFinite(parsed.constante)) { onChange(null); return; }
    onChange(buildFormula(parsed));
  }, [parsed]);

  function changeKind(k: TemplateKind) {
    setKindOverride(k);
    const firstVar = COMBO_VARIABLES[0].name;
    const currentVar =
      'varName' in parsed && isKnownVariable(parsed.varName) ? parsed.varName : firstVar;
    if (k === 'A') setParsed({ kind: 'A', varName: currentVar });
    else if (k === 'B') setParsed({ kind: 'B', varName: currentVar, fator: 1 });
    else if (k === 'C') setParsed({ kind: 'C', varName: currentVar, cobertura: 1, waste: 0.07 });
    else if (k === 'D') setParsed({ kind: 'D', constante: 1 });
  }

  if (currentKind === 'custom') {
    const expr = (parsed as any).expr ?? initial ?? null;
    return (
      <div className="space-y-2">
        <p className="text-xs text-mf-text-secondary">
          Fórmula custom (não bate com nenhum dos 4 templates).
          Edição via JSON manual.
        </p>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(expr)}
        </pre>
        <button
          type="button"
          onClick={() => changeKind('A')}
          className="text-xs text-mf-yellow font-bold underline"
        >Substituir por template padrão</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs text-mf-text-secondary">Tipo de fórmula</span>
        <select
          value={currentKind}
          onChange={e => changeKind(e.target.value as TemplateKind)}
          className="block w-full border rounded px-2 py-1 text-sm"
        >
          {KINDS.map(k => (
            <option key={k} value={k}>{TEMPLATE_LABEL[k]}</option>
          ))}
        </select>
      </label>

      {(currentKind === 'A' || currentKind === 'B' || currentKind === 'C') && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Variável</span>
          <select
            value={(parsed as any).varName}
            onChange={e => setParsed(p => ({ ...(p as any), varName: e.target.value }))}
            className="block w-full border rounded px-2 py-1 text-sm"
          >
            {!isKnownVariable((parsed as any).varName) && (
              <option value={(parsed as any).varName}>
                {(parsed as any).varName} (desconhecida)
              </option>
            )}
            {COMBO_VARIABLES.map(v => (
              <option key={v.name} value={v.name}>{v.label}</option>
            ))}
          </select>
          {varInvalid && (
            <span className="text-xs text-mf-danger">Variável desconhecida.</span>
          )}
        </label>
      )}

      {currentKind === 'B' && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Fator</span>
          <input
            type="number" step="any"
            value={(parsed as any).fator}
            onChange={e => setParsed(p => ({ ...(p as any), fator: Number(e.target.value) }))}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            className="block w-full border rounded px-2 py-1 text-sm"
          />
        </label>
      )}

      {currentKind === 'C' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Cobertura por unidade</span>
            <input
              type="number" step="any" min="0"
              value={(parsed as any).cobertura}
              onChange={e => setParsed(p => ({ ...(p as any), cobertura: Number(e.target.value) }))}
              onWheel={e => (e.target as HTMLInputElement).blur()}
              className="block w-full border rounded px-2 py-1 text-sm"
            />
            <span className="text-[10px] text-mf-text-secondary">ex: chapa cobre 2.88 m²</span>
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Waste (perda) — fração</span>
            <input
              type="number" step="0.01" min="0"
              value={(parsed as any).waste}
              onChange={e => setParsed(p => ({ ...(p as any), waste: Number(e.target.value) }))}
              onWheel={e => (e.target as HTMLInputElement).blur()}
              className="block w-full border rounded px-2 py-1 text-sm"
            />
            <span className="text-[10px] text-mf-text-secondary">0.07 = 7%</span>
          </label>
        </div>
      )}

      {currentKind === 'D' && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Constante</span>
          <input
            type="number" step="any"
            value={(parsed as any).constante}
            onChange={e => setParsed(p => ({ ...(p as any), constante: Number(e.target.value) }))}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            className="block w-full border rounded px-2 py-1 text-sm"
          />
        </label>
      )}

      <details className="text-xs">
        <summary className="text-mf-text-secondary cursor-pointer">JSON resultante</summary>
        <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(buildFormula(parsed))}
        </pre>
      </details>
    </div>
  );
}
