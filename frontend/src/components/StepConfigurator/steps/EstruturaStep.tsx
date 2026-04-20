import NumberField from '../../NumberField/NumberField';
import type { Configuracao } from '../../../lib/variables';

const MODULO_SIZES = { '3x3': [3, 3], '3x6': [3, 6], '3x9': [3, 9] } as const;

function perimetroSingle(tipo: '3x3' | '3x6' | '3x9'): number {
  const [larg, comp] = MODULO_SIZES[tipo];
  return 2 * larg + 2 * comp;
}

function perimetrosEsperados(tipo: '3x3' | '3x6' | '3x9', qtd: number): Array<{ face: number; perim: number }> {
  if (qtd <= 1) return [];
  const [larg, comp] = MODULO_SIZES[tipo];
  const pelaLarg = { face: larg, perim: 2 * larg + 2 * (comp * qtd) };
  const pelaComp = { face: comp, perim: 2 * (larg * qtd) + 2 * comp };
  return larg === comp ? [pelaLarg] : [pelaLarg, pelaComp];
}

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
  peSuggested: number;
}

export default function EstruturaStep({ config, onChange, peSuggested }: Props) {
  function changeTamanho(t: '3x3' | '3x6' | '3x9') {
    onChange({
      ...config,
      tamanho_modulo: t,
      pe_direito_m: ({ '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 } as const)[t],
      comp_paredes_ext_m: config.qtd_modulos === 1 ? perimetroSingle(t) : config.comp_paredes_ext_m,
    });
  }

  function changeQtd(n: number) {
    if (n === 1) {
      onChange({ ...config, qtd_modulos: n, comp_paredes_ext_m: perimetroSingle(config.tamanho_modulo) });
    } else if (config.qtd_modulos === 1) {
      onChange({ ...config, qtd_modulos: n, comp_paredes_ext_m: 0 });
    } else {
      onChange({ ...config, qtd_modulos: n });
    }
  }

  const esperados = perimetrosEsperados(config.tamanho_modulo, config.qtd_modulos);
  const ext = config.comp_paredes_ext_m ?? 0;
  const match = esperados.find(e => Math.abs(e.perim - ext) < 0.01);
  const esperadosLabel = esperados.map(e => `${e.perim.toLocaleString('pt-BR')} m (face ${e.face} m)`).join(' · ');

  return (
    <div className="grid gap-5">
      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Tamanho do módulo</div>
        <div className="flex gap-2">
          {(['3x3', '3x6', '3x9'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => changeTamanho(t)}
              className={`flex-1 py-3 rounded ${
                config.tamanho_modulo === t ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </label>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Quantidade de módulos</div>
        <NumberField
          min={1} max={3} unit="módulos" value={config.qtd_modulos}
          onChange={changeQtd}
          className="w-32 bg-mf-black-soft text-white p-2 rounded border border-mf-border"
        />
      </label>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Pé direito — sugerido: {peSuggested.toLocaleString('pt-BR')} m
        </div>
        <NumberField
          min={2.4} max={3.5} step={0.1} unit="m" value={config.pe_direito_m}
          onChange={n => onChange({ ...config, pe_direito_m: n })}
          className="w-32 bg-mf-black-soft text-white p-2 rounded border border-mf-border"
        />
      </label>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Paredes (metros lineares)</div>
        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-mf-text-secondary">
            Externas:
            <NumberField
              min={0} step={0.1} unit="m" value={config.comp_paredes_ext_m ?? 0}
              onChange={n => onChange({ ...config, comp_paredes_ext_m: n })}
              className="ml-2 w-32 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
            />
          </label>
          <label className="text-sm text-mf-text-secondary">
            Internas:
            <NumberField
              min={0} step={0.1} unit="m" value={config.comp_paredes_int_m ?? 0}
              onChange={n => onChange({ ...config, comp_paredes_int_m: n })}
              className="ml-2 w-32 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
            />
          </label>
        </div>
        {config.qtd_modulos > 1 && (() => {
          if (!ext) return (
            <p className="mt-2 text-xs text-mf-yellow">
              Informe o perímetro externo total. Esperado: {esperadosLabel}.
            </p>
          );
          if (match) return (
            <p className="mt-2 text-xs text-mf-success">✓ Consistente com conexão pela face de {match.face} m.</p>
          );
          return (
            <p className="mt-2 text-xs text-mf-danger">
              ⚠ Não bate com conexão linear (esperado: {esperadosLabel}). Pode estar certo em L/T — confira.
            </p>
          );
        })()}
      </div>
    </div>
  );
}
