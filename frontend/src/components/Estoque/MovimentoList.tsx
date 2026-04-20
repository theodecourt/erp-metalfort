import type { Movimento } from '../../lib/estoque';
import { fmtQtd } from '../../lib/format';

const TIPO_LABEL: Record<string, string> = {
  compra: 'Compra',
  ajuste_positivo: 'Ajuste +',
  saida_obra: 'Saída',
  ajuste_negativo: 'Ajuste −',
};

const TIPO_SIGN: Record<string, string> = {
  compra: '+',
  ajuste_positivo: '+',
  saida_obra: '−',
  ajuste_negativo: '−',
};

export interface MaterialInfo { nome: string; unidade: string; }

interface Props {
  movimentos: Movimento[];
  materialById: Record<string, MaterialInfo>;
  fornecedorById: Record<string, string>;
}

export default function MovimentoList({ movimentos, materialById, fornecedorById }: Props) {
  if (!movimentos.length) {
    return <p className="text-mf-text-secondary text-sm">Nenhum movimento encontrado.</p>;
  }
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="text-left text-mf-text-secondary">
        <tr>
          <th className="py-2">Data</th>
          <th>Tipo</th>
          <th>Material</th>
          <th className="text-right">Qtd.</th>
          <th>Fornecedor</th>
          <th>Detalhe</th>
        </tr>
      </thead>
      <tbody>
        {movimentos.map((m) => {
          const info = materialById[m.material_id];
          const fornecedor = m.fornecedor_id ? fornecedorById[m.fornecedor_id] : null;
          return (
          <tr key={m.id} className="border-t border-mf-border/20">
            <td className="py-2">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
            <td>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
            <td>{info?.nome ?? m.material_id}</td>
            <td className="text-right">{TIPO_SIGN[m.tipo]}{fmtQtd(m.quantidade, info?.unidade)}</td>
            <td>{fornecedor ?? <span className="text-mf-text-secondary">—</span>}</td>
            <td className="text-mf-text-secondary">
              {m.tipo === 'compra' && m.nota_fiscal ? `NF ${m.nota_fiscal}` : ''}
              {m.tipo === 'saida_obra' ? m.destino ?? '' : ''}
              {m.tipo.startsWith('ajuste') ? m.observacao ?? '' : ''}
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}
