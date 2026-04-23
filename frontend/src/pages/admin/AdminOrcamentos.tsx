import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL } from '../../lib/format';

export default function AdminOrcamentos() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [tipo, setTipo] = useState<'todos' | 'publico' | 'interno'>('todos');
  const [status, setStatus] = useState<'todos' | 'rascunho' | 'enviado' | 'aprovado' | 'perdido'>('todos');

  useEffect(() => { fetchApi<any[]>('/api/quote').then(setRows); }, []);

  const filtered = useMemo(() => rows.filter(r =>
    (tipo === 'todos' || r.tipo === tipo) && (status === 'todos' || r.status === status)
  ), [rows, tipo, status]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orçamentos</h1>
      <div className="mt-4 flex gap-3 items-center">
        <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="border rounded p-2">
          <option value="todos">Todos os tipos</option>
          <option value="publico">Público</option>
          <option value="interno">Interno</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="border rounded p-2">
          <option value="todos">Todos status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviado">Enviado</option>
          <option value="aprovado">Aprovado</option>
          <option value="perdido">Perdido</option>
        </select>
        <Link to="/admin/orcamento/new" className="ml-auto bg-mf-black text-white px-4 py-2 rounded">+ Novo orçamento</Link>
      </div>
      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr><th className="p-3">Número</th><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Finalidade</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono">{o.numero}</td>
                <td className="p-3 tabular-nums text-gray-600">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">{o.cliente_nome}</td>
                <td className="p-3">{o.finalidade}</td>
                <td className="p-3 tabular-nums">{fmtBRL(o.valor_total)}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3"><Link to={`/admin/orcamento/${o.id}`} className="text-mf-yellow font-bold">Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
