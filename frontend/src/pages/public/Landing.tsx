import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import ProductCard from '../../components/ProductCard/ProductCard';
import type { ProductCardProps } from '../../components/ProductCard/ProductCard';

export default function Landing() {
  const [produtos, setProdutos] = useState<ProductCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ProductCardProps[]>('/api/public/produtos')
      .then(setProdutos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-mf-black text-white">
      <header className="px-8 py-6 border-b border-mf-border flex justify-between items-center">
        <div className="text-2xl font-extrabold">
          <span className="text-mf-yellow">metalfort</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-16">
        <h1 className="text-5xl font-extrabold leading-tight">
          Construção modular em <span className="text-mf-yellow">steelframe</span>.<br />
          Orçamento direto do site.
        </h1>
        <p className="mt-4 text-mf-text-secondary max-w-2xl">
          Escolha um módulo padronizado, ajuste tamanho e acabamento, e receba seu orçamento em PDF na hora.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {loading ? (
            <div className="text-mf-text-secondary">Carregando produtos...</div>
          ) : (
            produtos.map(p => <ProductCard key={p.slug} {...p} />)
          )}
        </div>
      </main>
    </div>
  );
}
