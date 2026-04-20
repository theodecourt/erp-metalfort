import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import FabricacaoPicker, { type OrcamentoOption } from '../../components/Estoque/FabricacaoPicker';

export default function AdminEstoqueFabricacaoPicker() {
  const fetchApi = useAuthedFetch();
  const [orcs, setOrcs] = useState<OrcamentoOption[] | null>(null);

  useEffect(() => {
    fetchApi<OrcamentoOption[]>('/api/quote').then((xs) => {
      const filtered = xs.filter((o) => ['aprovado', 'enviado'].includes(o.status));
      setOrcs(filtered.length ? filtered : xs);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (orcs === null) return <p>Carregando…</p>;
  return <FabricacaoPicker orcamentos={orcs} />;
}
