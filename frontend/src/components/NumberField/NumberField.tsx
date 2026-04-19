import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export default function NumberField({ value, onChange, min, max, step, className }: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  const parse = (s: string) =>
    step && step < 1 ? parseFloat(s) : parseInt(s, 10);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={e => {
        const raw = e.target.value;
        const n = parse(raw);
        // Hard-clamp on the upper bound while typing: user asked for "5" when
        // max is 3 to snap to 3 instantly. The lower bound stays lenient so
        // building up "2.7" from "2" doesn't bounce to the min mid-type.
        if (!Number.isNaN(n) && max !== undefined && n > max) {
          const clamped = String(max);
          setText(clamped);
          onChange(max);
          return;
        }
        setText(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        const n = parse(text);
        if (Number.isNaN(n)) { setText(String(value)); return; }
        const lo = min ?? -Infinity;
        const hi = max ?? Infinity;
        const clamped = Math.max(lo, Math.min(hi, n));
        if (clamped !== n) {
          setText(String(clamped));
          onChange(clamped);
        }
      }}
      className={className}
    />
  );
}
