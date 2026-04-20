import type { PacoteCombo } from '../../lib/combos';
import { fmtBRL } from '../../lib/format';

interface Props {
  combo: PacoteCombo;
  selected: boolean;
  unitPrice: number;
  unitLabel: string; // ex: "m² parede", "m²", "un"
  delta: number;     // diferenca no total do orcamento vs Standard da mesma categoria
  onSelect: () => void;
  ariaLabel?: string; // override do accessible name (evita colisao com outros botoes)
}

export default function ComboCard({ combo, selected, unitPrice, unitLabel, delta, onSelect, ariaLabel }: Props) {
  const mark = selected ? '●' : '○';
  const baseBorder = selected ? 'border-mf-yellow' : 'border-mf-border hover:border-mf-text-secondary';
  const signed = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`text-left w-full bg-mf-black-soft border-2 ${baseBorder} rounded-lg p-4 transition-colors`}
    >
      <div className="flex items-center gap-2 text-mf-yellow text-sm font-bold">
        <span aria-hidden>{mark}</span>
        <span>{combo.nome}</span>
      </div>
      {combo.descricao && (
        <div className="mt-2 text-sm text-mf-text-secondary">{combo.descricao}</div>
      )}
      <div className="mt-3 text-white font-semibold">
        {fmtBRL(unitPrice)} <span className="text-xs text-mf-text-secondary">/ {unitLabel}</span>
      </div>
      {delta !== 0 && (
        <div className={`mt-1 text-xs ${delta > 0 ? 'text-mf-text-secondary' : 'text-mf-success'}`}>
          {signed}{fmtBRL(Math.abs(delta))} vs Standard
        </div>
      )}
    </button>
  );
}
