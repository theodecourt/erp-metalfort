import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { estoqueApi, type FabricacaoAnalise as Analise } from '../../lib/estoque';
import FabricacaoAnalise from '../../components/Estoque/FabricacaoAnalise';

export default function AdminEstoqueFabricacao() {
  const fetchApi = useAuthedFetch();
  const { orcamento_id } = useParams<{ orcamento_id: string }>();
  const [analise, setAnalise] = useState<Analise | null>(null);

  useEffect(() => {
    if (!orcamento_id) return;
    estoqueApi.analiseFabricacao(fetchApi, orcamento_id).then(setAnalise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamento_id]);

  if (!analise) return <p>Carregando…</p>;
  return <FabricacaoAnalise analise={analise} />;
}
