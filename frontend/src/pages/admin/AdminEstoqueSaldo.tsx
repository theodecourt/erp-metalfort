import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { estoqueApi, type SaldoRow } from '../../lib/estoque';
import SaldoTable from '../../components/Estoque/SaldoTable';

export default function AdminEstoqueSaldo() {
  const fetchApi = useAuthedFetch();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<SaldoRow[] | null>(null);
  const [q, setQ] = useState(params.get('q') ?? '');
  const abaixoMinimo = params.get('abaixo_minimo') === 'true';

  useEffect(() => {
    setRows(null);
    estoqueApi.listSaldo(fetchApi, { abaixoMinimo, q: q || undefined }).then(setRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaixoMinimo, q]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="Buscar por SKU ou nome"
          className="border rounded px-2 py-1 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={abaixoMinimo}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.checked) next.set('abaixo_minimo', 'true');
              else next.delete('abaixo_minimo');
              setParams(next);
            }}
          />
          Só abaixo do mínimo
        </label>
      </div>
      {rows === null ? <p>Carregando…</p> : <SaldoTable rows={rows} />}
    </div>
  );
}
