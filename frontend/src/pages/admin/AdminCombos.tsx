import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import type { ComboCategoria } from '../../lib/variables';

const CATEGORIAS: ComboCategoria[] = [
  'fechamento_ext', 'cobertura', 'forro', 'divisoria',
  'divisoria_wc', 'piso', 'subpiso', 'vidro',
];

const CATEGORIA_LABEL: Record<ComboCategoria, string> = {
  fechamento_ext: 'Fechamento externo',
  cobertura: 'Cobertura',
  forro: 'Forro',
  divisoria: 'Divisória',
  divisoria_wc: 'Divisória WC',
  piso: 'Piso',
  subpiso: 'Subpiso',
  vidro: 'Vidro',
};

interface Combo {
  id: string;
  slug: string;
  categoria: ComboCategoria;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function AdminCombos() {
  const fetchApi = useAuthedFetch();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<'all' | ComboCategoria>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Combo | null>(null);
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const xs = await fetchApi<Combo[]>('/api/admin/combos');
      setRows(xs);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  async function toggleAtivo(c: Combo) {
    const updated = await fetchApi<Combo>(`/api/admin/combos/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    setRows(rs => rs.map(r => r.id === c.id ? updated : r));
  }

  async function duplicate(c: Combo) {
    setDuplicatingId(c.id);
    try {
      const novo = await fetchApi<Combo>(`/api/admin/combos/${c.id}/duplicate`, { method: 'POST' });
      navigate(`/admin/combos/${novo.id}`);
    } finally {
      setDuplicatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(c => {
      if (filterCat !== 'all' && c.categoria !== filterCat) return false;
      if (s && !c.nome.toLowerCase().includes(s) && !c.slug.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, filterCat, search]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Combos</h1>
        <div className="flex gap-2 items-center">
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as 'all' | ComboCategoria)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">Todas categorias</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou slug"
            className="border rounded px-2 py-1 text-sm w-56"
          />
          <button
            onClick={() => setCreating(true)}
            className="bg-mf-yellow text-mf-black font-bold px-3 py-2 rounded text-sm"
          >+ Novo combo</button>
        </div>
      </div>

      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3">Categoria</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Descrição</th>
              <th className="p-3 w-16">Ordem</th>
              <th className="p-3 w-20">Ativo</th>
              <th className="p-3 w-72"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4 text-mf-text-secondary" colSpan={7}>Carregando…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td className="p-4 text-mf-text-secondary" colSpan={7}>Nenhum combo.</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className={`border-t ${c.ativo ? '' : 'bg-gray-50 text-mf-text-secondary'}`}>
                <td className="p-3 whitespace-nowrap">{CATEGORIA_LABEL[c.categoria]}</td>
                <td className="p-3 font-medium">{c.nome}</td>
                <td className="p-3 font-mono text-xs">{c.slug}</td>
                <td className="p-3 max-w-md truncate" title={c.descricao ?? ''}>{c.descricao ?? '—'}</td>
                <td className="p-3 tabular-nums">{c.ordem}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleAtivo(c)}
                    className={`px-2 py-1 rounded text-xs font-bold ${c.ativo ? 'bg-mf-success text-white' : 'bg-gray-300 text-gray-700'}`}
                  >{c.ativo ? 'Ativo' : 'Inativo'}</button>
                </td>
                <td className="p-3">
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-mf-yellow font-bold"
                    >Editar</button>
                    <Link
                      to={`/admin/combos/${c.id}`}
                      className="text-mf-text-secondary hover:underline"
                    >Materiais</Link>
                    <button
                      onClick={() => duplicate(c)}
                      disabled={duplicatingId === c.id}
                      className="text-mf-text-secondary hover:underline disabled:opacity-50"
                    >{duplicatingId === c.id ? 'Duplicando…' : 'Duplicar'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          combo={editing}
          onClose={() => setEditing(null)}
          onSaved={u => {
            setRows(rs => rs.map(r => r.id === u.id ? u : r));
            setEditing(null);
          }}
        />
      )}

      {creating && (
        <CreateModal
          existingSlugs={new Set(rows.map(r => r.slug))}
          onClose={() => setCreating(false)}
          onCreated={c => {
            setCreating(false);
            navigate(`/admin/combos/${c.id}`);
          }}
        />
      )}
    </div>
  );
}

function EditModal({ combo, onClose, onSaved }: {
  combo: Combo;
  onClose: () => void;
  onSaved: (updated: Combo) => void;
}) {
  const fetchApi = useAuthedFetch();
  const [nome, setNome] = useState(combo.nome);
  const [descricao, setDescricao] = useState(combo.descricao ?? '');
  const [ordem, setOrdem] = useState(String(combo.ordem));
  const [ativo, setAtivo] = useState(combo.ativo);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!nome.trim()) { setErr('Nome obrigatório'); return; }
    const ordemNum = Number(ordem);
    if (!Number.isFinite(ordemNum) || !Number.isInteger(ordemNum)) {
      setErr('Ordem deve ser número inteiro'); return;
    }
    setSaving(true);
    try {
      const updated = await fetchApi<Combo>(`/api/admin/combos/${combo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          ordem: ordemNum,
          ativo,
        }),
      });
      onSaved(updated);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded shadow-lg w-full max-w-lg p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-extrabold">Editar combo</h2>
          <p className="text-xs text-mf-text-secondary mt-1">
            Categoria: <span className="font-mono">{CATEGORIA_LABEL[combo.categoria]}</span> · Slug: <span className="font-mono">{combo.slug}</span>
          </p>
        </div>

