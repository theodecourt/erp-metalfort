import type { AcabamentoExt, Configuracao, Piso } from '../../../lib/variables';
import { ACABAMENTO_EXT_CORES, PISO_CORES } from '../../../lib/variables';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
}

export default function AcabamentoStep({ config, onChange }: Props) {
  return (
    <div className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Acabamento externo</div>
        <div className="flex gap-2 flex-wrap">
          {(['textura', 'pintura', 'cimenticia'] as const).map(a => (
            <button key={a} type="button"
              onClick={() => onChange({
                ...config,
                acabamento_ext: a,
                cor_ext: ACABAMENTO_EXT_CORES[a][0],
              })}
              className={`px-4 py-2 rounded capitalize ${
                config.acabamento_ext === a ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
              }`}>
              {a}
            </button>
          ))}
        </div>
        {config.acabamento_ext && (
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
              Cor do {config.acabamento_ext}
            </div>
            <div className="flex flex-wrap gap-2">
              {ACABAMENTO_EXT_CORES[config.acabamento_ext as AcabamentoExt].map(c => (
                <button key={c} type="button"
                  onClick={() => onChange({ ...config, cor_ext: c })}
                  className={`px-3 py-1.5 rounded text-sm ${
                    config.cor_ext === c ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Cor do piso</div>
        <div className="flex flex-wrap gap-2">
          {PISO_CORES[(config.piso ?? 'vinilico') as Piso].map(c => (
            <button key={c} type="button"
              onClick={() => onChange({ ...config, piso_cor: c })}
              className={`px-3 py-1.5 rounded text-sm ${
                config.piso_cor === c ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'
              }`}>
              {c}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mf-text-secondary">
          Tipo de piso é escolhido na etapa "Piso e subpiso".
        </p>
      </div>
    </div>
  );
}
