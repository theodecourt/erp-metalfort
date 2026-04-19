import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

function parseNumber(text: string, step?: number): number {
  return step && step < 1 ? parseFloat(text) : parseInt(text, 10);
}

function clamp(n: number, min?: number, max?: number): number {
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

export default function NumberField({ value, onChange, min, max, step, className }: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={e => {
        const raw = e.target.value;
        setText(raw);
        const n = parseNumber(raw, step);
        if (Number.isNaN(n)) return;
        const clamped = clamp(n, min, max);
        if (clamped === n) onChange(n);
      }}
      onBlur={() => {
        const n = parseNumber(text, step);
        if (Number.isNaN(n)) { setText(String(value)); return; }
        const clamped = clamp(n, min, max);
        setText(String(clamped));
        if (clamped !== value) onChange(clamped);
      }}
      className={className}
    />
  );
}
