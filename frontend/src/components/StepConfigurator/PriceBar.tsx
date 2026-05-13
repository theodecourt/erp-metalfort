import Spinner from '../Spinner/Spinner';
import { fmtBRL } from '../../lib/format';

interface Props {
  subtotal: number;
  total: number;
  gerenciamentoPct: number;
  itemCount: number;
  loading: boolean;
  // Quando > 0: total exibido vira "parcial" e a linha de status indica quantas
  // perguntas obrigatorias ainda faltam responder antes de poder salvar.
  pendingPromptsCount?: number;
  // Quando definido: linha de status vira mensagem de erro vermelha no lugar
  // de "N itens" ou "responda X pergunta(s)". Total exibido permanece como
  // o ultimo calculo bem-sucedido (visualmente paramos no estado anterior).
  calcError?: string | null;
}

export default function PriceBar({
  subtotal, total, gerenciamentoPct, itemCount, loading, pendingPromptsCount, calcError,
}: Props) {
  const pending = pendingPromptsCount ?? 0;
  const parcial = pending > 0;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-mf-yellow text-mf-black px-6 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
      <div className="max-w-[1520px] mx-auto flex items-center justify-center gap-8">
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-wider font-bold">
            Orçamento {parcial ? 'parcial' : 'preliminar'}
          </div>
          {calcError ? (
            <div role="alert" className="text-xs font-bold text-mf-danger flex items-center gap-1">
              <span aria-hidden>⚠</span>
              <span className="truncate max-w-[60ch]">Falha ao calcular: {calcError}</span>
            </div>
          ) : loading ? (
            <div className="text-xs text-mf-black/70 flex items-center gap-1.5">
              <Spinner size={10} />
              <span>Calculando...</span>
            </div>
          ) : parcial ? (
            <div className="text-xs font-bold text-mf-black">
              Responda {pending} pergunta{pending > 1 ? 's' : ''} obrigatória{pending > 1 ? 's' : ''} para confirmar
            </div>
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
