import type { MovimentoTipo } from '../../lib/estoque';

export interface FiltrosState {
  tipo?: MovimentoTipo | '';
  material_id?: string;
  fornecedor_id?: string;
  orcamento_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

interface Props {
  value: FiltrosState;
  onChange: (next: FiltrosState) => void;
}

const TIPOS: { value: MovimentoTipo | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'compra', label: 'Compra' },
  { value: 'ajuste_positivo', label: 'Ajuste +' },
  { value: 'saida_obra', label: 'Saída para obra' },
  { value: 'ajuste_negativo', label: 'Ajuste −' },
];

export default function MovimentoFiltros({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <label className="text-sm">
        <span className="block text-xs text-mf-text-secondary">Tipo</span>
        <select
          className="border px-2 py-1 rounded"
          value={value.tipo ?? ''}
          onChange={(e) => onChange({ ...value, tipo: e.target.value as MovimentoTipo | '' })}
        >
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-xs text-mf-text-secondary">Data inicial</span>
        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={value.data_inicio ?? ''}
          onChange={(e) => onChange({ ...value, data_inicio: e.target.value })}
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs text-mf-text-secondary">Data final</span>
        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={value.data_fim ?? ''}
          onChange={(e) => onChange({ ...value, data_fim: e.target.value })}
        />
      </label>
    </div>
  );
}
