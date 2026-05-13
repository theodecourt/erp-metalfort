import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  // Default: categoria 'estrutura' ja vem expandida (uso mais frequente).
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(['estrutura']));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Material[]>('/api/public/materiais').then(setMateriais).catch(() => {});
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [materiais]);

  function toggleCat(cat: string) {
    setOpenCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function pickMaterial(id: string) {
    setSelected(id);
    setOpen(false);
  }

  const selectedMaterial = selected ? materialById[selected] : null;

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
        <div className="text-xs text-mf-text-secondary flex-1 min-w-[220px]">
          SKU
          <div className="relative mt-1" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="block w-full text-left bg-mf-black-soft text-white p-2 rounded border border-mf-border hover:border-mf-yellow/50 flex items-center justify-between gap-2"
            >
              <span className={selectedMaterial ? 'text-white' : 'text-mf-text-secondary'}>
                {selectedMaterial
                  ? `[${selectedMaterial.sku}] ${selectedMaterial.nome} — ${fmtBRL(selectedMaterial.preco_unitario)}/${selectedMaterial.unidade}`
                  : '— escolha um material —'}
              </span>
              <span className="text-mf-text-secondary text-xs">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
              <div
                role="listbox"
                className="absolute z-10 mt-1 w-full max-h-80 overflow-y-auto bg-mf-black border border-mf-border rounded shadow-xl"
              >
                {grouped.length === 0 && (
                  <div className="px-3 py-2 text-mf-text-secondary text-xs">Carregando materiais…</div>
                )}
                {grouped.map(([cat, items]) => {
                  const expanded = openCats.has(cat);
                  return (
                    <div key={cat} className="border-b border-mf-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleCat(cat)}
                        aria-expanded={expanded}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-white hover:bg-mf-black-soft"
                      >
                        <span className="font-bold text-sm">{cat}</span>
                        <span className="text-xs text-mf-text-secondary tabular-nums">
                          {items.length} {expanded ? '▲' : '▼'}
                        </span>
                      </button>
                      {expanded && (
                        <ul className="bg-mf-black-soft/40">
                          {items.map(m => (
                            <li key={m.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected === m.id}
                                onClick={() => pickMaterial(m.id)}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-mf-yellow/20 ${selected === m.id ? 'bg-mf-yellow/30 text-white' : 'text-white/90'}`}
                              >
                                <span className="font-mono text-mf-text-secondary">[{m.sku}]</span>{' '}
                                {m.nome} <span className="text-mf-text-secondary">— {fmtBRL(m.preco_unitario)}/{m.unidade}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
