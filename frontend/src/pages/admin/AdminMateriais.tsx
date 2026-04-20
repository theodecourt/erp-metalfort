import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL, fmtQtd } from '../../lib/format';

export default function AdminMateriais() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftMin, setDraftMin] = useState('');

  useEffect(() => { fetchApi<any[]>('/api/material').then(setRows); }, []);

  async function save(id: string) {
    const r = await fetchApi<any>(`/api/material/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        preco_unitario: parseFloat(draftPrice),
        estoque_minimo: parseFloat(draftMin || '0'),
      }),
    });
    setRows(rows.map(x => x.id === id ? r : x));
    setEditingId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Materiais</h1>
      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Un.</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Mínimo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-mono">{m.sku}</td>
                <td className="p-3">{m.nome}</td>
                <td className="p-3">{m.categoria}</td>
                <td className="p-3">{m.unidade}</td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input
                        type="number" step="0.01" min="0"
                        value={draftPrice}
                        onChange={e => setDraftPrice(e.target.value)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        className="border rounded p-1 w-24"
                      />
                    : fmtBRL(m.preco_unitario)}
                </td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input
                        type="number" step="0.001" min="0"
                        value={draftMin}
                        onChange={e => setDraftMin(e.target.value)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        className="border rounded p-1 w-24"
                      />
                    : (Number(m.estoque_minimo) > 0 ? fmtQtd(m.estoque_minimo, m.unidade) : '—')}
                </td>
                <td className="p-3">
                  {editingId === m.id
                    ? <button onClick={() => save(m.id)} className="bg-mf-success text-white px-2 py-1 rounded text-xs">Salvar</button>
                    : <button onClick={() => {
                        setEditingId(m.id);
                        setDraftPrice(String(m.preco_unitario));
                        setDraftMin(String(m.estoque_minimo ?? 0));
                      }} className="text-mf-yellow font-bold">Editar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
