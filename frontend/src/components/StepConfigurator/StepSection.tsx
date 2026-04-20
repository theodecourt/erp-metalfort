import type { ReactNode } from 'react';

interface Props {
  id: string;      // id do DOM node, usado pelo IntersectionObserver e pelo scroll-jump
  number: number;  // numero mostrado no header
  title: string;
  children: ReactNode;
}

export default function StepSection({ id, number, title, children }: Props) {
  return (
    <section id={id} className="scroll-mt-8 py-6 border-b border-mf-border">
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
