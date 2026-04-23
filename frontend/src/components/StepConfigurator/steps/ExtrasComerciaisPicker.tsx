import { useState } from 'react';
import NumberField from '../../NumberField/NumberField';
import { fmtBRL } from '../../../lib/format';
import type { ExtraComercial } from '../../../lib/variables';

interface Props {
  itens: ExtraComercial[];
  onChange: (next: ExtraComercial[]) => void;
}

export default function ExtrasComerciaisPicker({ itens, onChange }: Props) {
  const [descricao, setDescricao] = useState('');
  const [qtd, setQtd] = useState<number>(1);
  const [preco, setPreco] = useState<number>(0);

  function add() {
    const d = descricao.trim();
    if (!d || qtd <= 0 || preco < 0) return;
    onChange([...itens, { descricao: d, qtd, preco_unitario: preco }]);
    setDescricao('');
    setQtd(1);
    setPreco(0);
  }

  function update(i: number, patch: Partial<ExtraComercial>) {
    onChange(itens.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function remove(i: number) {
    onChange(itens.filter((_, idx) => idx !== i));
  }

  return (
    <div className="border border-mf-border rounded p-3 bg-mf-black-soft/40">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-mf-text-secondary flex-1 min-w-[220px]">
          Descrição
          <input
            type="text"
            placeholder="Ex: Transporte, Instalação especial, Taxa de projeto..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            className="mt-1 block w-full bg-mf-black-soft text-white placeholder:text-mf-text-secondary p-2 rounded border border-mf-border focus:outline-none focus:border-mf-yellow"
          />
        </label>
        <label className="text-xs text-mf-text-secondary">
          Qtd
          <NumberField
            min={0.01} step={0.01} value={qtd} onChange={setQtd}
            className="ml-2 mt-1 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
          />
        </label>
        <label className="text-xs text-mf-text-secondary">
          R$ unit.
          <NumberField
            min={0} step={0.01} value={preco} onChange={setPreco}
            className="ml-2 mt-1 w-28 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
          />
        </label>
        <button
          type="button" onClick={add} disabled={!descricao.trim() || qtd <= 0}
          className="bg-mf-yellow text-mf-black font-bold px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Adicionar
        </button>
      </div>

      {itens.length > 0 && (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-mf-text-secondary text-left">
              <th className="py-1">Descrição</th>
              <th className="py-1 text-right">Qtd</th>
              <th className="py-1 text-right">Unit.</th>
              <th className="py-1 text-right">Subtotal</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it, i) => {
              const sub = it.qtd * it.preco_unitario;
              return (
                <tr key={i} className="border-t border-mf-border text-white">
                  <td className="py-1">
                    <input
                      type="text" value={it.descricao}
                      onChange={e => update(i, { descricao: e.target.value })}
                      className="w-full bg-mf-black-soft text-white p-1 rounded border border-mf-border"
                    />
                  </td>
                  <td className="py-1 text-right">
                    <NumberField
                      min={0.01} step={0.01} value={it.qtd}
                      onChange={n => update(i, { qtd: n })}
                      className="w-16 text-right bg-mf-black-soft text-white p-1 rounded border border-mf-border"
                    />
                  </td>
                  <td className="py-1 text-right">
                    <NumberField
                      min={0} step={0.01} value={it.preco_unitario}
                      onChange={n => update(i, { preco_unitario: n })}
                      className="w-24 text-right bg-mf-black-soft text-white p-1 rounded border border-mf-border"
                    />
                  </td>
                  <td className="py-1 text-right tabular-nums text-mf-yellow">{fmtBRL(sub)}</td>
                  <td className="py-1 text-right">
                    <button
                      type="button" onClick={() => remove(i)}
                      className="text-mf-danger hover:underline"
                    >
                      Remover
                    </button>
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
