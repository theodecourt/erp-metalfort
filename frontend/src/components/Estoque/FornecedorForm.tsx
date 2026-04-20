import { useState } from 'react';
import type { Fornecedor, FornecedorInput } from '../../lib/estoque';

interface Props {
  initial?: Partial<Fornecedor>;
  onSubmit: (body: FornecedorInput) => void | Promise<void>;
  submitting?: boolean;
}

export default function FornecedorForm({ initial, onSubmit, submitting }: Props) {
  const [form, setForm] = useState<FornecedorInput>({
    nome: initial?.nome ?? '',
    cnpj: initial?.cnpj ?? '',
    contato_nome: initial?.contato_nome ?? '',
    contato_email: initial?.contato_email ?? '',
    contato_fone: initial?.contato_fone ?? '',
    observacao: initial?.observacao ?? '',
  });
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome?.trim()) { setErr('Nome obrigatório'); return; }
    setErr(null);
    onSubmit({
      ...form,
      cnpj: form.cnpj || null,
      contato_email: form.contato_email || null,
      contato_fone: form.contato_fone || null,
      contato_nome: form.contato_nome || null,
      observacao: form.observacao || null,
    });
  }

  function bind<K extends keyof FornecedorInput>(key: K) {
    return {
      value: (form[key] as string | null) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-xl">
      <label className="block"><span className="text-xs">Nome *</span>
        <input aria-label="Nome" className="block w-full border rounded px-2 py-1" {...bind('nome')} />
      </label>
      <label className="block"><span className="text-xs">CNPJ</span>
        <input aria-label="CNPJ" className="block w-full border rounded px-2 py-1" {...bind('cnpj')} />
      </label>
      <label className="block"><span className="text-xs">Contato – nome</span>
        <input className="block w-full border rounded px-2 py-1" {...bind('contato_nome')} />
      </label>
      <label className="block"><span className="text-xs">Contato – email</span>
        <input type="email" className="block w-full border rounded px-2 py-1" {...bind('contato_email')} />
      </label>
      <label className="block"><span className="text-xs">Contato – telefone</span>
        <input className="block w-full border rounded px-2 py-1" {...bind('contato_fone')} />
      </label>
      <label className="block"><span className="text-xs">Observação</span>
        <textarea className="block w-full border rounded px-2 py-1" {...bind('observacao')} />
      </label>
      {err && <p className="text-mf-danger text-sm">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-mf-yellow text-mf-black font-bold px-4 py-2 rounded disabled:opacity-50"
      >Salvar</button>
    </form>
  );
}
