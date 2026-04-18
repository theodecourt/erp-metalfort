import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Configurator from '../../components/Configurator/Configurator';
import { apiFetch } from '../../lib/api';
import type { Configuracao } from '../../lib/variables';

export default function ConfigurarOrcamento() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState<any>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [lead, setLead] = useState({ nome: '', email: '', telefone: '', finalidade: 'farmacia' as const });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { apiFetch<any>(`/api/public/produto/${slug}`).then(setProduto); }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produto || !config) return;
    setSubmitting(true); setError(null);
    try {
      const r = await apiFetch<{ numero: string; pdf_url: string }>('/api/public/quote/submit', {
        method: 'POST',
        body: JSON.stringify({
          produto_id: produto.id,
          configuracao: config,
          cliente_nome: lead.nome,
          cliente_email: lead.email,
          cliente_telefone: lead.telefone,
          finalidade: lead.finalidade || produto.finalidade,
        }),
      });
      navigate(`/obrigado?numero=${encodeURIComponent(r.numero)}&pdf=${encodeURIComponent(r.pdf_url)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!produto) return <div className="min-h-screen bg-mf-black text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-mf-black text-white">
      <header className="px-8 py-6 border-b border-mf-border">
        <Link to="/" className="text-mf-yellow font-bold">metalfort</Link>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-extrabold">{produto.nome}</h1>
        <p className="text-mf-text-secondary mt-2">{produto.descricao}</p>

        <div className="mt-8">
          <Configurator produto={produto} onConfigChange={setConfig} onQuoteChange={() => {}} />
        </div>

        <form onSubmit={handleSubmit} className="mt-12 grid gap-4 max-w-xl">
          <h2 className="text-xl font-bold">Receba seu orçamento em PDF</h2>
          <input required placeholder="Seu nome" value={lead.nome}
            onChange={e => setLead({ ...lead, nome: e.target.value })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white"/>
          <input required type="email" placeholder="Email" value={lead.email}
            onChange={e => setLead({ ...lead, email: e.target.value })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white"/>
          <input placeholder="Telefone (opcional)" value={lead.telefone}
            onChange={e => setLead({ ...lead, telefone: e.target.value })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white"/>
          <select value={lead.finalidade}
            onChange={e => setLead({ ...lead, finalidade: e.target.value as any })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white">
            <option value="casa">Casa</option>
            <option value="farmacia">Farmácia</option>
            <option value="loja">Loja</option>
            <option value="conveniencia">Conveniência</option>
            <option value="escritorio">Escritório</option>
            <option value="quiosque">Quiosque</option>
            <option value="outro">Outro</option>
          </select>
          <button type="submit" disabled={submitting}
            className="bg-mf-yellow text-mf-black font-bold py-3 rounded hover:bg-mf-yellow-hover disabled:opacity-50">
            {submitting ? 'Enviando...' : 'Enviar orçamento'}
          </button>
          {error && <div className="text-mf-danger">{error}</div>}
        </form>
      </main>
    </div>
  );
}
