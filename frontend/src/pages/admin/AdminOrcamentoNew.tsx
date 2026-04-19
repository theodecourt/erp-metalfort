import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import Configurator from '../../components/Configurator/Configurator';
import type { Configuracao } from '../../lib/variables';

type Finalidade = 'casa' | 'farmacia' | 'loja' | 'conveniencia' | 'escritorio' | 'quiosque' | 'outro';

export default function AdminOrcamentoNew() {
  const nav = useNavigate();
  const fetchApi = useAuthedFetch();

  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtoSlug, setProdutoSlug] = useState<string>('');
  const [produto, setProduto] = useState<any>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [lead, setLead] = useState({ nome: '', email: '', telefone: '', finalidade: 'outro' as Finalidade });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<any[]>('/api/produto').then(setProdutos).catch(() => setProdutos([]));
  }, []);

  useEffect(() => {
    if (!produtoSlug) { setProduto(null); return; }
    apiFetch<any>(`/api/public/produto/${produtoSlug}`).then(setProduto).catch(() => setProduto(null));
  }, [produtoSlug]);

  const calculateInternal = (body: unknown) =>
    fetchApi<any>('/api/quote/calculate?tier=full', { method: 'POST', body: JSON.stringify(body) });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produto || !config) return;
    setSubmitting(true); setError(null);
    try {
      const created = await fetchApi<any>('/api/quote', {
        method: 'POST',
        body: JSON.stringify({
          produto_id: produto.id,
          configuracao: config,
          cliente_nome: lead.nome,
          cliente_email: lead.email,
          cliente_telefone: lead.telefone,
          finalidade: lead.finalidade,
        }),
      });
      nav(`/admin/orcamento/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Novo orçamento interno</h1>
      <p className="text-sm text-gray-600 mt-1">
        Usa o mesmo configurador do site, mas com addons (tier full) disponíveis.
      </p>

      <div className="mt-6 bg-white border rounded-lg p-6">
        <label className="block text-sm font-semibold">
          Produto
          <select
            value={produtoSlug}
            onChange={e => setProdutoSlug(e.target.value)}
            className="mt-1 w-full border rounded p-2 bg-white">
            <option value="">— escolha um produto —</option>
            {produtos.filter(p => p.ativo).map(p => (
              <option key={p.id} value={p.slug}>{p.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {produto && (
        <div className="mt-6 bg-mf-black text-white rounded-lg p-6">
          <Configurator
            produto={produto}
            onConfigChange={setConfig}
            onQuoteChange={() => {}}
            calculate={calculateInternal}
          />
        </div>
      )}

      {produto && (
        <form onSubmit={handleSubmit} className="mt-6 bg-white border rounded-lg p-6 grid gap-3 max-w-xl">
          <h2 className="text-lg font-bold">Dados do cliente</h2>
          <input required placeholder="Nome" value={lead.nome}
            onChange={e => setLead({ ...lead, nome: e.target.value })}
            className="border rounded p-2"/>
          <input required type="email" placeholder="Email" value={lead.email}
            onChange={e => setLead({ ...lead, email: e.target.value })}
            className="border rounded p-2"/>
          <input placeholder="Telefone (opcional)" value={lead.telefone}
            onChange={e => setLead({ ...lead, telefone: e.target.value })}
            className="border rounded p-2"/>
          <select value={lead.finalidade}
            onChange={e => setLead({ ...lead, finalidade: e.target.value as Finalidade })}
            className="border rounded p-2">
            <option value="casa">Casa</option>
            <option value="farmacia">Farmácia</option>
            <option value="loja">Loja</option>
            <option value="conveniencia">Conveniência</option>
            <option value="escritorio">Escritório</option>
            <option value="quiosque">Quiosque</option>
            <option value="outro">Outro</option>
          </select>
          <button type="submit" disabled={submitting || !config}
            className="bg-mf-black text-white font-bold py-3 rounded disabled:opacity-50">
            {submitting ? 'Criando...' : 'Criar orçamento (rascunho)'}
          </button>
          {error && <div className="text-mf-danger text-sm">{error}</div>}
        </form>
      )}
    </div>
  );
}
