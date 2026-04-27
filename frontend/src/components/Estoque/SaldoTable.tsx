import type { SaldoRow } from '../../lib/estoque';
import { fmtQtd } from '../../lib/format';

interface Props {
  rows: SaldoRow[];
}

export default function SaldoTable({ rows }: Props) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="text-left text-mf-text-secondary">
        <tr>
          <th className="py-2">SKU</th>
          <th>Material</th>
          <th>Categoria</th>
          <th className="text-right">Saldo</th>
          <th className="text-right">Mínimo</th>
          <th>Un.</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          const saldoNum = Number(r.saldo);
          const negativo = saldoNum < 0;
          return (
            <tr key={r.material_id} className={`border-t border-mf-border/20 ${idx % 2 === 1 ? 'bg-gray-200' : ''}`}>
              <td className="py-2 font-mono text-xs">{r.sku}</td>
              <td>{r.nome}</td>
              <td className="text-mf-text-secondary">{r.categoria}</td>
              <td className={`text-right ${negativo ? 'text-mf-danger' : ''}`}>
                {fmtQtd(saldoNum, r.unidade)}
              </td>
              <td className="text-right text-mf-text-secondary">
                {Number(r.estoque_minimo) > 0 ? fmtQtd(r.estoque_minimo, r.unidade) : '—'}
              </td>
              <td>{r.unidade}</td>
              <td>
                {r.abaixo_minimo ? (
                  <span className="inline-block rounded bg-mf-warning/20 text-mf-warning px-2 py-0.5 text-xs font-bold">
                    abaixo do mínimo
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
