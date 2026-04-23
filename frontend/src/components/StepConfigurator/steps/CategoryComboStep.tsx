import { useMemo } from 'react';
import ComboCard, { type ComboCardItem } from '../ComboCard';
import { computeComboCost, findStandardCombo, type Material, type PacoteCombo } from '../../../lib/combos';
import type { ComboCategoria } from '../../../lib/variables';
import { evaluate } from '../../../lib/formula';
import { fmtQtd } from '../../../lib/format';

interface Props {
  categoria: ComboCategoria;
  unitLabel: string;                       // ex: "m² parede", "m² piso", "un"
  unitVar: string;                         // chave em `vars` que representa 1 unidade (ex: area_fechamento_ext_m2). Usado para derivar preco unitario.
  combos: PacoteCombo[];                   // todos os combos (ja carregados pela pagina)
  vars: Record<string, any>;               // saida de derive(config)
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
}

const displayUnidade = (u: string) => (u === 'm2' ? 'm²' : u);

export default function CategoryComboStep({ categoria, unitLabel, unitVar, combos, vars, selectedSlug, onSelect }: Props) {
  const categoryCombos = useMemo(
    () => combos.filter(c => c.categoria === categoria).sort((a, b) => a.ordem - b.ordem),
    [combos, categoria],
  );

  // Uniao de materiais por primeira aparicao: garante a mesma sequencia de linhas em todos os cards.
  const allMaterials = useMemo<Material[]>(() => {
    const seen = new Map<string, Material>();
    for (const c of categoryCombos) {
      for (const m of c.materiais) {
        if (!seen.has(m.material_id)) seen.set(m.material_id, m.material);
      }
    }
    return Array.from(seen.values());
  }, [categoryCombos]);

  const standard = findStandardCombo(combos, categoria);
  const standardTotalCost = standard ? computeComboCost(standard, vars) : 0;

  return (
    <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto md:pb-2">
      {categoryCombos.map(combo => {
        const totalCost = computeComboCost(combo, vars);
        const unit = vars[unitVar];
        const unitPrice = typeof unit === 'number' && unit > 0 ? totalCost / unit : totalCost;
        const delta = combo.slug === standard?.slug ? 0 : totalCost - standardTotalCost;

        const byMaterialId = new Map(combo.materiais.map(m => [m.material_id, m]));
        const items: ComboCardItem[] = allMaterials.map(mat => {
          const entry = byMaterialId.get(mat.id);
          if (!entry) return { label: mat.nome, qtdStr: null };
          const qtyRaw = evaluate(entry.formula_json, vars);
          const qty = typeof qtyRaw === 'number' ? qtyRaw : 0;
          return {
            label: mat.nome,
            qtdStr: `${fmtQtd(qty, mat.unidade)} ${displayUnidade(mat.unidade)}`,
          };
        });

        return (
          <div key={combo.id} className="md:flex-1 md:basis-0 md:min-w-[200px]">
            <ComboCard
              combo={combo}
              selected={combo.slug === selectedSlug}
              unitPrice={unitPrice}
              unitLabel={unitLabel}
              delta={delta}
              items={items}
              onSelect={() => onSelect(combo.slug)}
              ariaLabel={`Escolher pacote ${categoria} #${combo.ordem}`}
            />
          </div>
        );
      })}
    </div>
  );
}
