import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL, fmtDec, fmtQtd } from '../../lib/format';

interface ItemRow {
  material_id: string | null;
  descricao: string;
  unidade: string;
  quantidade: number | string;
  preco_unitario: number | string;
  subtotal: number | string;
  tier: 'core' | 'addon';
  categoria: string;
  ordem: number;
  combo_slug: string | null;
  material?: { sku: string; nome: string; unidade: string } | null;
}

interface Orcamento {
  id: string;
  numero: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string | null;
  finalidade: string;
  tipo: string;
  status: string;
  valor_subtotal: number | string;
  valor_gerenciamento_pct: number | string;
  valor_total: number | string;
  pdf_url: string | null;
  configuracao_json: any;
  produto: { id: string; slug: string; nome: string } | null;
  itens: ItemRow[];
  created_at: string;
}

const CATEGORIA_LABEL: Record<string, string> = {
  estrutura: 'Estrutura',
  fechamento: 'Fechamento',
  cobertura: 'Cobertura',
  forro: 'Forro',
  divisoria: 'Divisória',
  divisoria_wc: 'Divisória WC',
  piso: 'Piso',
  subpiso: 'Subpiso',
  vidro: 'Vidro',
  instalacoes: 'Instalações',
  acabamento: 'Acabamento',
  esquadria: 'Esquadrias',
  equipamento: 'Equipamentos',
  servico: 'Serviços',
  personalizado: 'Itens personalizados',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  perdido: 'Perdido',
};

