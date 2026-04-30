import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL } from '../../lib/format';

const CATEGORIAS = ['estrutura','fechamento','instalacoes','acabamento','esquadria','equipamento','servico'] as const;
const UNIDADES = ['kg','m','m2','pc','cx','und','h','bd','rl','sc','ml','ct'] as const;

const CATEGORIA_LABEL: Record<typeof CATEGORIAS[number], string> = {
  estrutura: 'Estrutura',
  fechamento: 'Fechamento',
  instalacoes: 'Instalações',
  acabamento: 'Acabamento',
  esquadria: 'Esquadrias',
  equipamento: 'Equipamentos',
  servico: 'Serviços',
};

const UNIDADE_LABEL: Record<typeof UNIDADES[number], string> = {
  kg: 'quilograma',
  m: 'metro',
  m2: 'metro quadrado',
  pc: 'peça',
  cx: 'caixa',
  und: 'unidade',
  h: 'hora',
  bd: 'balde',
  rl: 'rolo',
  sc: 'saco',
  ml: 'mililitro',
  ct: 'cento',
};

interface Fornecedor { id: string; nome: string; cnpj: string | null }
interface Material {
  id: string; sku: string; nome: string; categoria: string;
  unidade: string; preco_unitario: number; ativo: boolean;
}

interface NovoMaterialDraft {
  sku: string; nome: string;
  categoria: typeof CATEGORIAS[number];
  unidade: typeof UNIDADES[number];
}

type PrecoCatalogoAcao = 'preco_nf' | 'manter' | 'outro';

interface ItemDraft {
  uid: number;
  // Material existente
  material_id: string | null;
  // Material novo
  novo_material: boolean;
  draft: NovoMaterialDraft;
  // Quantidade e preço
  quantidade: string;
  preco_nf: string;
  // Política de catálogo
  preco_catalogo_acao: PrecoCatalogoAcao;
  preco_catalogo_outro: string;
  // Alias
  sku_fornecedor: string;
  descricao_fornecedor: string;
}

const emptyItem = (uid: number): ItemDraft => ({
  uid,
  material_id: null,
  novo_material: false,
  draft: { sku: '', nome: '', categoria: 'estrutura', unidade: 'pc' },
  quantidade: '',
  preco_nf: '',
  preco_catalogo_acao: 'preco_nf',
  preco_catalogo_outro: '',
  sku_fornecedor: '',
  descricao_fornecedor: '',
});

