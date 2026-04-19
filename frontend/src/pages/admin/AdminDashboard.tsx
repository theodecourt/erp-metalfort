import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminDashboard() {
  const fetchApi = useAuthedFetch();
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => { fetchApi<any[]>('/api/quote').then(xs => setRecentes(xs.slice(0, 10))); }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">Últimos 10 orçamentos recebidos.</p>
      <div className="mt-6 bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr><th className="p-3">Número</th><th className="p-3">Cliente</th><th className="p-3">Tipo</th><th className="p-3">Total</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {recentes.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono">{o.numero}</td>
                <td className="p-3">{o.cliente_nome}</td>
                <td className="p-3">{o.tipo}</td>
                <td className="p-3 tabular-nums">R$ {Number(o.valor_total).toFixed(2)}</td>
                <td className="p-3"><Link to={`/admin/orcamento/${o.id}`} className="text-mf-yellow font-bold">Abrir →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
