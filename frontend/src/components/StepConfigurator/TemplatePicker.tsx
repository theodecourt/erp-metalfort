import { useState } from 'react';
import type { TemplateSlug } from '../../lib/variables';

interface Props {
  active: TemplateSlug;
  hasCustomizations: boolean;
  onApply: (slug: TemplateSlug) => void;
  onRevert: () => void;
}

const OPTIONS: Array<{ slug: TemplateSlug; label: string }> = [
  { slug: 'basico', label: 'Básico' },
  { slug: 'premium', label: 'Premium' },
  { slug: 'personalizado', label: 'Personalizado' },
];

export default function TemplatePicker({ active, hasCustomizations, onApply, onRevert }: Props) {
  const [pending, setPending] = useState<TemplateSlug | null>(null);

  function handleClick(slug: TemplateSlug) {
    if (slug === active) return;
    if (hasCustomizations) {
      setPending(slug);
    } else {
      onApply(slug);
    }
  }

  function confirm() {
    if (pending) onApply(pending);
    setPending(null);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {OPTIONS.map(o => {
        const selected = active === o.slug;
        return (
          <button
            key={o.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => handleClick(o.slug)}
            className={`px-4 py-2 rounded font-semibold ${
              selected ? 'bg-mf-yellow text-mf-black' : 'bg-mf-black-soft text-white'
            }`}
          >
            {o.label}
          </button>
        );
      })}
      {hasCustomizations && (
        <button
          type="button"
          onClick={onRevert}
          className="ml-2 text-sm text-mf-yellow hover:underline"
        >
          ↺ Voltar ao template
        </button>
      )}

      {pending && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-mf-black-soft border border-mf-border rounded-lg p-6 max-w-md">
            <p className="text-white">
              Isso vai sobrescrever as seleções customizadas. Continuar?
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="px-4 py-2 text-mf-text-secondary hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                className="px-4 py-2 bg-mf-yellow text-mf-black font-bold rounded"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
