import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminOrcamentoDetail() {
  const { id = '' } = useParams();
  const fetchApi = useAuthedFetch();
  const [orc, setOrc] = useState<any>(null);

  useEffect(() => {
    fetchApi<any[]>('/api/quote').then(xs => setOrc(xs.find(o => o.id === id)));
  }, [id]);

  async function setStatus(newStatus: string) {
    const updated = await fetchApi<any>(`/api/quote/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status: newStatus }),
    });
    setOrc(updated);
  }

  if (!orc) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{orc.numero}</h1>
      <div className="mt-2 text-sm text-gray-600">{orc.cliente_nome} · {orc.cliente_email}</div>
      <div className="mt-2 text-sm">Finalidade: <strong>{orc.finalidade}</strong> · Tipo: <strong>{orc.tipo}</strong> · Status: <strong>{orc.status}</strong></div>
      <div className="mt-4 text-3xl font-extrabold tabular-nums">R$ {Number(orc.valor_total).toFixed(2)}</div>

      <div className="mt-6 flex gap-2">
        {orc.pdf_url && <a href={orc.pdf_url} target="_blank" rel="noreferrer" className="bg-mf-black text-white px-4 py-2 rounded">Abrir PDF</a>}
        <button onClick={() => setStatus('aprovado')} className="bg-mf-success text-white px-4 py-2 rounded">Aprovar</button>
        <button onClick={() => setStatus('perdido')} className="bg-mf-danger text-white px-4 py-2 rounded">Perdido</button>
      </div>

      <details className="mt-8">
        <summary className="cursor-pointer">Configuração usada</summary>
        <pre className="bg-white border p-3 mt-2 text-xs overflow-x-auto">{JSON.stringify(orc.configuracao_json, null, 2)}</pre>
      </details>
    </div>
  );
}
