export interface StepItem {
  id: string;
  label: string;
  filled: boolean;
}

interface Props {
  steps: StepItem[];
  activeId: string | null;
  onJump: (id: string) => void;
  direction?: 'vertical' | 'horizontal';
}

export default function StepSidebar({ steps, activeId, onJump, direction = 'vertical' }: Props) {
  const navClass = direction === 'horizontal'
    ? 'flex flex-row gap-1 text-sm whitespace-nowrap'
    : 'flex flex-col gap-1 text-sm';
  return (
    <nav aria-label="Etapas do orcamento" className={navClass}>
      {steps.map((s, i) => {
        const active = s.id === activeId;
        const mark = s.filled ? '●' : '○';
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onJump(s.id)}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 text-left py-2 px-3 rounded transition-colors ${
              active ? 'bg-mf-black-soft text-mf-yellow' : 'text-mf-text-secondary hover:text-white'
            }`}
          >
            <span aria-hidden className="w-5 text-center text-xs">{i + 1}</span>
            <span aria-hidden>{mark}</span>
            <span className="flex-1">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
