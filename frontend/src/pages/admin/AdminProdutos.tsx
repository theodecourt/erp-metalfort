import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtDec } from '../../lib/format';

interface Planta {
  comp_paredes_ext_m: string;
  comp_paredes_int_m: string;
}

const toStr = (v: any) => v === null || v === undefined ? '' : String(v);
const toNum = (s: string) => s.trim() === '' ? null : parseFloat(s.replace(',', '.'));

export default function AdminProdutos() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Planta>({ comp_paredes_ext_m: '', comp_paredes_int_m: '' });

  useEffect(() => { fetchApi<any[]>('/api/produto').then(setRows); }, []);

  async function toggleAtivo(id: string, ativo: boolean) {
    const r = await fetchApi<any>(`/api/produto/${id}`, {
      method: 'PATCH', body: JSON.stringify({ ativo: !ativo }),
    });
    setRows(rows.map(x => x.id === id ? r : x));
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setDraft({
      comp_paredes_ext_m: toStr(p.comp_paredes_ext_m),
      comp_paredes_int_m: toStr(p.comp_paredes_int_m),
    });
  }

  async function savePlanta(id: string) {
    const body: Record<string, number | null> = {
      comp_paredes_ext_m: toNum(draft.comp_paredes_ext_m),
      comp_paredes_int_m: toNum(draft.comp_paredes_int_m),
    };
    const r = await fetchApi<any>(`/api/produto/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    });
    setRows(rows.map(x => x.id === id ? r : x));
    setEditingId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Produtos</h1>
      <p className="text-sm text-gray-600 mt-2">
        Planta: defaults de metragem linear de paredes externas/internas (o usuário pode sobrescrever no configurador).
      </p>
      <div className="mt-4 bg-white rounded border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Pé direito</th>
              <th className="p-3">Paredes ext (m)</th>
              <th className="p-3">Paredes int (m)</th>
              <th className="p-3">Ativo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const editing = editingId === p.id;
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-bold">{p.nome}</td>
                  <td className="p-3">{p.tipo_base}</td>
                  <td className="p-3">{fmtDec(p.pe_direito_sugerido_m, 2)} m</td>
                  <td className="p-3 tabular-nums">
                    {editing
                      ? <input value={draft.comp_paredes_ext_m} onChange={e => setDraft({ ...draft, comp_paredes_ext_m: e.target.value })} className="border rounded p-1 w-20"/>
                      : p.comp_paredes_ext_m != null ? fmtDec(p.comp_paredes_ext_m, 2) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3 tabular-nums">
                    {editing
                      ? <input value={draft.comp_paredes_int_m} onChange={e => setDraft({ ...draft, comp_paredes_int_m: e.target.value })} className="border rounded p-1 w-20"/>
                      : p.comp_paredes_int_m != null ? fmtDec(p.comp_paredes_int_m, 2) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleAtivo(p.id, p.ativo)}
                      className={`px-2 py-1 rounded text-xs ${p.ativo ? 'bg-mf-success' : 'bg-gray-400'} text-white`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="p-3">
                    {editing
                      ? (
                        <div className="flex gap-2">
                          <button onClick={() => savePlanta(p.id)} className="bg-mf-success text-white px-2 py-1 rounded text-xs">Salvar</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 text-xs">Cancelar</button>
                        </div>
                      )
                      : <button onClick={() => startEdit(p)} className="text-mf-yellow font-bold">Editar planta</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Edição de BOM/opções ficará numa tela dedicada — MVP usa seed SQL.
      </p>
    </div>
  );
}
