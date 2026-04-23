import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { fmtBRL } from '../../lib/format';
import type { ItemPersonalizado } from '../../lib/variables';
import NumberField from '../NumberField/NumberField';

interface Material {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  unidade: string;
  preco_unitario: number;
}

export default function PersonalizadoPicker({
  itens, onChange,
}: {
  itens: ItemPersonalizado[];
  onChange: (next: ItemPersonalizado[]) => void;
}) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    apiFetch<Material[]>('/api/public/materiais').then(setMateriais).catch(() => {});
  }, []);

  const materialById = useMemo(
    () => Object.fromEntries(materiais.map(m => [m.id, m])),
    [materiais],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of materiais) {
      if (!map.has(m.categoria)) map.set(m.categoria, []);
      map.get(m.categoria)!.push(m);
    }
    return Array.from(map.entries());
  }, [materiais]);

  function addItem() {
    if (!selected || qty <= 0) return;
    const existing = itens.findIndex(i => i.material_id === selected);
    if (existing >= 0) {
      onChange(itens.map((it, i) => i === existing ? { ...it, qtd: it.qtd + qty } : it));
    } else {
      onChange([...itens, { material_id: selected, qtd: qty }]);
    }
    setSelected('');
    setQty(1);
  }

  function updateQty(i: number, newQty: number) {
    onChange(itens.map((it, idx) => idx === i ? { ...it, qtd: newQty } : it));
  }

  function remove(i: number) {
    onChange(itens.filter((_, idx) => idx !== i));
  }

  return (
    <div className="border border-mf-border rounded p-3 bg-mf-black-soft/40">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-mf-text-secondary flex-1 min-w-[220px]">
          SKU
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="mt-1 block w-full bg-mf-black-soft text-white p-2 rounded border border-mf-border">
            <option value="">— escolha um material —</option>
            {grouped.map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.sku}] {m.nome} — {fmtBRL(m.preco_unitario)}/{m.unidade}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-xs text-mf-text-secondary">
          Qtd
          <NumberField min={0.01} step={0.01} value={qty} onChange={setQty}
            className="ml-2 mt-1 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
        </label>
        <button type="button" onClick={addItem} disabled={!selected}
          className="bg-mf-yellow text-mf-black font-bold px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed">
          Adicionar
        </button>
      </div>

      {itens.length > 0 && (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-mf-text-secondary text-left">
              <th className="py-1">SKU</th>
              <th className="py-1">Material</th>
              <th className="py-1 text-right">Qtd</th>
              <th className="py-1 text-right">Unit.</th>
              <th className="py-1 text-right">Subtotal</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it, i) => {
              const m = materialById[it.material_id];
              if (!m) return null;
              const sub = it.qtd * Number(m.preco_unitario);
              return (
                <tr key={it.material_id} className="border-t border-mf-border text-white">
                  <td className="py-1 font-mono">{m.sku}</td>
                  <td className="py-1">{m.nome}</td>
                  <td className="py-1 text-right">
                    <NumberField min={0.01} step={0.01} value={it.qtd}
                      onChange={n => updateQty(i, n)}
                      className="w-16 text-right bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
                  </td>
                  <td className="py-1 text-right tabular-nums">{fmtBRL(m.preco_unitario)}</td>
                  <td className="py-1 text-right tabular-nums text-mf-yellow">{fmtBRL(sub)}</td>
                  <td className="py-1 text-right">
                    <button type="button" onClick={() => remove(i)}
                      className="text-mf-danger hover:underline">Remover</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
