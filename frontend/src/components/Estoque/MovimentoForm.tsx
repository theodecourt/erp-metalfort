import { useState } from 'react';
import type { MovimentoInput, MovimentoTipo } from '../../lib/estoque';

export interface MaterialOption { id: string; sku: string; nome: string; }
export interface FornecedorOption { id: string; nome: string; }
export interface OrcamentoOption { id: string; numero: string; cliente_nome: string; }

interface Props {
  materiais: MaterialOption[];
  fornecedores: FornecedorOption[];
  orcamentos: OrcamentoOption[];
  onSubmit: (body: MovimentoInput) => void | Promise<void>;
  submitting?: boolean;
}

export default function MovimentoForm({
  materiais, fornecedores, orcamentos, onSubmit, submitting,
}: Props) {
  const [tipo, setTipo] = useState<MovimentoTipo>('compra');
  const [materialId, setMaterialId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnit, setPrecoUnit] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [orcamentoId, setOrcamentoId] = useState('');
  const [destino, setDestino] = useState('');
  const [observacao, setObservacao] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function handleOrcamentoChange(id: string) {
    setOrcamentoId(id);
    const orc = orcamentos.find((o) => o.id === id);
    if (orc) setDestino(`${orc.numero} – ${orc.cliente_nome}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!materialId) return setErr('Selecione um material');
    if (!quantidade || Number(quantidade) <= 0) return setErr('Quantidade precisa ser > 0');

    let body: MovimentoInput;
    if (tipo === 'compra') {
      if (!precoUnit) return setErr('Preço unitário obrigatório');
      if (!fornecedorId) return setErr('Fornecedor obrigatório');
      body = {
        tipo, material_id: materialId, quantidade, preco_unitario: precoUnit,
        fornecedor_id: fornecedorId,
        nota_fiscal: notaFiscal || null, observacao: observacao || null,
      };
    } else if (tipo === 'saida_obra') {
      if (!destino) return setErr('Destino obrigatório');
      body = {
        tipo, material_id: materialId, quantidade, destino,
        orcamento_id: orcamentoId || null, observacao: observacao || null,
      };
    } else {
      if (!observacao) return setErr('Justificativa obrigatória');
      body = { tipo, material_id: materialId, quantidade, observacao };
    }
    onSubmit(body);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
      <label className="block">
        <span className="text-xs text-mf-text-secondary">Tipo</span>
        <select
          aria-label="Tipo"
          className="block w-full border rounded px-2 py-1"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as MovimentoTipo)}
        >
          <option value="compra">Compra</option>
          <option value="saida_obra">Saída para obra</option>
          <option value="ajuste_positivo">Ajuste +</option>
          <option value="ajuste_negativo">Ajuste −</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-mf-text-secondary">Material</span>
        <select
          aria-label="Material"
          className="block w-full border rounded px-2 py-1"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
        >
          <option value="">—</option>
          {materiais.map((m) => (
            <option key={m.id} value={m.id}>{m.sku} · {m.nome}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-mf-text-secondary">Quantidade</span>
        <input
          aria-label="Quantidade"
          type="number" step="0.001" min="0"
          className="block w-full border rounded px-2 py-1"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </label>

      {tipo === 'compra' && (
        <>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Preço unitário (R$)</span>
            <input
              aria-label="Preço unitário"
              type="number" step="0.01" min="0"
              className="block w-full border rounded px-2 py-1"
              value={precoUnit}
              onChange={(e) => setPrecoUnit(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Fornecedor</span>
            <select
              aria-label="Fornecedor"
              className="block w-full border rounded px-2 py-1"
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">—</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Nota fiscal (opcional)</span>
            <input
              aria-label="Nota fiscal"
              type="text"
              className="block w-full border rounded px-2 py-1"
              value={notaFiscal}
              onChange={(e) => setNotaFiscal(e.target.value)}
            />
          </label>
        </>
      )}

      {tipo === 'saida_obra' && (
        <>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Orçamento (opcional)</span>
            <select
              aria-label="Orçamento"
              className="block w-full border rounded px-2 py-1"
              value={orcamentoId}
              onChange={(e) => handleOrcamentoChange(e.target.value)}
            >
              <option value="">—</option>
              {orcamentos.map((o) => (
                <option key={o.id} value={o.id}>{o.numero} — {o.cliente_nome}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Destino</span>
            <input
              aria-label="Destino"
              type="text"
              className="block w-full border rounded px-2 py-1"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />
          </label>
        </>
      )}

      {(tipo === 'ajuste_positivo' || tipo === 'ajuste_negativo') && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Justificativa</span>
          <textarea
            aria-label="Justificativa"
            className="block w-full border rounded px-2 py-1"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>
      )}

      {tipo !== 'ajuste_positivo' && tipo !== 'ajuste_negativo' && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Observação (opcional)</span>
          <textarea
            aria-label="Observação"
            className="block w-full border rounded px-2 py-1"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>
      )}

      {err && <p className="text-mf-danger text-sm">{err}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-mf-yellow text-mf-black font-bold px-4 py-2 rounded disabled:opacity-50"
      >
        Lançar movimento
      </button>
    </form>
  );
}
