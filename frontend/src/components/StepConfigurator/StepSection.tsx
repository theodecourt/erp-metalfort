import type { ReactNode } from 'react';

interface Props {
  id: string;       // id do DOM node
  number: number;   // numero mostrado no header
  title: string;
  children: ReactNode;
  phaseEnd?: boolean; // fecha uma "fase" do fluxo (gera separador mais forte)
}

export default function StepSection({ id, number, title, children, phaseEnd }: Props) {
  const bg = number % 2 === 1
    ? 'bg-neutral-800 hover:bg-neutral-700'
    : 'hover:bg-neutral-800';
  const gap = phaseEnd ? 'mb-8' : 'mb-3';
  return (
    <section
      id={id}
      className={`scroll-mt-8 py-6 px-4 ${bg} transition-colors border border-white rounded-lg ${gap} last:mb-0`}
    >
      <header className="mb-4">
        <h2 className="text-xl font-extrabold text-white">
          <span className="text-mf-yellow mr-2">{number}.</span>
          {title}
        </h2>
      </header>
      <div>{children}</div>
    </section>
  );
}
