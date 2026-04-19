import type { Configuracao } from '../../lib/variables';
import { derive } from '../../lib/variables';
import { fmtDec } from '../../lib/format';

const num = (v: number | boolean) => Number(v);

export default function AreasPanel({ config }: { config: Configuracao }) {
  const v = derive(config);

  const groups: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: 'Planta',
      rows: [
        ['Área de planta', `${fmtDec(num(v.area_planta_m2))} m²`],
        ['Área de cobertura', `${fmtDec(num(v.area_cobertura_m2))} m²`],
      ],
    },
    {
      title: 'Paredes externas',
      rows: [
        ['Perímetro', `${fmtDec(num(v.perimetro_externo_m))} m`],
        ['Área bruta', `${fmtDec(num(v.area_fechamento_ext_bruta_m2))} m²`],
        ['− Aberturas', `${fmtDec(num(v.area_aberturas_ext_m2))} m²`],
        ['= Área líquida', `${fmtDec(num(v.area_fechamento_ext_m2))} m²`],
      ],
    },
    {
      title: 'Paredes internas',
      rows: [
        ['Comprimento', `${fmtDec(num(v.comp_parede_interna_m))} m`],
        ['Área bruta (2 faces)', `${fmtDec(num(v.area_parede_interna_bruta_m2))} m²`],
        ['= Área líquida', `${fmtDec(num(v.area_parede_interna_m2))} m²`],
      ],
    },
  ];

  return (
    <div className="bg-mf-black-soft border border-mf-border rounded-lg p-6 text-sm">
      <div className="text-xs uppercase text-mf-yellow">Medidas</div>
      {groups.map(g => (
        <div key={g.title} className="mt-4">
          <div className="text-[11px] uppercase tracking-wider text-mf-text-secondary mb-1">
            {g.title}
          </div>
          <dl className="space-y-1">
            {g.rows.map(([label, val], i) => {
              const isTotal = label.startsWith('=');
              return (
                <div
                  key={label}
                  className={`flex justify-between gap-4 ${i === g.rows.length - 1 && isTotal ? 'pt-1 border-t border-mf-border' : ''}`}
                >
                  <dt className="text-mf-text-secondary">{label}</dt>
                  <dd className={`tabular-nums ${isTotal ? 'text-mf-yellow font-semibold' : 'text-white'}`}>
                    {val}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
