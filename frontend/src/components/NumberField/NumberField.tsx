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

export default function NumberField({
  value, onChange, min, max, step, className, unit,
}: Props) {
  const decimal = isDecimal(step);
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

  return (
    <span className="inline-block align-top">
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
        className={className}
      />
      {flash && (
        <span className="block text-xs mt-1 text-mf-yellow font-semibold">
          {flash}
        </span>
      )}
    </span>
  );
}
