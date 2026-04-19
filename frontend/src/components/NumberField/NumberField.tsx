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

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={e => {
        setText(e.target.value);
        const n = step && step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        const n = step && step < 1 ? parseFloat(text) : parseInt(text, 10);
        if (Number.isNaN(n)) setText(String(value));
      }}
      className={className}
    />
  );
}
