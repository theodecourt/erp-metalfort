import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fornecedorApi, type Fornecedor, type FornecedorInput } from '../../lib/estoque';
import FornecedorList from '../../components/Estoque/FornecedorList';
import FornecedorForm from '../../components/Estoque/FornecedorForm';

export default function AdminEstoqueFornecedores() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<Fornecedor[] | null>(null);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    setRows(await fornecedorApi.list(fetchApi));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(body: FornecedorInput) {
    setSubmitting(true);
    try {
      if (editing) await fornecedorApi.update(fetchApi, editing.id, body);
      else await fornecedorApi.create(fetchApi, body);
      setEditing(null);
      setShowForm(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(f: Fornecedor) {
    if (!confirm(`Desativar "${f.nome}"?`)) return;
    await fornecedorApi.deactivate(fetchApi, f.id);
    await reload();
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          className="bg-mf-yellow text-mf-black font-bold px-3 py-1 rounded text-sm"
          onClick={() => { setEditing(null); setShowForm((s) => !s); }}
        >{showForm ? 'Cancelar' : 'Novo fornecedor'}</button>
      </div>
      {(showForm || editing) && (
        <div className="mb-6 p-4 bg-white rounded shadow-sm">
          <FornecedorForm
            initial={editing ?? undefined}
            onSubmit={save}
            submitting={submitting}
          />
        </div>
      )}
      {rows === null
        ? <p>Carregando…</p>
        : <FornecedorList
            fornecedores={rows}
            onEdit={(f) => { setEditing(f); setShowForm(true); }}
            onDeactivate={deactivate}
          />}
    </div>
  );
}
