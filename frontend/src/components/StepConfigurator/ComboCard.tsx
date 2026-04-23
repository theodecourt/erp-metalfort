import type { PacoteCombo } from '../../lib/combos';
import { fmtBRL } from '../../lib/format';

export interface ComboCardItem {
  label: string;         // nome do material (mesmo em todos os cards da linha)
  qtdStr: string | null; // "12 pc", "10,50 m²" ou null se nao ha no combo
}

interface Props {
  combo: PacoteCombo;
  selected: boolean;
  unitPrice: number;
  unitLabel: string; // ex: "m² parede", "m²", "un"
  delta: number;     // diferenca no total do orcamento vs Standard da mesma categoria
  items?: ComboCardItem[]; // alinhados posicionalmente com os outros cards da categoria
  onSelect: () => void;
  ariaLabel?: string; // override do accessible name (evita colisao com outros botoes)
}

export default function ComboCard({ combo, selected, unitPrice, unitLabel, delta, items, onSelect, ariaLabel }: Props) {
  const mark = selected ? '●' : '○';
  const baseBorder = selected ? 'border-mf-yellow' : 'border-mf-border';
  const hoverBg = selected ? '' : 'hover:bg-neutral-700';
  const signed = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`group text-left w-full h-full flex flex-col bg-mf-black-soft ${hoverBg} border-2 ${baseBorder} rounded-lg p-4 transition-colors`}
    >
      <div className="flex items-center gap-2 text-mf-yellow text-sm font-bold">
        <span aria-hidden>{mark}</span>
        <span>{combo.nome}</span>
      </div>
      <div className="mt-2 text-sm text-neutral-300 group-hover:text-white min-h-[2.75rem] leading-snug transition-colors">
        {combo.descricao ?? ''}
      </div>
      {items && items.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-mf-border space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex justify-between gap-2 text-xs h-[1.35rem] leading-[1.35rem]"
              title={it.label}
            >
              <span className={`truncate min-w-0 transition-colors ${it.qtdStr === null ? 'text-neutral-600 group-hover:text-neutral-400' : 'text-neutral-300 group-hover:text-white'}`}>
                {it.label}
              </span>
              <span className={`tabular-nums shrink-0 transition-colors ${it.qtdStr === null ? 'text-neutral-600 group-hover:text-neutral-400' : 'text-white'}`}>
                {it.qtdStr ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-3">
        <div className="text-white font-semibold">
          {fmtBRL(unitPrice)} <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">/ {unitLabel}</span>
        </div>
        <div className={`mt-1 text-xs transition-colors ${delta > 0 ? 'text-neutral-300 group-hover:text-white' : 'text-mf-success'}`}>
          {delta !== 0 ? `${signed}${fmtBRL(Math.abs(delta))} vs Standard` : '\u00a0'}
        </div>
      </div>
    </button>
  );
}
