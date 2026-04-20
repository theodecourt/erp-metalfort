import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  unit?: string;
}

const isDecimal = (step?: number) => !!step && step < 1;

const toDisplay = (n: number, decimal: boolean) =>
  decimal ? String(n).replace('.', ',') : String(n);

const normalize = (s: string) => s.replace(',', '.');

// Round to the precision of `step` so 2.4 + 0.1 doesn't drift to 2.5000000000000004
const roundToStep = (n: number, step: number) => {
  const decimals = Math.max(0, (String(step).split('.')[1] ?? '').length);
  return Number(n.toFixed(decimals));
};

export default function NumberField({
  value, onChange, min, max, step, className, unit,
}: Props) {
  const decimal = isDecimal(step);
  const effectiveStep = step ?? 1;
  const [text, setText] = useState(toDisplay(value, decimal));
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setText(toDisplay(value, decimal)); }, [value, decimal]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const triggerFlash = (msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1800);
  };

  const parse = (s: string) =>
    decimal ? parseFloat(normalize(s)) : parseInt(normalize(s), 10);

  const allowed = decimal ? /^[0-9]*[.,]?[0-9]*$/ : /^[0-9]*$/;

  const bump = (dir: 1 | -1) => {
    const base = Number.isNaN(parse(text)) ? value : parse(text);
    const next = roundToStep(base + dir * effectiveStep, effectiveStep);
    const lo = min ?? -Infinity;
    const hi = max ?? Infinity;
    const clamped = Math.max(lo, Math.min(hi, next));
    setText(toDisplay(clamped, decimal));
    if (clamped !== value) onChange(clamped);
    if (clamped !== next) {
      triggerFlash(
        dir > 0
          ? `Máximo: ${toDisplay(hi, decimal)}${unit ? ' ' + unit : ''}`
          : `Mínimo: ${toDisplay(lo, decimal)}${unit ? ' ' + unit : ''}`,
      );
    }
  };

  return (
    <span className="inline-flex items-baseline gap-1 align-top">
      <span className="relative inline-block">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={text}
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !allowed.test(raw)) return;
            const n = parse(raw);
            if (!Number.isNaN(n) && max !== undefined && n > max) {
              setText(toDisplay(max, decimal));
              onChange(max);
              triggerFlash(`Máximo: ${toDisplay(max, decimal)}${unit ? ' ' + unit : ''}`);
              return;
            }
            setText(raw);
            if (!Number.isNaN(n)) onChange(n);
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowUp') { e.preventDefault(); bump(1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1); }
          }}
          onBlur={() => {
            const n = parse(text);
            if (Number.isNaN(n)) { setText(toDisplay(value, decimal)); return; }
            const lo = min ?? -Infinity;
            const hi = max ?? Infinity;
            const clamped = Math.max(lo, Math.min(hi, n));
            setText(toDisplay(clamped, decimal));
            if (clamped !== value) onChange(clamped);
            if (clamped !== n) {
              triggerFlash(
                n > hi
                  ? `Máximo: ${toDisplay(hi, decimal)}${unit ? ' ' + unit : ''}`
                  : `Mínimo: ${toDisplay(lo, decimal)}${unit ? ' ' + unit : ''}`,
              );
            }
          }}
          className={`${className ?? ''} pr-6`}
        />
        <span className="absolute top-0 right-0 h-full flex flex-col border-l border-mf-border">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Aumentar"
            onClick={() => bump(1)}
            disabled={max !== undefined && value >= max}
            className="flex-1 px-1 text-mf-text-secondary hover:text-mf-yellow disabled:opacity-30 disabled:hover:text-mf-text-secondary text-[8px] leading-none"
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Diminuir"
            onClick={() => bump(-1)}
            disabled={min !== undefined && value <= min}
            className="flex-1 px-1 text-mf-text-secondary hover:text-mf-yellow disabled:opacity-30 disabled:hover:text-mf-text-secondary text-[8px] leading-none border-t border-mf-border"
          >
            ▼
          </button>
        </span>
      </span>
      {unit && <span className="text-xs text-mf-text-secondary select-none">{unit}</span>}
      {flash && (
        <span className="basis-full text-xs mt-1 text-mf-yellow font-semibold">
          {flash}
        </span>
      )}
    </span>
  );
}