export default function AdminOrcamentoDetail() {
  const { id = '' } = useParams();
  const fetchApi = useAuthedFetch();
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setOrc(null);
    setErr(null);
    fetchApi<Orcamento>(`/api/quote/${id}`)
      .then(setOrc)
      .catch(e => setErr(e.message ?? 'Erro ao carregar'));
  }, [id]);

  async function setStatus(newStatus: string) {
    const updated = await fetchApi<Orcamento>(`/api/quote/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status: newStatus }),
    });
    setOrc(o => o ? { ...o, ...updated } : o);
  }

  const grupos = useMemo(() => {
    if (!orc) return [];
    const map = new Map<string, ItemRow[]>();
    for (const it of orc.itens) {
      const key = it.categoria || 'outros';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).map(([cat, itens]) => ({
      cat,
      label: CATEGORIA_LABEL[cat] ?? cat,
      itens: itens.sort((a, b) => a.ordem - b.ordem),
      subtotal: itens.reduce((s, it) => s + Number(it.subtotal), 0),
    }));
  }, [orc]);

  if (err) return <div className="text-mf-danger">{err}</div>;
  if (!orc) return <div className="text-mf-text-secondary">Carregando…</div>;

  const config = orc.configuracao_json ?? {};

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/orcamentos" className="text-xs text-mf-text-secondary hover:underline">
            ← Voltar para orçamentos
          </Link>
          <h1 className="text-2xl font-extrabold mt-1">{orc.numero}</h1>
          <p className="text-sm text-mf-text-secondary mt-1">
            {orc.cliente_nome} · {orc.cliente_email}
            {orc.cliente_telefone ? ` · ${orc.cliente_telefone}` : ''}
          </p>
          <p className="text-xs text-mf-text-secondary mt-1">
            Produto: <strong>{orc.produto?.nome ?? '—'}</strong>
            {' · '}Finalidade: <strong>{orc.finalidade}</strong>
            {' · '}Tipo: <strong>{orc.tipo}</strong>
            {' · '}Status: <strong>{STATUS_LABEL[orc.status] ?? orc.status}</strong>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-mf-text-secondary">Total</div>
          <div className="text-3xl font-extrabold tabular-nums">{fmtBRL(orc.valor_total)}</div>
        </div>
      </header>

      <section className="bg-white rounded border p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-mf-text-secondary mb-3">
          Configuração
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Info label="Tamanho do módulo" value={`${config.tamanho_modulo ?? '—'} × ${config.qtd_modulos ?? 1}`} />
          <Info label="Pé-direito" value={config.pe_direito_m ? `${fmtDec(config.pe_direito_m)} m` : '—'} />
          <Info label="Acabamento ext." value={config.acabamento_ext ?? '—'} />
          <Info label="Cor externa" value={config.cor_ext ?? '—'} />
          <Info label="Piso" value={config.piso ?? '—'} />
          <Info label="Cor piso" value={config.piso_cor ?? '—'} />
          <Info label="Splits" value={String(config.num_splits ?? 0)} />
          <Info label="WC" value={config.tem_wc ? 'sim' : 'não'} />
        </div>

        {config.combos && Object.keys(config.combos).length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Combos selecionados</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.entries(config.combos).map(([cat, slug]) => (
                <Info
                  key={cat}
                  label={CATEGORIA_LABEL[cat] ?? cat}
                  value={String(slug)}
                  mono
                />
              ))}
            </div>
          </div>
        )}

        {Array.isArray(config.esquadrias_extras?.caixilhos) && config.esquadrias_extras.caixilhos.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Caixilhos extras</p>
            <ul className="text-sm space-y-1">
              {config.esquadrias_extras.caixilhos.map((c: any, i: number) => (
                <li key={i}>
                  {c.tipo} {fmtDec(c.largura_m)}m × {fmtDec(c.altura_m)}m × <strong>{c.qtd}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(config.esquadrias_extras?.portas ?? 0) > 0 && (
          <div className="mt-4 pt-3 border-t text-sm">
            <span className="text-xs uppercase tracking-wider text-mf-text-secondary">Portas extras: </span>
            <strong>{config.esquadrias_extras.portas}</strong>
            {Array.isArray(config.esquadrias_extras.tamanhos_portas) && config.esquadrias_extras.tamanhos_portas.length > 0 && (
              <span> ({config.esquadrias_extras.tamanhos_portas.join(', ')})</span>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-mf-text-secondary">
            Itens ({orc.itens.length})
          </h2>
          <div className="text-xs text-mf-text-secondary">
            Subtotal: <strong className="tabular-nums">{fmtBRL(orc.valor_subtotal)}</strong>
            {' · '}Gerenciamento: <strong className="tabular-nums">{fmtDec(orc.valor_gerenciamento_pct)}%</strong>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3 w-12">#</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Material</th>
              <th className="p-3 text-right w-24">Qtd</th>
              <th className="p-3 w-16">Un.</th>
              <th className="p-3 text-right w-28">Preço un.</th>
              <th className="p-3 text-right w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(g => (
              <FragmentByCategoria key={g.cat} grupo={g} />
            ))}
            <tr className="border-t bg-mf-black/5">
              <td className="p-3" colSpan={6}>
                <div className="text-right text-mf-text-secondary">Subtotal</div>
              </td>
              <td className="p-3 text-right tabular-nums font-bold">{fmtBRL(orc.valor_subtotal)}</td>
            </tr>
            <tr className="border-t bg-mf-black/5">
              <td className="p-3" colSpan={6}>
                <div className="text-right text-mf-text-secondary">
                  Gerenciamento ({fmtDec(orc.valor_gerenciamento_pct)}%)
                </div>
              </td>
              <td className="p-3 text-right tabular-nums">
                {fmtBRL(Number(orc.valor_total) - Number(orc.valor_subtotal))}
              </td>
            </tr>
            <tr className="border-t bg-mf-yellow/30">
              <td className="p-3" colSpan={6}>
                <div className="text-right font-extrabold">TOTAL</div>
              </td>
              <td className="p-3 text-right tabular-nums font-extrabold text-base">
                {fmtBRL(orc.valor_total)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="flex gap-2 flex-wrap">
        {orc.pdf_url && (
          <a href={orc.pdf_url} target="_blank" rel="noreferrer" className="bg-mf-black text-white px-4 py-2 rounded">
            Abrir PDF
          </a>
        )}
        <Link to={`/admin/estoque/fabricacao/${orc.id}`} className="bg-mf-black text-white px-4 py-2 rounded font-bold">
          Análise de fabricação
        </Link>
        {orc.status !== 'aprovado' && (
          <button onClick={() => setStatus('aprovado')} className="bg-mf-success text-white px-4 py-2 rounded">
            Aprovar
          </button>
        )}
        {orc.status !== 'perdido' && (
          <button onClick={() => setStatus('perdido')} className="bg-mf-danger text-white px-4 py-2 rounded">
            Perdido
          </button>
        )}
      </div>

      <details className="text-xs text-mf-text-secondary">
        <summary className="cursor-pointer">Configuração JSON completa</summary>
        <pre className="bg-white border p-3 mt-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(orc.configuracao_json, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-mf-text-secondary">{label}</div>
      <div className={mono ? 'font-mono text-xs mt-1' : 'mt-1'}>{value}</div>
    </div>
  );
}

function FragmentByCategoria({ grupo }: { grupo: { cat: string; label: string; itens: ItemRow[]; subtotal: number } }) {
  return (
    <>
      <tr className="bg-mf-bg-light border-t">
        <td colSpan={7} className="p-2 px-3 text-xs font-bold uppercase tracking-wider text-mf-text-secondary">
          {grupo.label}
          <span className="ml-2 text-mf-text-secondary font-normal normal-case">
            ({grupo.itens.length} item{grupo.itens.length === 1 ? '' : 's'} ·{' '}
            <span className="tabular-nums">{fmtBRL(grupo.subtotal)}</span>)
          </span>
        </td>
      </tr>
      {grupo.itens.map((it, idx) => (
        <tr
          key={`${it.material_id}-${it.ordem}`}
          className={`border-t ${idx % 2 === 1 ? 'bg-gray-100' : ''}`}
        >
          <td className="p-3 tabular-nums text-mf-text-secondary">{it.ordem}</td>
          <td className="p-3 font-mono text-xs">{it.material?.sku ?? '—'}</td>
          <td className="p-3">{it.descricao}</td>
          <td className="p-3 text-right tabular-nums">{fmtQtd(it.quantidade, it.unidade)}</td>
          <td className="p-3">{it.unidade}</td>
          <td className="p-3 text-right tabular-nums">{fmtBRL(it.preco_unitario)}</td>
          <td className="p-3 text-right tabular-nums">{fmtBRL(it.subtotal)}</td>
        </tr>
      ))}
    </>
  );
}
