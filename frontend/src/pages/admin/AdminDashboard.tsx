import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL } from '../../lib/format';
import { estoqueApi, type Movimento, type SaldoRow } from '../../lib/estoque';

const TIPO_LABEL: Record<string, string> = {
  compra: 'Compra',
  ajuste_positivo: 'Ajuste +',
  saida_obra: 'Saída',
  ajuste_negativo: 'Ajuste −',
};

export default function AdminDashboard() {
  const fetchApi = useAuthedFetch();
  const [recentes, setRecentes] = useState<any[]>([]);
  const [lowCount, setLowCount] = useState<number | null>(null);
  const [lastMovs, setLastMovs] = useState<Movimento[]>([]);

  useEffect(() => {
    fetchApi<any[]>('/api/quote').then(xs => setRecentes(xs.slice(0, 10)));
    estoqueApi.listSaldo(fetchApi, { abaixoMinimo: true }).then((r: SaldoRow[]) => setLowCount(r.length));
    estoqueApi.listMovimentos(fetchApi, { limit: 5 }).then(setLastMovs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>

      <section className="mt-6 grid md:grid-cols-2 gap-4">
        <Link to="/admin/estoque/saldo?abaixo_minimo=true"
              className="block bg-white rounded shadow-sm p-4 hover:ring-2 hover:ring-mf-yellow">
          <div className="text-xs text-mf-text-secondary">Estoque</div>
          <div className="text-3xl font-extrabold">{lowCount ?? '—'}</div>
          <div className="text-sm text-mf-text-secondary">
            {lowCount === 1 ? 'material abaixo do mínimo' : 'materiais abaixo do mínimo'}
          </div>
        </Link>
        <Link to="/admin/estoque/movimentos"
              className="block bg-white rounded shadow-sm p-4 hover:ring-2 hover:ring-mf-yellow">
          <div className="text-xs text-mf-text-secondary">Últimos movimentos</div>
          <ul className="mt-2 text-sm space-y-1">
            {lastMovs.length
              ? lastMovs.map((m) => (
                  <li key={m.id} className="truncate">
                    <span className="text-mf-text-secondary">{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>{' '}
                    <strong>{TIPO_LABEL[m.tipo] ?? m.tipo}</strong>{' '}
                    · {m.quantidade}
                  </li>
                ))
              : <li className="text-mf-text-secondary">nenhum</li>}
          </ul>
        </Link>
      </section>

      <p className="mt-8 text-sm text-gray-600">Últimos 10 orçamentos recebidos.</p>
      <div className="mt-3 bg-white rounded-lg border overflow-hidden">
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
                <td className="p-3 tabular-nums">{fmtBRL(o.valor_total)}</td>
                <td className="p-3"><Link to={`/admin/orcamento/${o.id}`} className="text-mf-yellow font-bold">Abrir →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
