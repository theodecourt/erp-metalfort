import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import StepConfigurator from '../../components/StepConfigurator/StepConfigurator';
import type { Configuracao } from '../../lib/variables';

type Finalidade = 'casa' | 'farmacia' | 'loja' | 'conveniencia' | 'escritorio' | 'quiosque' | 'outro';
type Lead = { nome: string; email: string; telefone: string; finalidade: Finalidade };

const DRAFT_KEY = 'mf:admin:orcamento-new-draft:v1';
interface Draft {
  produtoSlug: string;
  config: Configuracao | null;
  lead: Lead;
  enviarEmail: boolean;
}
const loadDraft = (): Draft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch { return null; }
};
const saveDraft = (d: Draft) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
};
const clearDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};

const EMPTY_LEAD: Lead = { nome: '', email: '', telefone: '', finalidade: 'outro' };

export default function AdminOrcamentoNew() {
  const nav = useNavigate();
  const fetchApi = useAuthedFetch();

  const initial = loadDraft();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtoSlug, setProdutoSlug] = useState<string>(initial?.produtoSlug ?? '');
  const [produto, setProduto] = useState<any>(null);
  const [config, setConfig] = useState<Configuracao | null>(initial?.config ?? null);
  const [lead, setLead] = useState<Lead>(initial?.lead ?? EMPTY_LEAD);
  const [enviarEmail, setEnviarEmail] = useState(initial?.enviarEmail ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialConfig] = useState<Configuracao | null>(initial?.config ?? null);

  useEffect(() => {
    fetchApi<any[]>('/api/produto').then(setProdutos).catch(() => setProdutos([]));
  }, []);

  useEffect(() => {
    if (!produtoSlug) { setProduto(null); return; }
    apiFetch<any>(`/api/public/produto/${produtoSlug}`).then(setProduto).catch(() => setProduto(null));
  }, [produtoSlug]);

  useEffect(() => {
    if (!produtoSlug) return;
    saveDraft({ produtoSlug, config, lead, enviarEmail });
  }, [produtoSlug, config, lead, enviarEmail]);

  function handleDescartar() {
    if (!confirm('Descartar o rascunho em andamento?')) return;
    clearDraft();
    setProdutoSlug(''); setProduto(null); setConfig(null);
    setLead(EMPTY_LEAD); setEnviarEmail(true);
  }

  const calculateInternal = (body: unknown) =>
    fetchApi<any>('/api/quote/calculate?tier=full', { method: 'POST', body: JSON.stringify(body) });

  // Estado dos prompts obrigatórios (defaults null = não respondido)
  const [incluirFundacao, setIncluirFundacao] = useState<boolean | null>(null);
  const [incluirProjeto, setIncluirProjeto] = useState<boolean | null>(null);
  const [valorProjetoOverride, setValorProjetoOverride] = useState<string>('');

  // Default sugerido pra valor do projeto (R$ 142 da composição COMP00028)
  const VALOR_PROJETO_DEFAULT = 142;

  const promptCompletos = incluirFundacao !== null && incluirProjeto !== null;
  const valorOverrideNumero =
    valorProjetoOverride.trim() === '' ? null : Number(valorProjetoOverride.replace(',', '.'));
  const valorOverrideValido =
    valorOverrideNumero === null || (Number.isFinite(valorOverrideNumero) && valorOverrideNumero >= 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produto || !config) return;
    if (!promptCompletos) {
      setError('Responda "Incluir fundação?" e "Incluir projeto complementar?" antes de salvar.');
      return;
    }
    if (incluirProjeto && !valorOverrideValido) {
      setError('Valor do projeto inválido (deve ser número >= 0 ou vazio para usar default).');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const configWithOverrides: Configuracao = {
        ...config,
        incluir_fundacao: incluirFundacao,
        incluir_projeto: incluirProjeto,
        valor_projeto_override: incluirProjeto ? valorOverrideNumero : null,
      };
      const created = await fetchApi<any>(`/api/quote?enviar_email=${enviarEmail}`, {
        method: 'POST',
        body: JSON.stringify({
          produto_id: produto.id,
          configuracao: configWithOverrides,
          cliente_nome: lead.nome,
          cliente_email: lead.email,
          cliente_telefone: lead.telefone,
          finalidade: lead.finalidade,
        }),
      });
      clearDraft();
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
    <div className="pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Novo orçamento interno</h1>
          <p className="text-sm text-gray-600 mt-1">
            Usa o mesmo configurador do site, mas com addons (tier full) disponíveis.
          </p>
        </div>
        {produtoSlug && (
          <button type="button" onClick={handleDescartar}
            className="text-sm text-mf-text-secondary hover:text-mf-danger underline underline-offset-2">
            Descartar rascunho
          </button>
        )}
      </div>

      <div className="mt-6 bg-mf-black text-white rounded-lg border border-mf-border overflow-hidden">
        <section className="p-6">
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
        </section>

        {produto && (
          <section className="p-6 border-t border-mf-border">
            <StepConfigurator
              produto={produto}
              initialConfig={initialConfig ?? undefined}
              onConfigChange={setConfig}
              onQuoteChange={() => {}}
              calculate={calculateInternal}
            />
          </section>
        )}

        {produto && (
          <section className="p-6 border-t border-mf-border">
            <h2 className="text-lg font-extrabold text-mf-yellow">Itens da obra (decisão obrigatória)</h2>
            <p className="text-xs text-mf-text-secondary mt-1 mb-4">
              Marque explicitamente se fundação e projeto complementar entram nesta obra.
              Sem default — força resposta consciente. Detalhes em
              {' '}
              <code className="text-xs">docs/regras-de-negocio.md</code>.
            </p>
            <div className="grid gap-4 max-w-xl">
              <div>
                <div className="text-sm font-bold mb-2">Incluir fundação?</div>
                <div className="flex gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={incluirFundacao === true}
                      onChange={() => setIncluirFundacao(true)}
                    />
                    <span>Sim</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={incluirFundacao === false}
                      onChange={() => setIncluirFundacao(false)}
                    />
                    <span>Não</span>
                  </label>
                </div>
              </div>
              <div>
                <div className="text-sm font-bold mb-2">Incluir projeto complementar?</div>
                <div className="flex gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={incluirProjeto === true}
                      onChange={() => setIncluirProjeto(true)}
                    />
                    <span>Sim</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={incluirProjeto === false}
                      onChange={() => {
                        setIncluirProjeto(false);
                        setValorProjetoOverride('');
                      }}
                    />
                    <span>Não</span>
                  </label>
                </div>
                {incluirProjeto && (
                  <div className="mt-2 max-w-xs">
                    <label className="block">
                      <span className="text-xs text-mf-text-secondary">
                        Valor (R$). Deixe vazio para usar default (R$ {VALOR_PROJETO_DEFAULT.toFixed(2)}) —
                        digite 0 se cliente já tem projeto.
                      </span>
                      <input
                        value={valorProjetoOverride}
                        onChange={e => setValorProjetoOverride(e.target.value)}
                        placeholder={`${VALOR_PROJETO_DEFAULT}`}
                        inputMode="decimal"
                        className={`${fieldClass} mt-1`}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {produto && (
          <section className="p-6 border-t border-mf-border">
            <form onSubmit={handleSubmit} className="grid gap-3 max-w-xl">
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
              <button
                type="submit"
                disabled={submitting || !config || !promptCompletos || !valorOverrideValido}
                className="bg-mf-yellow text-mf-black font-extrabold py-3 rounded hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting
                  ? 'Criando...'
                  : !promptCompletos
                  ? 'Responda fundação e projeto antes'
                  : (enviarEmail ? 'Criar e enviar' : 'Criar rascunho (sem enviar)')}
              </button>
              {error && <div className="text-mf-danger text-sm">{error}</div>}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
