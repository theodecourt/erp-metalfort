import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL, fmtQtd, isIntegerUnit } from '../../lib/format';

const CATEGORIAS = ['estrutura','fechamento','instalacoes','acabamento','esquadria','equipamento','servico'] as const;
const UNIDADES = ['kg','m','m2','pc','cx','und','h','bd','rl','sc','ml','ct'] as const;

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
    const xs = await fetchApi<any[]>('/api/material');
    setRows(xs.filter(m => m.ativo));
  }
  useEffect(() => { reload(); }, []);

  async function save(id: string) {
    const r = await fetchApi<any>(`/api/material/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        preco_unitario: parseFloat(draftPrice),
        estoque_minimo: parseFloat(draftMin || '0'),
      }),
    });
    setRows(rows.map(x => x.id === id ? r : x));
    setEditingId(null);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Materiais</h1>
        <button
          onClick={() => { if (showNew) resetNewForm(); setShowNew(s => !s); }}
          className="bg-mf-yellow text-mf-black font-bold px-3 py-2 rounded text-sm"
        >{showNew ? 'Cancelar' : '+ Novo material'}</button>
      </div>

      {showNew && (
        <form
          onSubmit={createMaterial}
          className="mt-4 p-4 bg-white rounded border space-y-3"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-mf-text-secondary">SKU *</span>
              <input
                value={newSku} onChange={e => setNewSku(e.target.value)}
                className="block w-full border rounded px-2 py-1"
                placeholder="MT-XXX-000"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-secondary">Nome *</span>
              <input
                value={newNome} onChange={e => setNewNome(e.target.value)}
                className="block w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-secondary">Categoria</span>
              <select
                value={newCategoria}
                onChange={e => setNewCategoria(e.target.value as typeof CATEGORIAS[number])}
                className="block w-full border rounded px-2 py-1"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-secondary">Unidade</span>
              <select
                value={newUnidade}
                onChange={e => setNewUnidade(e.target.value as typeof UNIDADES[number])}
                className="block w-full border rounded px-2 py-1"
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-secondary">Preço unitário (R$) *</span>
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
              <span className="text-xs text-mf-text-secondary">
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
              className="text-mf-text-secondary px-3 py-2 rounded text-sm"
            >Cancelar</button>
          </div>
        </form>
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
            {rows.map(m => (
              <tr
                key={m.id}
                className={`border-t ${PLANILHA_SAMUEL_SKU.test(m.sku) ? 'bg-yellow-50' : ''}`}
                title={PLANILHA_SAMUEL_SKU.test(m.sku) ? 'Importado da planilha Samuel ORÇAMENTO PADRÃO' : undefined}
              >
                <td className="p-3 font-mono">{m.sku}</td>
                <td className="p-3">{m.nome}</td>
                <td className="p-3">{m.categoria}</td>
                <td className="p-3">{m.unidade}</td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input
                        type="number" step="0.01" min="0"
                        value={draftPrice}
                        onChange={e => setDraftPrice(e.target.value)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        className="border rounded p-1 w-24"
                      />
                    : fmtBRL(m.preco_unitario)}
                </td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input
                        type="number" step="0.001" min="0"
                        value={draftMin}
                        onChange={e => setDraftMin(e.target.value)}
                        onWheel={e => (e.target as HTMLInputElement).blur()}
                        className="border rounded p-1 w-24"
                      />
                    : (Number(m.estoque_minimo) > 0 ? fmtQtd(m.estoque_minimo, m.unidade) : '—')}
                </td>
                <td className="p-3">
                  {editingId === m.id
                    ? <div className="flex gap-2">
                        <button onClick={() => save(m.id)} className="bg-mf-success text-white px-2 py-1 rounded text-xs">Salvar</button>
                        <button onClick={() => setEditingId(null)} className="text-mf-text-secondary px-2 py-1 rounded text-xs">Cancelar</button>
                        <button onClick={() => remove(m)} className="bg-mf-danger text-white px-2 py-1 rounded text-xs ml-auto">Apagar</button>
                      </div>
                    : <button onClick={() => {
                        setEditingId(m.id);
                        setDraftPrice(String(m.preco_unitario));
                        setDraftMin(String(m.estoque_minimo ?? 0));
                      }} className="text-mf-yellow font-bold">Editar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
