import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

interface Produto {
  id: string;
  slug: string;
  nome: string;
  tipo_base: string;
  finalidade: string;
  pe_direito_sugerido_m: number;
  descricao?: string | null;
}

export default function ProdutoDetail() {
  const { slug = '' } = useParams();
  const [produto, setProduto] = useState<Produto | null>(null);

  useEffect(() => {
    apiFetch<Produto>(`/api/public/produto/${slug}`).then(setProduto);
  }, [slug]);

  if (!produto) return <div className="min-h-screen bg-mf-black text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-mf-black text-white">
      <main className="max-w-3xl mx-auto px-8 py-16">
        <div className="text-xs uppercase text-mf-yellow tracking-wider mb-2">
          {produto.finalidade} · módulo {produto.tipo_base}
        </div>
        <h1 className="text-4xl font-extrabold">{produto.nome}</h1>
        <p className="mt-4 text-mf-text-secondary">{produto.descricao}</p>
        <div className="mt-8 flex gap-3">
          <Link
            to={`/orcamento/${produto.slug}`}
            className="px-6 py-3 bg-mf-yellow text-mf-black font-bold rounded hover:bg-mf-yellow-hover transition"
          >
            Configurar orçamento
          </Link>
          <Link to="/" className="px-6 py-3 border border-mf-border rounded hover:border-mf-yellow">
            Voltar
          </Link>
        </div>
      </main>
    </div>
  );
}
