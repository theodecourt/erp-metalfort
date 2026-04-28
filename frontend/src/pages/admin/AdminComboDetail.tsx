import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL } from '../../lib/format';
import type { ComboCategoria } from '../../lib/variables';
import type { Expr } from '../../lib/formula';
import { renderFormulaShort } from '../../lib/comboFormula';
import MaterialFormulaEditor from '../../components/admin/MaterialFormulaEditor';

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

interface Material {
  id: string;
  sku: string;
  nome: string;
  unidade: string;
  preco_unitario: number;
  ativo: boolean;
}

interface ComboMaterial {
  pacote_combo_id: string;
  material_id: string;
  formula_json: Expr;
  ordem: number;
  material: Material;
}

export default function AdminComboDetail() {
  const { id } = useParams<{ id: string }>();
  const fetchApi = useAuthedFetch();
  const navigate = useNavigate();
  const [combo, setCombo] = useState<Combo | null>(null);
  const [mats, setMats] = useState<ComboMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [editMeta, setEditMeta] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function reload() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const [combos, materiais] = await Promise.all([
        fetchApi<Combo[]>('/api/admin/combos'),
        fetchApi<ComboMaterial[]>(`/api/admin/combos/${id}/materiais`),
      ]);
      const c = combos.find(x => x.id === id) ?? null;
      if (!c) {
        setErr('Combo não encontrado.');
        setCombo(null);
      } else {
        setCombo(c);
      }
      setMats(materiais);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [id]);

  async function moveMaterial(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= mats.length) return;
    const a = mats[idx];
    const b = mats[target];
    const newMats = [...mats];
    newMats[idx] = { ...b, ordem: a.ordem };
    newMats[target] = { ...a, ordem: b.ordem };
    setMats(newMats);
    try {
      await Promise.all([
        fetchApi(`/api/admin/combos/${id}/materiais/${a.material_id}`, {
          method: 'PATCH', body: JSON.stringify({ ordem: b.ordem }),
        }),
        fetchApi(`/api/admin/combos/${id}/materiais/${b.material_id}`, {
          method: 'PATCH', body: JSON.stringify({ ordem: a.ordem }),
        }),
      ]);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao reordenar');
      reload();
    }
  }

  async function removeMaterial(m: ComboMaterial) {
    if (!confirm(`Remover "${m.material.nome}" do combo?`)) return;
    await fetchApi(`/api/admin/combos/${id}/materiais/${m.material_id}`, { method: 'DELETE' });
    reload();
  }

  if (!id) return <div>Combo inválido.</div>;
  if (loading) return <div className="text-mf-text-secondary">Carregando…</div>;
  if (err && !combo) return <div className="text-mf-danger">{err}</div>;
  if (!combo) return null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/combos" className="text-xs text-mf-text-secondary hover:underline">
            ← Voltar para combos
          </Link>
          <h1 className="text-2xl font-extrabold mt-1">{combo.nome}</h1>
          <p className="text-sm text-mf-text-secondary mt-1">
            {CATEGORIA_LABEL[combo.categoria]} · <span className="font-mono">{combo.slug}</span>
            {' · '}{combo.ativo ? 'Ativo' : 'Inativo'} · ordem {combo.ordem}
          </p>
          {combo.descricao && (
            <p className="text-sm mt-2 max-w-2xl">{combo.descricao}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMeta(true)}
            className="bg-mf-yellow text-mf-black font-bold px-3 py-2 rounded text-sm"
          >Editar</button>
          <button
            onClick={async () => {
              const c = await fetchApi<Combo & { materiais: ComboMaterial[] }>(
                `/api/admin/combos/${id}/duplicate`, { method: 'POST' }
              );
              navigate(`/admin/combos/${c.id}`);
            }}
            className="bg-white border font-bold px-3 py-2 rounded text-sm"
          >Duplicar</button>
          <button
            onClick={() => setDeleting(true)}
            className="bg-mf-danger text-white font-bold px-3 py-2 rounded text-sm"
          >Excluir</button>
        </div>
      </div>

      {err && combo && <p className="mt-3 text-mf-danger text-sm">{err}</p>}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Materiais</h2>
        <button
          onClick={() => setAdding(true)}
          className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm"
        >+ Adicionar material</button>
      </div>

      <div className="mt-2 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr>
              <th className="p-3 w-12">#</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Material</th>
              <th className="p-3 w-16">Un.</th>
              <th className="p-3 w-24">Preço</th>
              <th className="p-3">Fórmula</th>
              <th className="p-3 w-44"></th>
            </tr>
          </thead>
          <tbody>
            {mats.length === 0 && (
              <tr><td className="p-4 text-mf-text-secondary" colSpan={7}>
                Nenhum material. Use "+ Adicionar material".
              </td></tr>
            )}
            {mats.map((m, idx) => (
              <tr key={m.material_id} className="border-t align-top">
                <td className="p-3 tabular-nums">{m.ordem}</td>
                <td className="p-3 font-mono text-xs">{m.material.sku}</td>
                <td className="p-3">{m.material.nome}</td>
                <td className="p-3">{m.material.unidade}</td>
                <td className="p-3 tabular-nums">{fmtBRL(m.material.preco_unitario)}</td>
                <td className="p-3 text-xs font-mono">{renderFormulaShort(m.formula_json)}</td>
                <td className="p-3">
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => moveMaterial(idx, -1)}
                      disabled={idx === 0}
                      className="px-2 py-1 rounded text-xs disabled:opacity-30 hover:bg-gray-100"
                      title="Mover para cima"
                    >▲</button>
                    <button
                      onClick={() => moveMaterial(idx, 1)}
                      disabled={idx === mats.length - 1}
                      className="px-2 py-1 rounded text-xs disabled:opacity-30 hover:bg-gray-100"
                      title="Mover para baixo"
                    >▼</button>
                    <button
                      onClick={() => setEditingMatId(m.material_id)}
                      className="text-mf-yellow font-bold text-xs ml-1"
                    >Editar</button>
                    <button
                      onClick={() => removeMaterial(m)}
                      className="text-mf-danger font-bold text-xs ml-1"
                    >Remover</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMeta && (
        <EditMetaModal
          combo={combo}
          onClose={() => setEditMeta(false)}
          onSaved={c => { setCombo(c); setEditMeta(false); }}
        />
      )}

      {adding && (
        <AddMaterialModal
          comboId={combo.id}
          existingMaterialIds={new Set(mats.map(m => m.material_id))}
          nextOrdem={(mats.length ? Math.max(...mats.map(m => m.ordem)) : 0) + 1}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); reload(); }}
        />
      )}

      {editingMatId && (
        <EditMaterialModal
          comboId={combo.id}
          item={mats.find(m => m.material_id === editingMatId)!}
          onClose={() => setEditingMatId(null)}
          onSaved={() => { setEditingMatId(null); reload(); }}
        />
      )}

      {deleting && (
        <DeleteModal
          combo={combo}
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/admin/combos')}
        />
      )}
    </div>
  );
}

