import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const isDecimal = (step?: number) => !!step && step < 1;

const toDisplay = (n: number, decimal: boolean) =>
  decimal ? String(n).replace('.', ',') : String(n);

// Accept pt-BR ("2,7") or en ("2.7") while typing.
const normalize = (s: string) => s.replace(',', '.');

export default function NumberField({ value, onChange, min, max, step, className }: Props) {
  const decimal = isDecimal(step);
  const [text, setText] = useState(toDisplay(value, decimal));

  useEffect(() => { setText(toDisplay(value, decimal)); }, [value, decimal]);

  const parse = (s: string) =>
    decimal ? parseFloat(normalize(s)) : parseInt(normalize(s), 10);

  // Block characters that aren't digits, a single decimal separator, or editing keys.
  // Prevents "e", "+", "-" etc. from sneaking past type="text".
  const allowed = decimal ? /^[0-9]*[.,]?[0-9]*$/ : /^[0-9]*$/;

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      onChange={e => {
        const raw = e.target.value;
        if (raw !== '' && !allowed.test(raw)) return;  // reject invalid keystrokes
        const n = parse(raw);
        if (!Number.isNaN(n) && max !== undefined && n > max) {
          setText(toDisplay(max, decimal));
          onChange(max);
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
      }}
      className={className}
    />
  );
}
