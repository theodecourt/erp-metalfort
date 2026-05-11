import { useEffect, useMemo, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL, fmtQtd, isIntegerUnit } from '../../lib/format';
import MaterialHistoricoDrawer from '../../components/admin/MaterialHistoricoDrawer';

const CATEGORIAS = ['estrutura','fechamento','instalacoes','acabamento','esquadria','equipamento','servico'] as const;
const UNIDADES = ['kg','m','m2','m3','pc','cx','und','h','bd','rl','sc','ml','ct','l','km','dia'] as const;

// SKUs no formato CFxxxSFxxxUxxx vêm da planilha do Samuel — pintamos diferente
// para deixar visível que a origem é importação, não cadastro manual.
const PLANILHA_SAMUEL_SKU = /^CF\d+SF\d+U\d+$/;

interface NewMaterial {
  sku: string;
  nome: string;
  categoria: string;
  unidade: string;
  preco_unitario: number;
  estoque_minimo: number;
}

export default function AdminMateriais() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftMin, setDraftMin] = useState('');
  const [draftMotivo, setDraftMotivo] = useState('');
  const [historicoFor, setHistoricoFor] = useState<any | null>(null);

  // Filtros de listagem
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<'all' | typeof CATEGORIAS[number]>('all');
  const [filterRota, setFilterRota] = useState<'todos' | 'so-automaticos'>('todos');

  // IDs de materiais sem rota automatica (biblioteca tecnica)
  const [semRota, setSemRota] = useState<Set<string>>(new Set());

  // Create form state
  const [showNew, setShowNew] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newCategoria, setNewCategoria] = useState<typeof CATEGORIAS[number]>('estrutura');
  const [newUnidade, setNewUnidade] = useState<typeof UNIDADES[number]>('pc');
  const [newPreco, setNewPreco] = useState('');
  const [newMinimo, setNewMinimo] = useState('');
  const [newErr, setNewErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function reload() {
    const [xs, orfaos] = await Promise.all([
      fetchApi<any[]>('/api/material'),
      fetchApi<{ ids: string[]; total: number }>('/api/material/sem-rota'),
    ]);
    setRows(xs.filter(m => m.ativo));
    setSemRota(new Set(orfaos.ids));
  }
  useEffect(() => { reload(); }, []);

  async function save(id: string) {
    // draftPrice e draftMin sao strings livres aceitando virgula ou ponto.
    const novoPreco = parseFloat(draftPrice.replace(',', '.'));
    const novoMin = parseFloat((draftMin || '0').replace(',', '.'));
    if (Number.isNaN(novoPreco) || novoPreco < 0) {
      alert('Preço inválido. Use vírgula ou ponto como separador decimal (ex.: 47,30 ou 47.30).');
      return;
    }
    if (Number.isNaN(novoMin) || novoMin < 0) {
      alert('Mínimo inválido.');
      return;
    }
    const atual = rows.find(x => x.id === id);
    const precoMudou = atual && Math.abs(Number(atual.preco_unitario) - novoPreco) > 0.005;
    const body: Record<string, any> = {
      preco_unitario: novoPreco,
      estoque_minimo: novoMin,
    };
    if (precoMudou && draftMotivo.trim()) {
      body.motivo = draftMotivo.trim();
    }
    const r = await fetchApi<any>(`/api/material/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setRows(rows.map(x => x.id === id ? r : x));
    setEditingId(null);
    setDraftMotivo('');
  }

  async function remove(m: any) {
    if (!confirm(`Apagar "${m.sku} · ${m.nome}"?\n\nIsso vai tirá-lo do catálogo e do estoque. Movimentos antigos ficam preservados.`)) return;
    await fetchApi<any>(`/api/material/${m.id}`, { method: 'DELETE' });
    setEditingId(null);
    await reload();
  }

  function resetNewForm() {
    setNewSku(''); setNewNome('');
    setNewCategoria('estrutura'); setNewUnidade('pc');
    setNewPreco(''); setNewMinimo(''); setNewErr(null);
  }

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault();
    setNewErr(null);
    if (!newSku.trim()) return setNewErr('SKU obrigatório');
    if (!newNome.trim()) return setNewErr('Nome obrigatório');
    if (!newPreco) return setNewErr('Preço obrigatório');
    const precoNorm = newPreco.replace(',', '.');
    const precoNum = Number(precoNorm);
    if (Number.isNaN(precoNum) || precoNum < 0) return setNewErr('Preço inválido');
    const minimoRaw = newMinimo.replace(',', '.');
    const minimoNum = minimoRaw ? Number(minimoRaw) : 0;
    if (Number.isNaN(minimoNum) || minimoNum < 0) return setNewErr('Mínimo inválido');

    const body: NewMaterial = {
      sku: newSku.trim(),
      nome: newNome.trim(),
      categoria: newCategoria,
      unidade: newUnidade,
      preco_unitario: precoNum,
      estoque_minimo: minimoNum,
    };
    setCreating(true);
    try {
      await fetchApi<any>('/api/material', { method: 'POST', body: JSON.stringify(body) });
      resetNewForm();
      setShowNew(false);
      await reload();
    } catch (err: any) {
      setNewErr(err.message ?? 'Erro ao criar');
    } finally {
      setCreating(false);
    }
  }

  const minStep = isIntegerUnit(newUnidade) ? '1' : '0.01';

  const filtered = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(m => {
      if (filterCat !== 'all' && m.categoria !== filterCat) return false;
      if (filterRota === 'so-automaticos' && semRota.has(m.id)) return false;
      if (terms.length === 0) return true;
      const hay = `${m.sku} ${m.nome} ${m.nome_origem_planilha ?? ''} ${m.categoria}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }, [rows, search, filterCat, filterRota, semRota]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Materiais</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar SKU, nome, categoria"
            className="border rounded px-2 py-1 text-sm w-64"
          />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as 'all' | typeof CATEGORIAS[number])}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">Todas categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterRota}
            onChange={e => setFilterRota(e.target.value as 'todos' | 'so-automaticos')}
            className="border rounded px-2 py-1 text-sm"
            title="Materiais sem rota automatica continuam acessiveis no novo orcamento via picker 'Material extra'"
          >
            <option value="todos">Todos (inclui biblioteca)</option>
            <option value="so-automaticos">Só com rota automática</option>
          </select>
          <span className="text-xs text-mf-text-muted tabular-nums">
            {filtered.length} de {rows.length}
            {semRota.size > 0 && filterRota === 'todos' && (
              <> · <span className="text-mf-text-muted">{semRota.size} biblioteca</span></>
            )}
          </span>
          <button
            onClick={() => { if (showNew) resetNewForm(); setShowNew(s => !s); }}
            className="bg-mf-yellow text-mf-black font-bold px-3 py-2 rounded text-sm"
          >{showNew ? 'Cancelar' : '+ Novo material'}</button>
        </div>
      </div>

      {showNew && (
        <form
          onSubmit={createMaterial}
          className="mt-4 p-4 bg-white rounded border space-y-3"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-mf-text-muted">SKU *</span>
              <input
                value={newSku} onChange={e => setNewSku(e.target.value)}
                className="block w-full border rounded px-2 py-1"
                placeholder="MT-XXX-000"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-muted">Nome *</span>
              <input
                value={newNome} onChange={e => setNewNome(e.target.value)}
                className="block w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-muted">Categoria</span>
              <select
                value={newCategoria}
                onChange={e => setNewCategoria(e.target.value as typeof CATEGORIAS[number])}
                className="block w-full border rounded px-2 py-1"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-muted">Unidade</span>
              <select
                value={newUnidade}
                onChange={e => setNewUnidade(e.target.value as typeof UNIDADES[number])}
                className="block w-full border rounded px-2 py-1"
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-muted">Preço unitário (R$) *</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={newPreco}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '' || /^[0-9]*[.,]?[0-9]{0,2}$/.test(raw)) setNewPreco(raw);
                }}
                className="block w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-muted">
                Mínimo ({newUnidade}) — 0 desativa alerta
              </span>
              <input
                type="number"
                step={minStep} min="0"
                value={newMinimo}
                onChange={e => setNewMinimo(e.target.value)}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                className="block w-full border rounded px-2 py-1"
              />
            </label>
          </div>
          {newErr && <p className="text-mf-danger text-sm">{newErr}</p>}
          <div className="flex gap-2">
            <button
              type="submit" disabled={creating}
              className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50"
            >Criar material</button>
            <button
              type="button"
              onClick={() => { resetNewForm(); setShowNew(false); }}
              className="text-mf-text-muted px-3 py-2 rounded text-sm"
            >Cancelar</button>
          </div>
        </form>
      )}

      {historicoFor && (
        <MaterialHistoricoDrawer
          material={historicoFor}
          onClose={() => setHistoricoFor(null)}
        />
      )}

      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Un.</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Mínimo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td className="p-4 text-mf-text-muted" colSpan={7}>
                {rows.length === 0 ? 'Nenhum material.' : 'Nenhum material casa com a busca/filtro.'}
              </td></tr>
            )}
            {filtered.map(m => (
              <tr
                key={m.id}
                className={`border-t ${PLANILHA_SAMUEL_SKU.test(m.sku) ? 'bg-yellow-50' : ''}`}
                title={PLANILHA_SAMUEL_SKU.test(m.sku) ? 'Importado da planilha Samuel ORÇAMENTO PADRÃO' : undefined}
              >
                <td className="p-3 font-mono">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{m.sku}</span>
                    {semRota.has(m.id) && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-mf-text-muted border border-gray-200"
                        title="Material sem rota automática em orçamento. Continua acessível via picker 'Material extra' no novo orçamento — biblioteca técnica sob demanda."
                      >biblioteca</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div>{m.nome}</div>
                  {m.nome_origem_planilha && (
                    <div className="text-xs text-mf-text-muted mt-0.5 italic" title="Nome original da planilha do Samuel">
                      orig: {m.nome_origem_planilha}
                    </div>
                  )}
                </td>
                <td className="p-3">{m.categoria}</td>
                <td className="p-3">{m.unidade}</td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={draftPrice}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw === '' || /^[0-9]*[.,]?[0-9]{0,2}$/.test(raw)) setDraftPrice(raw);
                        }}
                        className="border rounded p-1 w-24"
                      />
                    : fmtBRL(m.preco_unitario)}
                </td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={draftMin}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw === '' || /^[0-9]*[.,]?[0-9]{0,3}$/.test(raw)) setDraftMin(raw);
                        }}
                        className="border rounded p-1 w-24"
                      />
                    : (Number(m.estoque_minimo) > 0 ? fmtQtd(m.estoque_minimo, m.unidade) : '—')}
                </td>
                <td className="p-3">
                  {editingId === m.id
                    ? <div className="space-y-1.5">
                        <input
                          type="text"
                          value={draftMotivo}
                          onChange={e => setDraftMotivo(e.target.value)}
                          placeholder="Motivo (opcional)"
                          className="border rounded p-1 w-full text-xs"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => save(m.id)} className="bg-mf-success text-white px-2 py-1 rounded text-xs">Salvar</button>
                          <button onClick={() => { setEditingId(null); setDraftMotivo(''); }} className="text-mf-text-muted px-2 py-1 rounded text-xs">Cancelar</button>
                          <button onClick={() => remove(m)} className="bg-mf-danger text-white px-2 py-1 rounded text-xs ml-auto">Apagar</button>
                        </div>
                      </div>
                    : <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingId(m.id);
                          setDraftPrice(String(m.preco_unitario));
                          setDraftMin(String(m.estoque_minimo ?? 0));
                          setDraftMotivo('');
                        }} className="text-mf-yellow font-bold">Editar</button>
                        <button
                          onClick={() => setHistoricoFor(m)}
                          className="text-mf-text-muted hover:text-mf-text-primary text-xs"
                          title="Ver histórico de preço"
                        >Histórico</button>
                      </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