function DeleteModal({ combo, onClose, onDeleted }: {
  combo: Combo;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const fetchApi = useAuthedFetch();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doDelete(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (confirmText !== combo.slug) {
      setErr(`Digite "${combo.slug}" para confirmar`);
      return;
    }
    setDeleting(true);
    try {
      await fetchApi(`/api/admin/combos/${combo.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Excluir combo definitivamente">
      <form onSubmit={doDelete} className="space-y-3">
        <div className="bg-mf-danger/10 border border-mf-danger/30 rounded p-3 text-sm">
          <p className="font-bold text-mf-danger">Ação irreversível.</p>
          <p className="mt-1">
            O combo <span className="font-mono font-bold">{combo.slug}</span> e
            todos os seus vínculos com materiais serão apagados do banco.
          </p>
          <p className="mt-1 text-xs text-mf-text-secondary">
            Se o combo está referenciado em algum template (Básico/Premium),
            a exclusão é bloqueada — você precisa remover a seleção no template antes.
          </p>
        </div>
        <label className="block">
          <span className="text-xs text-mf-text-secondary">
            Para confirmar, digite o slug: <span className="font-mono">{combo.slug}</span>
          </span>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="block w-full border rounded px-2 py-1 font-mono text-sm"
            autoFocus
          />
        </label>
        {err && <p className="text-mf-danger text-sm">{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="text-mf-text-secondary px-3 py-2 rounded text-sm">Cancelar</button>
          <button
            type="submit"
            disabled={deleting || confirmText !== combo.slug}
            className="bg-mf-danger text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50"
          >Excluir definitivamente</button>
        </div>
      </form>
    </Modal>
  );
}

function EditMetaModal({ combo, onClose, onSaved }: {
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
    if (!Number.isInteger(ordemNum)) { setErr('Ordem deve ser inteiro'); return; }
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
    <Modal onClose={onClose} title="Editar combo">
      <form onSubmit={save} className="space-y-3">
        <p className="text-xs text-mf-text-secondary">
          Categoria: <span className="font-mono">{CATEGORIA_LABEL[combo.categoria]}</span>
          {' · '}Slug: <span className="font-mono">{combo.slug}</span>
        </p>
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Nome *</span>
          <input value={nome} onChange={e => setNome(e.target.value)}
            className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Descrição</span>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
            className="block w-full border rounded px-2 py-1" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Ordem</span>
            <input type="number" step="1" value={ordem}
              onChange={e => setOrdem(e.target.value)}
              onWheel={e => (e.target as HTMLInputElement).blur()}
              className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="flex items-end gap-2 pb-1">
            <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} />
            <span className="text-sm">Ativo</span>
          </label>
        </div>
        {err && <p className="text-mf-danger text-sm">{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="text-mf-text-secondary px-3 py-2 rounded text-sm">Cancelar</button>
          <button type="submit" disabled={saving}
            className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50">
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddMaterialModal({ comboId, existingMaterialIds, nextOrdem, onClose, onAdded }: {
  comboId: string;
  existingMaterialIds: Set<string>;
  nextOrdem: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const fetchApi = useAuthedFetch();
  const [allMats, setAllMats] = useState<Material[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formula, setFormula] = useState<Expr | null>(null);
  const [ordem, setOrdem] = useState(String(nextOrdem));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<Material[]>('/api/material').then(xs => setAllMats(xs.filter(m => m.ativo)));
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allMats.filter(m => {
      if (existingMaterialIds.has(m.id)) return false;
      if (!s) return true;
      return m.nome.toLowerCase().includes(s) || m.sku.toLowerCase().includes(s);
    }).slice(0, 30);
  }, [allMats, search, existingMaterialIds]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!selectedId) { setErr('Selecione um material'); return; }
    if (!formula) { setErr('Fórmula inválida'); return; }
    const ordemNum = Number(ordem);
    if (!Number.isInteger(ordemNum)) { setErr('Ordem deve ser inteiro'); return; }
    setSaving(true);
    try {
      await fetchApi(`/api/admin/combos/${comboId}/materiais`, {
        method: 'POST',
        body: JSON.stringify({ material_id: selectedId, formula_json: formula, ordem: ordemNum }),
      });
      onAdded();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao adicionar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Adicionar material" size="lg">
      <form onSubmit={save} className="space-y-3">
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Buscar material por nome ou SKU</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ex: glasroc, MT-FCH-001"
            className="block w-full border rounded px-2 py-1" />
        </label>
        <div className="border rounded max-h-48 overflow-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-mf-text-secondary p-2">
              {existingMaterialIds.size > 0 && allMats.length > 0
                ? 'Nenhum material disponível (já no combo ou sem match).'
                : 'Carregando…'}
            </p>
          )}
          {filtered.map(m => (
            <label
              key={m.id}
              className={`flex items-center gap-2 p-2 text-sm cursor-pointer border-b last:border-b-0 ${selectedId === m.id ? 'bg-mf-yellow/20' : 'hover:bg-gray-50'}`}
            >
              <input type="radio" checked={selectedId === m.id}
                onChange={() => setSelectedId(m.id)} />
              <span className="font-mono text-xs w-24">{m.sku}</span>
              <span className="flex-1">{m.nome}</span>
              <span className="text-xs text-mf-text-secondary">{m.unidade}</span>
            </label>
          ))}
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-mf-text-secondary mb-2">Fórmula (quantidade)</p>
          <MaterialFormulaEditor onChange={setFormula} />
        </div>

        <label className="block">
          <span className="text-xs text-mf-text-secondary">Ordem</span>
          <input type="number" step="1" value={ordem}
            onChange={e => setOrdem(e.target.value)}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            className="block w-full border rounded px-2 py-1" />
        </label>

        {err && <p className="text-mf-danger text-sm">{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="text-mf-text-secondary px-3 py-2 rounded text-sm">Cancelar</button>
          <button type="submit" disabled={saving || !selectedId || !formula}
            className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50">
            Adicionar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditMaterialModal({ comboId, item, onClose, onSaved }: {
  comboId: string;
  item: ComboMaterial;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fetchApi = useAuthedFetch();
  const [formula, setFormula] = useState<Expr | null>(item.formula_json);
  const [ordem, setOrdem] = useState(String(item.ordem));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!formula) { setErr('Fórmula inválida'); return; }
    const ordemNum = Number(ordem);
    if (!Number.isInteger(ordemNum)) { setErr('Ordem deve ser inteiro'); return; }
    setSaving(true);
    try {
      await fetchApi(`/api/admin/combos/${comboId}/materiais/${item.material_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ formula_json: formula, ordem: ordemNum }),
      });
      onSaved();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Editar fórmula — ${item.material.nome}`} size="lg">
      <form onSubmit={save} className="space-y-3">
        <p className="text-xs text-mf-text-secondary">
          <span className="font-mono">{item.material.sku}</span>
          {' · '}{item.material.unidade}
          {' · '}{fmtBRL(item.material.preco_unitario)}
        </p>
        <MaterialFormulaEditor initial={item.formula_json} onChange={setFormula} />
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Ordem</span>
          <input type="number" step="1" value={ordem}
            onChange={e => setOrdem(e.target.value)}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            className="block w-full border rounded px-2 py-1" />
        </label>
        {err && <p className="text-mf-danger text-sm">{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="text-mf-text-secondary px-3 py-2 rounded text-sm">Cancelar</button>
          <button type="submit" disabled={saving || !formula}
            className="bg-mf-success text-white font-bold px-3 py-2 rounded text-sm disabled:opacity-50">
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, title, size = 'md' }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  size?: 'md' | 'lg';
}) {
  const widthClass = size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`bg-white rounded shadow-lg w-full ${widthClass} max-h-[90vh] overflow-auto p-5`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="text-mf-text-secondary text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
