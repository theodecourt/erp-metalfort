import { useMemo } from 'react';
import ComboCard from '../ComboCard';
import { computeComboCost, findStandardCombo, type PacoteCombo } from '../../../lib/combos';
import type { ComboCategoria } from '../../../lib/variables';

interface Props {
  categoria: ComboCategoria;
  unitLabel: string;                       // ex: "m² parede", "m² piso", "un"
  unitVar: string;                         // chave em `vars` que representa 1 unidade (ex: area_fechamento_ext_m2). Usado para derivar preco unitario.
  combos: PacoteCombo[];                   // todos os combos (ja carregados pela pagina)
  vars: Record<string, any>;               // saida de derive(config)
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
}

export default function CategoryComboStep({ categoria, unitLabel, unitVar, combos, vars, selectedSlug, onSelect }: Props) {
  const categoryCombos = useMemo(
    () => combos.filter(c => c.categoria === categoria).sort((a, b) => a.ordem - b.ordem),
    [combos, categoria],
  );

  const standard = findStandardCombo(combos, categoria);
  const standardTotalCost = standard ? computeComboCost(standard, vars) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {categoryCombos.map(combo => {
        const totalCost = computeComboCost(combo, vars);
        const unit = vars[unitVar];
        const unitPrice = typeof unit === 'number' && unit > 0 ? totalCost / unit : totalCost;
        const delta = combo.slug === standard?.slug ? 0 : totalCost - standardTotalCost;
        return (
          <ComboCard
            key={combo.id}
            combo={combo}
            selected={combo.slug === selectedSlug}
            unitPrice={unitPrice}
            unitLabel={unitLabel}
            delta={delta}
            onSelect={() => onSelect(combo.slug)}
            ariaLabel={`Escolher pacote ${categoria} #${combo.ordem}`}
          />
        );
      })}
    </div>
  );
}
