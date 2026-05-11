import { useEffect, useMemo, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL, fmtDec } from '../../lib/format';

interface Composicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  modo: 'automatico' | 'opcional';
  default_ativo: boolean;
  default_valor_override: number | null;
  ativo: boolean;
  n_materiais: number;
  custo_calculado: number;
}

interface MaterialEmComposicao {
  composicao_id: string;
  material_id: string;
  quantidade: number;
  ordem: number;
  material: {
    id: string;
    sku: string;
    nome: string;
    nome_origem_planilha: string | null;
    preco_unitario: number;
    unidade: string;
    categoria: string;
    ativo: boolean;
  };
}

const MODO_LABEL: Record<Composicao['modo'], string> = {
  automatico: 'Automática',
  opcional: 'Opcional',
};

export default function AdminComposicoes() {
  const fetchApi = useAuthedFetch();
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [filterModo, setFilterModo] = useState<'all' | Composicao['modo']>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState<Composicao | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchApi<Composicao[]>('/api/admin/composicoes')
      .then(setComposicoes)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return composicoes.filter(c => {
      if (filterModo !== 'all' && c.modo !== filterModo) return false;
      if (!s) return true;
      return c.codigo.toLowerCase().includes(s) || c.descricao.toLowerCase().includes(s);
    });
  }, [composicoes, filterModo, search]);

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">Composições</h1>
        <p className="text-sm text-mf-text-muted mt-1">
          Receitas técnicas de subsistemas construtivos importadas da planilha
          do Samuel. <strong>Modo automático</strong> entram sempre no orçamento;{' '}
          <strong>opcional</strong> só quando vendedor marca no novo orçamento.
        </p>
      </header>

      <div className="flex gap-3 items-center mb-3 flex-wrap">
        <select
          value={filterModo}
          onChange={e => setFilterModo(e.target.value as 'all' | Composicao['modo'])}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="all">Todos os modos</option>
          <option value="automatico">Automáticas</option>
          <option value="opcional">Opcionais</option>
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por código ou descrição"
          className="border rounded px-2 py-1 text-sm flex-1 max-w-md"
        />
        <span className="text-xs text-mf-text-muted tabular-nums">
          {filtered.length} de {composicoes.length}
        </span>
      </div>

      {loading ? (
        <p className="text-mf-text-muted">Carregando…</p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mf-black text-white text-left">
              <tr>
                <th className="p-3 w-28">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 w-16">Un.</th>
                <th className="p-3 w-28">Modo</th>
                <th className="p-3 w-20 text-right">Itens</th>
                <th className="p-3 w-32 text-right">Custo (un.)</th>
                <th className="p-3 w-32 text-right">Override default</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-mf-text-muted text-center">Nenhuma composição.</td></tr>
              ) : filtered.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`border-t hover:bg-mf-yellow/10 cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}
                  onClick={() => setOpenDetail(c)}
                >
                  <td className="p-3 font-mono text-xs">{c.codigo}</td>
                  <td className="p-3">{c.descricao}</td>
                  <td className="p-3">{c.unidade}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      c.modo === 'automatico' ? 'bg-mf-success/20 text-mf-success' : 'bg-mf-warning/20 text-mf-warning'
                    }`}>
                      {MODO_LABEL[c.modo]}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">{c.n_materiais}</td>
                  <td className="p-3 text-right tabular-nums">{fmtBRL(c.custo_calculado)}</td>
                  <td className="p-3 text-right tabular-nums text-mf-text-muted">
                    {c.default_valor_override !== null ? fmtBRL(c.default_valor_override) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openDetail && (
        <DetailDrawer
          composicao={openDetail}
          onClose={() => setOpenDetail(null)}
        />
      )}
    </div>
  );
}

function DetailDrawer({ composicao, onClose }: { composicao: Composicao; onClose: () => void }) {
  const fetchApi = useAuthedFetch();
  const [materiais, setMateriais] = useState<MaterialEmComposicao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<{ composicao: Composicao; materiais: MaterialEmComposicao[] }>(`/api/admin/composicoes/${composicao.id}/materiais`)
      .then(d => setMateriais(d.materiais || []))
      .finally(() => setLoading(false));
  }, [composicao.id]);

  const totalCusto = materiais.reduce(
    (sum, m) => sum + Number(m.quantidade) * Number(m.material.preco_unitario),
    0,
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex justify-end" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto"
      >
        <header className="sticky top-0 bg-mf-black text-white px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-mf-text-secondary">{composicao.codigo}</p>
            <h2 className="text-lg font-extrabold mt-0.5">{composicao.descricao}</h2>
            <p className="text-xs text-mf-text-secondary mt-1">
              {MODO_LABEL[composicao.modo]} · unidade {composicao.unidade} ·{' '}
              {composicao.n_materiais} materiais ·{' '}
              custo unitário <strong>{fmtBRL(composicao.custo_calculado)}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-mf-text-secondary hover:text-white">×</button>
        </header>

        <div className="p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-mf-text-muted mb-3">Materiais da receita</h3>
          {loading ? (
            <p className="text-mf-text-muted">Carregando…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-mf-text-muted text-xs">
                <tr className="border-b">
                  <th className="py-2 w-10">#</th>
                  <th className="py-2 w-28">SKU</th>
                  <th className="py-2">Material</th>
                  <th className="py-2 w-20 text-right">Qtd</th>
                  <th className="py-2 w-12">Un.</th>
                  <th className="py-2 w-24 text-right">Preço un.</th>
                  <th className="py-2 w-24 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((m, idx) => {
                  const sub = Number(m.quantidade) * Number(m.material.preco_unitario);
                  return (
                    <tr key={`${m.composicao_id}-${m.material_id}`} className={`border-b ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="py-2 text-mf-text-muted">{m.ordem}</td>
                      <td className="py-2 font-mono text-xs">{m.material.sku}</td>
                      <td className="py-2">
                        <div>{m.material.nome}</div>
                        {m.material.nome_origem_planilha && (
                          <div className="text-xs text-mf-text-muted italic" title="Nome original da planilha do Samuel">
                            orig: {m.material.nome_origem_planilha}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtDec(m.quantidade, 3)}</td>
                      <td className="py-2">{m.material.unidade}</td>
                      <td className="py-2 text-right tabular-nums">{fmtBRL(m.material.preco_unitario)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtBRL(sub)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-mf-black font-bold">
                  <td colSpan={6} className="py-2 text-right">Total da composição</td>
                  <td className="py-2 text-right tabular-nums">{fmtBRL(totalCusto)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
