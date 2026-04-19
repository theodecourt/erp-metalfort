import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminMateriais() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');

  useEffect(() => { fetchApi<any[]>('/api/material').then(setRows); }, []);

  async function save(id: string) {
    const r = await fetchApi<any>(`/api/material/${id}`, {
      method: 'PATCH', body: JSON.stringify({ preco_unitario: parseFloat(draftPrice) }),
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
            <tr><th className="p-3">SKU</th><th className="p-3">Nome</th><th className="p-3">Categoria</th><th className="p-3">Un.</th><th className="p-3">Preço</th><th className="p-3"></th></tr>
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
                    ? <input value={draftPrice} onChange={e => setDraftPrice(e.target.value)} className="border rounded p-1 w-24"/>
                    : `R$ ${Number(m.preco_unitario).toFixed(2)}`}
                </td>
                <td className="p-3">
                  {editingId === m.id
                    ? <button onClick={() => save(m.id)} className="bg-mf-success text-white px-2 py-1 rounded text-xs">Salvar</button>
                    : <button onClick={() => { setEditingId(m.id); setDraftPrice(String(m.preco_unitario)); }} className="text-mf-yellow font-bold">Editar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