export default function AdminNovaCompra() {
  const fetchApi = useAuthedFetch();
  const navigate = useNavigate();

  // Cabeçalho
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorMode, setFornecedorMode] = useState<'existente' | 'novo'>('existente');
  const [fornecedorId, setFornecedorId] = useState('');
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  const [novoFornecedorCnpj, setNovoFornecedorCnpj] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacao, setObservacao] = useState('');

  // Catálogo de materiais
  const [materiais, setMateriais] = useState<Material[]>([]);

  // Itens
  const [items, setItems] = useState<ItemDraft[]>([emptyItem(1)]);
  const nextUid = useMemo(() => Math.max(0, ...items.map(i => i.uid)) + 1, [items]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [forns, mats] = await Promise.all([
        fetchApi<Fornecedor[]>('/api/estoque/fornecedor'),
        fetchApi<Material[]>('/api/material'),
      ]);
      setFornecedores(forns);
      setMateriais(mats.filter(m => m.ativo));
    })();
  }, []);

  function addItem() {
    setItems(arr => [...arr, emptyItem(nextUid)]);
  }

  function removeItem(uid: number) {
    setItems(arr => arr.length > 1 ? arr.filter(i => i.uid !== uid) : arr);
  }

  function updateItem(uid: number, patch: Partial<ItemDraft>) {
    setItems(arr => arr.map(i => i.uid === uid ? { ...i, ...patch } : i));
  }

  const total = useMemo(() => {
    return items.reduce((s, it) => {
      const q = Number(it.quantidade.replace(',', '.'));
      const p = Number(it.preco_nf.replace(',', '.'));
      if (!Number.isFinite(q) || !Number.isFinite(p)) return s;
      return s + q * p;
    }, 0);
  }, [items]);

  function validate(): string | null {
    if (fornecedorMode === 'existente' && !fornecedorId) return 'Selecione o fornecedor';
    if (fornecedorMode === 'novo' && !novoFornecedorNome.trim()) return 'Nome do fornecedor obrigatório';
    if (items.length === 0) return 'Adicione pelo menos um item';
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const tag = `Item ${i + 1}`;
      if (!it.novo_material && !it.material_id) return `${tag}: escolha um material ou marque "novo"`;
      if (it.novo_material) {
        if (!it.draft.sku.trim()) return `${tag}: SKU do novo material obrigatório`;
        if (!it.draft.nome.trim()) return `${tag}: nome do novo material obrigatório`;
      }
      const q = Number(it.quantidade.replace(',', '.'));
      if (!Number.isFinite(q) || q <= 0) return `${tag}: quantidade inválida`;
      const p = Number(it.preco_nf.replace(',', '.'));
      if (!Number.isFinite(p) || p < 0) return `${tag}: preço NF inválido`;
      if (it.preco_catalogo_acao === 'outro') {
        const po = Number(it.preco_catalogo_outro.replace(',', '.'));
        if (!Number.isFinite(po) || po < 0) return `${tag}: preço catálogo inválido`;
      }
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }
    setSubmitting(true);
    try {
      const body: any = {
        nota_fiscal: notaFiscal.trim() || null,
        observacao: observacao.trim() || null,
        itens: items.map(it => {
          const base: any = {
            quantidade: Number(it.quantidade.replace(',', '.')),
            preco_nf: Number(it.preco_nf.replace(',', '.')),
            preco_catalogo_acao: it.preco_catalogo_acao,
            sku_fornecedor: it.sku_fornecedor.trim() || null,
            descricao_fornecedor: it.descricao_fornecedor.trim() || null,
          };
          if (it.novo_material) {
            base.material_novo = {
              sku: it.draft.sku.trim(),
              nome: it.draft.nome.trim(),
              categoria: it.draft.categoria,
              unidade: it.draft.unidade,
            };
          } else {
            base.material_id = it.material_id;
          }
          if (it.preco_catalogo_acao === 'outro') {
            base.preco_catalogo_outro = Number(it.preco_catalogo_outro.replace(',', '.'));
          }
          return base;
        }),
      };
      if (fornecedorMode === 'existente') {
        body.fornecedor_id = fornecedorId;
      } else {
        body.fornecedor_novo = {
          nome: novoFornecedorNome.trim(),
          cnpj: novoFornecedorCnpj.trim() || null,
        };
      }
      await fetchApi('/api/admin/compra', {
        method: 'POST', body: JSON.stringify(body),
      });
      navigate('/admin/estoque/movimentos');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar compra');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link to="/admin/estoque/movimentos" className="text-xs text-mf-text-secondary hover:underline">
        ← Voltar para movimentos
      </Link>
      <h1 className="text-2xl font-extrabold mt-1">Nova compra (NF)</h1>
      <p className="text-sm text-mf-text-secondary mt-1">
        Registre uma nota fiscal inteira. Cada linha vira um movimento de compra,
        atualiza o catálogo conforme você escolher e guarda alias por fornecedor
        para reconhecer o material em NFs futuras.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <section className="bg-white rounded border p-4 space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-mf-text-secondary">
            Fornecedor
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={fornecedorMode === 'existente'}
                onChange={() => setFornecedorMode('existente')} />
              Já cadastrado
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={fornecedorMode === 'novo'}
                onChange={() => setFornecedorMode('novo')} />
              Cadastrar agora
            </label>
          </div>

          {fornecedorMode === 'existente' && (
            <select
              value={fornecedorId}
              onChange={e => setFornecedorId(e.target.value)}
              className="block w-full border rounded px-2 py-1"
            >
              <option value="">— selecione —</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}{f.cnpj ? ` (${f.cnpj})` : ''}
                </option>
              ))}
            </select>
          )}

          {fornecedorMode === 'novo' && (
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-mf-text-secondary">Nome *</span>
                <input value={novoFornecedorNome}
                  onChange={e => setNovoFornecedorNome(e.target.value)}
                  className="block w-full border rounded px-2 py-1" />
              </label>
              <label className="block">
                <span className="text-xs text-mf-text-secondary">CNPJ</span>
                <input value={novoFornecedorCnpj}
                  onChange={e => setNovoFornecedorCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="block w-full border rounded px-2 py-1" />
              </label>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
            <label className="block">
              <span className="text-xs text-mf-text-secondary">Nota fiscal (nº)</span>
              <input value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)}
                className="block w-full border rounded px-2 py-1" />
            </label>
            <label className="block">
              <span className="text-xs text-mf-text-secondary">Observação</span>
              <input value={observacao} onChange={e => setObservacao(e.target.value)}
                className="block w-full border rounded px-2 py-1" />
            </label>
          </div>
        </section>

        <section className="bg-white rounded border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-mf-text-secondary">
              Itens ({items.length})
            </h2>
            <button type="button" onClick={addItem}
              className="bg-mf-success text-white font-bold px-3 py-1 rounded text-xs">
              + Adicionar item
            </button>
          </div>
          <div className="divide-y">
            {items.map((it, idx) => (
              <ItemRow
                key={it.uid}
                idx={idx}
                item={it}
                materiais={materiais}
                onChange={patch => updateItem(it.uid, patch)}
                onRemove={() => removeItem(it.uid)}
                canRemove={items.length > 1}
              />
            ))}
          </div>
          <div className="px-4 py-3 border-t bg-mf-yellow/30 flex justify-end items-center gap-3">
            <span className="text-xs text-mf-text-secondary">Total da NF:</span>
            <span className="text-lg font-extrabold tabular-nums">{fmtBRL(total)}</span>
          </div>
        </section>

        {err && <p className="text-mf-danger text-sm">{err}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => navigate('/admin/estoque/movimentos')}
            className="text-mf-text-secondary px-4 py-2 rounded">Cancelar</button>
          <button type="submit" disabled={submitting}
            className="bg-mf-success text-white font-bold px-4 py-2 rounded disabled:opacity-50">
            {submitting ? 'Salvando…' : 'Salvar compra'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ItemRow({
  idx, item, materiais, onChange, onRemove, canRemove,
}: {
  idx: number;
  item: ItemDraft;
  materiais: Material[];
  onChange: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [search, setSearch] = useState('');

  const matchedMaterial = item.material_id
    ? materiais.find(m => m.id === item.material_id) ?? null
    : null;

  const filtered = useMemo(() => {
    if (item.material_id) return [];
    const s = search.trim().toLowerCase();
    if (!s) return [];
    return materiais.filter(m =>
      m.sku.toLowerCase().includes(s) || m.nome.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [search, materiais, item.material_id]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-mf-text-secondary">
          Item {idx + 1}
        </span>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-mf-danger text-xs hover:underline">
            Remover
          </button>
        )}
      </div>

      {/* Material: existente ou novo */}
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={!item.novo_material}
            onChange={() => onChange({ novo_material: false })} />
          Material do catálogo
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={item.novo_material}
            onChange={() => onChange({ novo_material: true, material_id: null })} />
          Cadastrar novo
        </label>
      </div>

      {!item.novo_material && (
        <div>
          {matchedMaterial ? (
            <div className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
              <span>
                <span className="font-mono text-xs">{matchedMaterial.sku}</span>
                {' · '}{matchedMaterial.nome}
                {' · '}<span className="text-mf-text-secondary">{matchedMaterial.unidade} · catálogo: {fmtBRL(matchedMaterial.preco_unitario)}</span>
              </span>
              <button type="button"
                onClick={() => { onChange({ material_id: null }); setSearch(''); }}
                className="text-xs text-mf-text-secondary hover:underline">
                Trocar
              </button>
            </div>
          ) : (
            <div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar SKU ou nome…"
                className="block w-full border rounded px-2 py-1 text-sm"
              />
              {filtered.length > 0 && (
                <div className="border rounded mt-1 max-h-40 overflow-auto">
                  {filtered.map(m => (
                    <button
                      key={m.id} type="button"
                      onClick={() => { onChange({ material_id: m.id }); setSearch(''); }}
                      className="block w-full text-left text-sm p-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <span className="font-mono text-xs">{m.sku}</span>
                      {' · '}{m.nome}
                      {' · '}<span className="text-mf-text-secondary">{m.unidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {item.novo_material && (
        <div className="grid md:grid-cols-2 gap-3 bg-yellow-50 p-3 rounded">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">SKU *</span>
            <input value={item.draft.sku}
              onChange={e => onChange({ draft: { ...item.draft, sku: e.target.value } })}
              className="block w-full border rounded px-2 py-1 font-mono text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Nome *</span>
            <input value={item.draft.nome}
              onChange={e => onChange({ draft: { ...item.draft, nome: e.target.value } })}
              className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Categoria</span>
            <select value={item.draft.categoria}
              onChange={e => onChange({ draft: { ...item.draft, categoria: e.target.value as any } })}
              className="block w-full border rounded px-2 py-1">
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{c} — {CATEGORIA_LABEL[c]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Unidade</span>
            <select value={item.draft.unidade}
              onChange={e => onChange({ draft: { ...item.draft, unidade: e.target.value as any } })}
              className="block w-full border rounded px-2 py-1">
              {UNIDADES.map(u => (
                <option key={u} value={u}>{u} — {UNIDADE_LABEL[u]}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Qtd e preço NF */}
      <div className="grid md:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Quantidade *</span>
          <input value={item.quantidade}
            onChange={e => onChange({ quantidade: e.target.value })}
            inputMode="decimal" placeholder="0"
            className="block w-full border rounded px-2 py-1 text-sm tabular-nums" />
        </label>
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Preço NF (R$/un) *</span>
          <input value={item.preco_nf}
            onChange={e => onChange({ preco_nf: e.target.value })}
            inputMode="decimal" placeholder="0,00"
            className="block w-full border rounded px-2 py-1 text-sm tabular-nums" />
        </label>
        <div className="text-right pt-4">
          <span className="text-xs text-mf-text-secondary block">Subtotal linha</span>
          <span className="font-bold tabular-nums">
            {fmtBRL(
              (Number(item.quantidade.replace(',', '.')) || 0) *
              (Number(item.preco_nf.replace(',', '.')) || 0)
            )}
          </span>
        </div>
      </div>

      {/* Política de catálogo */}
      <div className="bg-gray-50 rounded p-3 space-y-2">
        <span className="text-xs uppercase tracking-wider text-mf-text-secondary">
          Preço do catálogo (usado em orçamentos novos)
          {matchedMaterial && (
            <span className="ml-1 normal-case font-normal">
              · atual: {fmtBRL(matchedMaterial.preco_unitario)}
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={item.preco_catalogo_acao === 'preco_nf'}
              onChange={() => onChange({ preco_catalogo_acao: 'preco_nf' })} />
            Atualizar pro preço da NF
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={item.preco_catalogo_acao === 'manter'}
              onChange={() => onChange({ preco_catalogo_acao: 'manter' })} />
            Manter o atual
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={item.preco_catalogo_acao === 'outro'}
              onChange={() => onChange({ preco_catalogo_acao: 'outro' })} />
            Outro:
          </label>
          {item.preco_catalogo_acao === 'outro' && (
            <input
              value={item.preco_catalogo_outro}
              onChange={e => onChange({ preco_catalogo_outro: e.target.value })}
              inputMode="decimal" placeholder="0,00"
              className="border rounded px-2 py-1 text-sm w-28 tabular-nums"
            />
          )}
        </div>
      </div>

      {/* Alias por fornecedor (opcional) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-mf-text-secondary">
          Como o fornecedor identifica este item (opcional, ajuda a reconhecer NFs futuras)
        </summary>
        <div className="grid md:grid-cols-2 gap-3 mt-2">
          <label className="block">
            <span className="text-xs text-mf-text-secondary">SKU do fornecedor</span>
            <input value={item.sku_fornecedor}
              onChange={e => onChange({ sku_fornecedor: e.target.value })}
              className="block w-full border rounded px-2 py-1 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Descrição na NF</span>
            <input value={item.descricao_fornecedor}
              onChange={e => onChange({ descricao_fornecedor: e.target.value })}
              className="block w-full border rounded px-2 py-1 text-sm" />
          </label>
        </div>
      </details>
    </div>
  );
}
