import type { Configuracao } from '../../lib/variables';
import { derive } from '../../lib/variables';
import { fmtDec } from '../../lib/format';

export default function AreasPanel({ config }: { config: Configuracao }) {
  const v = derive(config);

  const rows: Array<[string, string]> = [
    ['Área de planta', `${fmtDec(Number(v.area_planta_m2))} m²`],
    ['Área de cobertura', `${fmtDec(Number(v.area_cobertura_m2))} m²`],
    ['Paredes externas', `${fmtDec(Number(v.area_fechamento_ext_m2))} m²`],
    ['Paredes internas', `${fmtDec(Number(v.area_parede_interna_m2))} m²`],
    ['Perímetro externo', `${fmtDec(Number(v.perimetro_externo_m))} m`],
  ];

  return (
    <div className="bg-mf-black-soft border border-mf-border rounded-lg p-6">
      <div className="text-xs uppercase text-mf-yellow">Medidas</div>
      <dl className="mt-3 space-y-1 text-sm">
        {rows.map(([label, val]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-mf-text-secondary">{label}</dt>
            <dd className="text-white tabular-nums">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
