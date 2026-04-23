import { fmtBRL } from '../../lib/format';

interface Props {
  subtotal: number;
  total: number;
  gerenciamentoPct: number;
  itemCount: number;
  loading: boolean;
}

export default function PriceBar({ subtotal, total, gerenciamentoPct, itemCount, loading }: Props) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-mf-yellow text-mf-black px-6 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
      <div className="max-w-[1520px] mx-auto flex items-center justify-center gap-8">
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wider font-bold">Orçamento preliminar</div>
          {loading ? (
            <div className="text-xs text-mf-black/70">Calculando...</div>
          ) : (
            <div className="text-xs text-mf-black/70">
              {itemCount} itens · Gerenciamento {gerenciamentoPct}%
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold leading-none">{fmtBRL(total)}</span>
          <span className="text-sm text-mf-black/70">(Subtotal {fmtBRL(subtotal)})</span>
        </div>
      </div>
    </div>
  );
}
