import { useEffect, useMemo, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import {
  estoqueApi, fornecedorApi,
  type Movimento, type MovimentoInput,
} from '../../lib/estoque';
import MovimentoFiltros, { type FiltrosState } from '../../components/Estoque/MovimentoFiltros';
import MovimentoList from '../../components/Estoque/MovimentoList';
import MovimentoForm from '../../components/Estoque/MovimentoForm';

interface MaterialLite { id: string; sku: string; nome: string; unidade: string; }
interface OrcamentoLite { id: string; numero: string; cliente_nome: string; }

export default function AdminEstoqueMovimentos() {
  const fetchApi = useAuthedFetch();
  const [filtros, setFiltros] = useState<FiltrosState>({});
  const [movimentos, setMovimentos] = useState<Movimento[] | null>(null);
  const [materiais, setMateriais] = useState<MaterialLite[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoLite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const materialById = useMemo(
    () => Object.fromEntries(
      materiais.map((m) => [m.id, { nome: `${m.sku} · ${m.nome}`, unidade: m.unidade }]),
    ),
    [materiais],
  );
  const fornecedorById = useMemo(
    () => Object.fromEntries(fornecedores.map((f) => [f.id, f.nome])),
    [fornecedores],
  );

  async function reload() {
    const apiFilters = {
      tipo: filtros.tipo || undefined,
      data_inicio: filtros.data_inicio || undefined,
      data_fim: filtros.data_fim || undefined,
    };
    setMovimentos(await estoqueApi.listMovimentos(fetchApi, apiFilters));
  }

  useEffect(() => {
    (async () => {
      const [mats, forns, orcs] = await Promise.all([
        fetchApi<MaterialLite[]>('/api/material'),
        fornecedorApi.list(fetchApi),
        fetchApi<OrcamentoLite[]>('/api/quote'),
      ]);
      setMateriais(mats);
      setFornecedores(forns.map((f) => ({ id: f.id, nome: f.nome })));
      setOrcamentos(orcs);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.tipo, filtros.data_inicio, filtros.data_fim]);

  async function handleCreate(body: MovimentoInput) {
    setSubmitting(true);
    try {
      await estoqueApi.createMovimento(fetchApi, body);
      setShowForm(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <MovimentoFiltros value={filtros} onChange={setFiltros} />
        <button
          className="bg-mf-yellow text-mf-black font-bold px-3 py-1 rounded text-sm"
          onClick={() => setShowForm((s) => !s)}
        >{showForm ? 'Cancelar' : 'Novo movimento'}</button>
      </div>
      {showForm && (
        <div className="mb-6 p-4 bg-white rounded shadow-sm">
          <MovimentoForm
            materiais={materiais}
            fornecedores={fornecedores}
            orcamentos={orcamentos}
            onSubmit={handleCreate}
            submitting={submitting}
          />
        </div>
      )}
      {movimentos === null
        ? <p>Carregando…</p>
        : <MovimentoList movimentos={movimentos} materialById={materialById} fornecedorById={fornecedorById} />}
    </div>
  );
}
