import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import StepConfigurator from '../../components/StepConfigurator/StepConfigurator';
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
  const [enviarEmail, setEnviarEmail] = useState(true);
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
      const created = await fetchApi<any>(`/api/quote?enviar_email=${enviarEmail}`, {
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

  const fieldClass =
    'w-full bg-mf-black-soft text-white placeholder:text-mf-text-secondary border border-mf-border rounded p-2 focus:outline-none focus:border-mf-yellow';

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-white">Novo orçamento interno</h1>
      <p className="text-sm text-mf-text-secondary mt-1">
        Usa o mesmo configurador do site, mas com addons (tier full) disponíveis.
      </p>

      <div className="mt-6 bg-mf-black text-white rounded-lg p-6 border border-mf-border">
        <label className="block">
          <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Produto</div>
          <select
            value={produtoSlug}
            onChange={e => setProdutoSlug(e.target.value)}
            className={fieldClass}>
            <option value="">— escolha um produto —</option>
            {produtos.filter(p => p.ativo).map(p => (
              <option key={p.id} value={p.slug}>{p.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {produto && (
        <div className="mt-6 bg-mf-black text-white rounded-lg p-6 border border-mf-border">
          <StepConfigurator
            produto={produto}
            onConfigChange={setConfig}
            onQuoteChange={() => {}}
            calculate={calculateInternal}
          />
        </div>
      )}

      {produto && (
        <form onSubmit={handleSubmit} className="mt-6 bg-mf-black text-white rounded-lg p-6 border border-mf-border grid gap-3 max-w-xl">
          <h2 className="text-lg font-extrabold text-mf-yellow">Dados do cliente</h2>
          <input required placeholder="Nome" value={lead.nome}
            onChange={e => setLead({ ...lead, nome: e.target.value })}
            className={fieldClass}/>
          <input required type="email" placeholder="Email" value={lead.email}
            onChange={e => setLead({ ...lead, email: e.target.value })}
            className={fieldClass}/>
          <input placeholder="Telefone (opcional)" value={lead.telefone}
            onChange={e => setLead({ ...lead, telefone: e.target.value })}
            className={fieldClass}/>
          <select value={lead.finalidade}
            onChange={e => setLead({ ...lead, finalidade: e.target.value as Finalidade })}
            className={fieldClass}>
            <option value="casa">Casa</option>
            <option value="farmacia">Farmácia</option>
            <option value="loja">Loja</option>
            <option value="conveniencia">Conveniência</option>
            <option value="escritorio">Escritório</option>
            <option value="quiosque">Quiosque</option>
            <option value="outro">Outro</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-mf-text-secondary">
            <input type="checkbox" checked={enviarEmail}
              onChange={e => setEnviarEmail(e.target.checked)}/>
            <span>Enviar PDF por email ao cliente (e notificar Metalfort)</span>
          </label>
          <button type="submit" disabled={submitting || !config}
            className="bg-mf-yellow text-mf-black font-extrabold py-3 rounded hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Criando...' : (enviarEmail ? 'Criar e enviar' : 'Criar rascunho (sem enviar)')}
          </button>
          {error && <div className="text-mf-danger text-sm">{error}</div>}
        </form>
      )}
    </div>
  );
}
