import { fmtBRL } from '../../lib/format';

export default function PriceBox({
  subtotal, total, gerenciamentoPct, itemCount, loading,
}: {
  subtotal: number; total: number; gerenciamentoPct: number; itemCount: number; loading: boolean;
}) {
  const fmt = (n: number) => fmtBRL(n);
  return (
    <div className="bg-mf-black-soft border border-mf-border rounded-lg p-6">
      <div className="text-xs uppercase text-mf-yellow">Orçamento preliminar</div>
      {loading ? (
        <div className="mt-2 text-mf-text-secondary">Calculando...</div>
      ) : (
        <>
          <div className="mt-2 flex justify-between text-mf-text-secondary text-sm">
            <span>{itemCount} itens</span>
            <span>Gerenciamento {gerenciamentoPct}%</span>
          </div>
          <div className="mt-4 text-2xl font-extrabold text-mf-yellow">{fmt(total)}</div>
          <div className="text-xs text-mf-text-secondary">Subtotal {fmt(subtotal)}</div>
        </>
      )}
    </div>
  );
}