        <label className="block">
          <span className="text-xs text-mf-text-secondary">Nome *</span>
          <input
            value={nome} onChange={e => setNome(e.target.value)}
            className="block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-xs text-mf-text-secondary">Descrição</span>
          <textarea
            value={descricao} onChange={e => setDescricao(e.target.value)}
            rows={3}
            className="block w-full border rounded px-2 py-1"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Ordem</span>
            <input
              type="number" step="1"
              value={ordem} onChange={e => setOrdem(e.target.value)}
              onWheel={e => (e.target as HTMLInputElement).blur()}
              className="block w-full border rounded px-2 py-1"
            />
          </label>
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox" checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
            />
            <span className="text-sm">Ativo</span>
          </label>
        </div>

        {err && <p className="text-mf-danger text-sm">{err}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button" onClick={onClose}
            className="text-mf-text-secondary px-3 py-2 rounded text-sm"
          >Cancelar</button>
          <button
            type="submit" disabled={saving}
            className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50"
          >Salvar</button>
        </div>
      </form>
    </div>
  );
}

function CreateModal({ existingSlugs, onClose, onCreated }: {
  existingSlugs: Set<string>;
  onClose: () => void;
  onCreated: (c: Combo) => void;
}) {
  const fetchApi = useAuthedFetch();
  const [slug, setSlug] = useState('');
  const [categoria, setCategoria] = useState<ComboCategoria>('fechamento_ext');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ordem, setOrdem] = useState('0');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const s = slug.trim().toLowerCase();
    if (!s) { setErr('Slug obrigatório'); return; }
    if (!SLUG_RE.test(s)) { setErr('Slug inválido (use a-z, 0-9 e hífens)'); return; }
    if (existingSlugs.has(s)) { setErr('Slug já existe'); return; }
    if (!nome.trim()) { setErr('Nome obrigatório'); return; }
    const ordemNum = Number(ordem);
    if (!Number.isInteger(ordemNum)) { setErr('Ordem deve ser inteiro'); return; }
    setSaving(true);
    try {
      const c = await fetchApi<Combo>('/api/admin/combos', {
        method: 'POST',
        body: JSON.stringify({
          slug: s,
          categoria,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          ordem: ordemNum,
          ativo,
        }),
      });
      onCreated(c);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded shadow-lg w-full max-w-lg p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-extrabold">Novo combo</h2>
          <p className="text-xs text-mf-text-secondary mt-1">
            Sem materiais inicialmente. Você adiciona na próxima tela.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Slug *</span>
            <input
              value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="fechamento-novo"
              className="block w-full border rounded px-2 py-1 font-mono text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Categoria *</span>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as ComboCategoria)}
              className="block w-full border rounded px-2 py-1"
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-mf-text-secondary">Nome *</span>
          <input
            value={nome} onChange={e => setNome(e.target.value)}
            className="block w-full border rounded px-2 py-1"
          />
        </label>

        <label className="block">
          <span className="text-xs text-mf-text-secondary">Descrição</span>
          <textarea
            value={descricao} onChange={e => setDescricao(e.target.value)}
            rows={3}
            className="block w-full border rounded px-2 py-1"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Ordem</span>
            <input
              type="number" step="1"
              value={ordem} onChange={e => setOrdem(e.target.value)}
              onWheel={e => (e.target as HTMLInputElement).blur()}
              className="block w-full border rounded px-2 py-1"
            />
          </label>
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox" checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
            />
            <span className="text-sm">Ativo</span>
          </label>
        </div>

        {err && <p className="text-mf-danger text-sm">{err}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button" onClick={onClose}
            className="text-mf-text-secondary px-3 py-2 rounded text-sm"
          >Cancelar</button>
          <button
            type="submit" disabled={saving}
            className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50"
          >Criar e adicionar materiais</button>
        </div>
      </form>
    </div>
  );
}
