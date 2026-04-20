import { Link } from 'react-router-dom';

export interface ProductCardProps {
  slug: string;
  nome: string;
  tipo_base: string;
  finalidade: string;
  descricao?: string | null;
  imagem_url?: string | null;
}

export default function ProductCard(p: ProductCardProps) {
  return (
    <Link
      to={`/orcamento/${p.slug}`}
      className="block rounded-lg border border-mf-border bg-mf-black-soft p-6 text-white hover:border-mf-yellow transition"
    >
      <h3 className="text-xl font-bold">{p.nome}</h3>
      {p.descricao && <p className="mt-2 text-sm text-mf-text-secondary">{p.descricao}</p>}
      <div className="mt-4 text-mf-yellow text-sm font-semibold">Configurar orçamento →</div>
    </Link>
  );
}
