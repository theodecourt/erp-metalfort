import type { ReactNode } from 'react';

export default function LeverGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-mf-border py-4">
      <div className="text-xs uppercase tracking-wider text-mf-yellow mb-2">{label}</div>
      {children}
    </div>
  );
}
