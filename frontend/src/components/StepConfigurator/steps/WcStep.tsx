import type { Configuracao } from '../../../lib/variables';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
}

export default function WcStep({ config, onChange }: Props) {
  const temWc = !!config.tem_wc;

  function toggleWc(checked: boolean) {
    const nextCombos = { ...(config.combos ?? {}) };
    if (checked) {
      nextCombos.divisoria_wc = 'divisoria-umida';
    } else {
      delete nextCombos.divisoria_wc;
    }
    onChange({
      ...config,
      tem_wc: checked,
      wc_itens: checked
        ? (config.wc_itens ?? { pia_parede: true, pia_bancada: false, privada: true, chuveiro: false })
        : config.wc_itens,
      combos: nextCombos,
    });
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={temWc} onChange={e => toggleWc(e.target.checked)} />
        <span className="text-white">Incluir WC</span>
      </label>
      {temWc && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {([
            ['pia_parede', 'Pia de parede'],
            ['pia_bancada', 'Pia com bancada'],
            ['privada', 'Privada'],
            ['chuveiro', 'Chuveiro'],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 text-mf-text-secondary">
              <input type="checkbox"
                checked={!!config.wc_itens?.[key]}
                onChange={e => onChange({
                  ...config,
                  wc_itens: { ...(config.wc_itens ?? {}), [key]: e.target.checked },
                })} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
      {temWc && (
        <p className="mt-3 text-xs text-mf-text-secondary">
          Parede interna do WC usa placa RU (combo "Úmida" aplicado automaticamente).
        </p>
      )}
    </div>
  );
}
