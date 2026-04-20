import NumberField from '../../NumberField/NumberField';
import CategoryComboStep from './CategoryComboStep';
import type { Caixilho, Configuracao } from '../../../lib/variables';
import type { PacoteCombo } from '../../../lib/combos';

interface Props {
  config: Configuracao;
  onChange: (c: Configuracao) => void;
  combos: PacoteCombo[];
  vars: Record<string, any>;
}

export default function EsquadriasStep({ config, onChange, combos, vars }: Props) {
  const esq = config.esquadrias_extras ?? { portas: 0 };
  const portas = esq.portas ?? 0;
  const caixilhos: Caixilho[] = esq.caixilhos ?? [];

  function updateEsq(patch: Partial<NonNullable<Configuracao['esquadrias_extras']>>) {
    onChange({
      ...config,
      esquadrias_extras: {
        portas,
        tamanhos_portas: esq.tamanhos_portas ?? [],
        caixilhos,
        ...patch,
      },
    });
  }

  function addCaixilho() {
    updateEsq({ caixilhos: [...caixilhos, { tipo: 'janela', largura_m: 1.2, altura_m: 1.0, qtd: 1 }] });
  }
  function updateCaixilho(i: number, patch: Partial<Caixilho>) {
    updateEsq({ caixilhos: caixilhos.map((c, idx) => idx === i ? { ...c, ...patch } : c) });
  }
  function removeCaixilho(i: number) {
    updateEsq({ caixilhos: caixilhos.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Portas opacas extras</div>
        <label className="text-sm text-mf-text-secondary">
          Quantidade:
          <NumberField
            min={0} unit="un" value={portas}
            onChange={n => {
              const prev = esq.tamanhos_portas ?? [];
              const next = n > prev.length
                ? [...prev, ...Array(n - prev.length).fill('80x210' as const)]
                : prev.slice(0, n);
              updateEsq({ portas: n, tamanhos_portas: next });
            }}
            className="ml-2 w-24 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
          />
        </label>
        {portas > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {Array.from({ length: portas }).map((_, i) => {
              const current = esq.tamanhos_portas?.[i] ?? '80x210';
              return (
                <label key={i} className="text-sm text-mf-text-secondary">
                  {portas === 1 ? 'Tamanho da porta:' : `Porta ${i + 1}:`}
                  <select
                    value={current}
                    onChange={e => {
                      const arr = [...(esq.tamanhos_portas ?? Array(portas).fill('80x210'))];
                      arr[i] = e.target.value as any;
                      updateEsq({ tamanhos_portas: arr });
                    }}
                    className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border"
                  >
                    <option value="60x210">60 × 210 cm (banheiro)</option>
                    <option value="70x210">70 × 210 cm (serviço)</option>
                    <option value="80x210">80 × 210 cm (padrão)</option>
                    <option value="90x210">90 × 210 cm (entrada)</option>
                  </select>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Caixilhos (janelas e portas de vidro)
        </div>
        {caixilhos.length === 0 && (
          <p className="text-xs text-mf-text-secondary">Nenhum caixilho. Adicione abaixo.</p>
        )}
        <div className="flex flex-col gap-2">
          {caixilhos.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 bg-mf-black-soft/40 border border-mf-border rounded p-2">
              <label className="text-xs text-mf-text-secondary">
                Tipo
                <select value={c.tipo} onChange={e => updateCaixilho(i, { tipo: e.target.value as any })}
                  className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border">
                  <option value="janela">Janela</option>
                  <option value="porta_vidro">Porta de vidro</option>
                </select>
              </label>
              <label className="text-xs text-mf-text-secondary">
                Largura
                <NumberField min={0.1} step={0.1} unit="m" value={c.largura_m}
                  onChange={n => updateCaixilho(i, { largura_m: n })}
                  className="ml-2 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border" />
              </label>
              <label className="text-xs text-mf-text-secondary">
                Altura
                <NumberField min={0.1} step={0.1} unit="m" value={c.altura_m}
                  onChange={n => updateCaixilho(i, { altura_m: n })}
                  className="ml-2 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border" />
              </label>
              <label className="text-xs text-mf-text-secondary">
                Qtd
                <NumberField min={1} unit="un" value={c.qtd}
                  onChange={n => updateCaixilho(i, { qtd: n })}
                  className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border" />
              </label>
              <button type="button" onClick={() => removeCaixilho(i)}
                className="ml-auto text-mf-danger text-xs px-2 py-1 hover:underline">
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCaixilho}
          className="mt-3 text-sm text-mf-yellow font-semibold hover:underline">
          + Adicionar caixilho
        </button>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">
          Tipo de vidro nos caixilhos
        </div>
        <CategoryComboStep
          categoria="vidro"
          unitLabel="m² vidro"
          unitVar="area_caixilhos_m2"
          combos={combos}
          vars={vars}
          selectedSlug={config.combos?.vidro}
          onSelect={slug => onChange({
            ...config,
            combos: { ...(config.combos ?? {}), vidro: slug },
          })}
        />
      </div>
    </div>
  );
}
