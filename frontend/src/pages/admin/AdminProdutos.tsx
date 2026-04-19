import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtDec } from '../../lib/format';

export default function AdminProdutos() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { fetchApi<any[]>('/api/produto').then(setRows); }, []);

  async function toggleAtivo(id: string, ativo: boolean) {
    const r = await fetchApi<any>(`/api/produto/${id}`, {
      method: 'PATCH', body: JSON.stringify({ ativo: !ativo }),
    });
    setRows(rows.map(x => x.id === id ? r : x));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Produtos</h1>
      <p className="text-sm text-gray-600 mt-2">
        Paredes externas/internas e caixilhos são informados pelo usuário no configurador — o default de externas é o perímetro do módulo.
      </p>
      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Finalidade</th>
              <th className="p-3">Pé direito</th>
              <th className="p-3">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-bold">{p.nome}</td>
                <td className="p-3">{p.tipo_base}</td>
                <td className="p-3">{p.finalidade}</td>
                <td className="p-3">{fmtDec(p.pe_direito_sugerido_m, 2)} m</td>
                <td className="p-3">
                  <button onClick={() => toggleAtivo(p.id, p.ativo)}
                    className={`px-2 py-1 rounded text-xs ${p.ativo ? 'bg-mf-success' : 'bg-gray-400'} text-white`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Edição de BOM/opções ficará numa tela dedicada — MVP usa seed SQL.
      </p>
    </div>
  );
}
