import NumberField from '../../NumberField/NumberField';
import PersonalizadoPicker from '../../Configurator/PersonalizadoPicker';
import ExtrasComerciaisPicker from './ExtrasComerciaisPicker';
import type { Configuracao } from '../../../lib/variables';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
}

export default function ExtrasStep({ config, onChange }: Props) {
  return (
    <div className="grid gap-5">
      <label className="block">
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Splits de ar-condicionado</div>
        <NumberField
          min={0} max={6} unit="un" value={config.num_splits ?? 0}
          onChange={n => onChange({ ...config, num_splits: n })}
          className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"
        />
      </label>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Material avulso (escape hatch)
        </div>
        <PersonalizadoPicker
          itens={config.itens_personalizados ?? []}
          onChange={itens => onChange({ ...config, itens_personalizados: itens })}
        />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Extras comerciais (produto e preço livre)
        </div>
        <ExtrasComerciaisPicker
          itens={config.extras_comerciais ?? []}
          onChange={extras => onChange({ ...config, extras_comerciais: extras })}
        />
      </div>
    </div>
  );
}
