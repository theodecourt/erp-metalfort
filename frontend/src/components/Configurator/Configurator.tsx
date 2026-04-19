import { useEffect, useMemo, useState } from 'react';
import type { Caixilho, Configuracao } from '../../lib/variables';
import LeverGroup from './LeverGroup';
import PriceBox from './PriceBox';
import AreasPanel from './AreasPanel';
import NumberField from '../NumberField/NumberField';
import { apiFetch } from '../../lib/api';

interface Opcao {
  tipo: string;
  label: string;
  valores_possiveis_json: any;
  default_json: any;
  ordem: number;
}

interface ProdutoWithOpcoes {
  id: string;
  slug: string;
  nome: string;
  tipo_base: '3x3' | '3x6' | '3x9';
  pe_direito_sugerido_m: number;
  opcoes: Opcao[];
}

const MODULO_SIZES = { '3x3': [3, 3], '3x6': [3, 6], '3x9': [3, 9] } as const;

function perimetroSingle(tipo: '3x3' | '3x6' | '3x9'): number {
  const [larg, comp] = MODULO_SIZES[tipo];
  return 2 * larg + 2 * comp;
}

function opcaoByTipo(opcoes: Opcao[], tipo: string) {
  return opcoes.find(o => o.tipo === tipo);
}

function defaultConfig(produto: ProdutoWithOpcoes): Configuracao {
  const o = produto.opcoes;
  const tipo = (opcaoByTipo(o, 'tamanho_modulo')?.default_json ?? produto.tipo_base) as '3x3' | '3x6' | '3x9';
  return {
    tamanho_modulo: tipo,
    qtd_modulos: opcaoByTipo(o, 'qtd_modulos')?.default_json ?? 1,
    pe_direito_m: opcaoByTipo(o, 'pe_direito')?.default_json ?? produto.pe_direito_sugerido_m,
    cor_externa: opcaoByTipo(o, 'cor')?.default_json ?? 'cinza',
    pacote_acabamento: (opcaoByTipo(o, 'pacote_acabamento')?.default_json ?? 'padrao') as any,
    esquadrias_extras: { portas: 0, tamanhos_portas: [], caixilhos: [] },
    piso: (opcaoByTipo(o, 'piso')?.default_json ?? 'vinilico') as any,
    tem_wc: opcaoByTipo(o, 'wc')?.default_json ?? false,
    num_splits: opcaoByTipo(o, 'ac')?.default_json ?? 0,
    comp_paredes_ext_m: perimetroSingle(tipo),
    comp_paredes_int_m: 0,
  };
}

export default function Configurator({
  produto, onConfigChange, onQuoteChange,
}: {
  produto: ProdutoWithOpcoes;
  onConfigChange: (c: Configuracao) => void;
  onQuoteChange: (q: { subtotal: number; total: number; itemCount: number }) => void;
}) {
  const [config, setConfig] = useState<Configuracao>(() => defaultConfig(produto));
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ subtotal: number; total: number; gerenciamento_pct: number; itens: any[] }>({
    subtotal: 0, total: 0, gerenciamento_pct: 8, itens: [],
  });

  useEffect(() => {
    onConfigChange(config);
    let cancelled = false;
    setLoading(true);
    apiFetch<any>('/api/public/quote/calculate', {
      method: 'POST',
      body: JSON.stringify({ produto_id: produto.id, configuracao: config }),
    })
      .then(r => { if (!cancelled) { setQuote(r); onQuoteChange({ subtotal: r.subtotal, total: r.total, itemCount: r.itens.length }); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [JSON.stringify(config)]);

  const peSuggested = useMemo(() => {
    return { '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 }[config.tamanho_modulo];
  }, [config.tamanho_modulo]);

  function changeTamanho(t: '3x3' | '3x6' | '3x9') {
    setConfig(prev => ({
      ...prev,
      tamanho_modulo: t,
      pe_direito_m: ({ '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 } as const)[t],
      // Single-module perimeter is determined by tamanho. Multi-module is
      // whatever the user has entered — don't touch it here.
      comp_paredes_ext_m: prev.qtd_modulos === 1 ? perimetroSingle(t) : prev.comp_paredes_ext_m,
    }));
  }

  function changeQtd(n: number) {
    setConfig(prev => {
      if (n === 1) {
        return { ...prev, qtd_modulos: n, comp_paredes_ext_m: perimetroSingle(prev.tamanho_modulo) };
      }
      if (prev.qtd_modulos === 1) {
        // Going from single to multi: soma de dois módulos individuais não serve,
        // usuário precisa informar o perímetro real do conjunto.
        return { ...prev, qtd_modulos: n, comp_paredes_ext_m: 0 };
      }
      return { ...prev, qtd_modulos: n };
    });
  }

  const caixilhos: Caixilho[] = config.esquadrias_extras?.caixilhos ?? [];
  const portas = config.esquadrias_extras?.portas ?? 0;

  function updateEsq(patch: Partial<NonNullable<Configuracao['esquadrias_extras']>>) {
    setConfig({
      ...config,
      esquadrias_extras: {
        portas,
        tamanhos_portas: config.esquadrias_extras?.tamanhos_portas ?? [],
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
    <div className="grid md:grid-cols-[1fr_320px] gap-8">
      <div>
        <LeverGroup label="Tamanho do módulo">
          <div className="flex gap-2">
            {(['3x3','3x6','3x9'] as const).map(t => (
              <button key={t}
                onClick={() => changeTamanho(t)}
                className={`flex-1 py-3 rounded ${config.tamanho_modulo === t ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Quantidade de módulos">
          <NumberField min={1} max={3} value={config.qtd_modulos}
            onChange={changeQtd}
            className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"/>
        </LeverGroup>

        <LeverGroup label={`Pé direito — sugerido: ${peSuggested.toLocaleString('pt-BR')} m`}>
          <NumberField min={2.4} max={3.5} step={0.1} unit="m" value={config.pe_direito_m}
            onChange={n => setConfig({ ...config, pe_direito_m: n })}
            className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"/>
        </LeverGroup>

        <LeverGroup label="Paredes (metros lineares)">
          <div className="flex flex-wrap gap-4">
            <label className="text-sm text-mf-text-secondary">
              Externas:
              <NumberField min={0} step={0.1} unit="m" value={config.comp_paredes_ext_m ?? 0}
                onChange={n => setConfig({ ...config, comp_paredes_ext_m: n })}
                className="ml-2 w-24 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
            </label>
            <label className="text-sm text-mf-text-secondary">
              Internas:
              <NumberField min={0} step={0.1} unit="m" value={config.comp_paredes_int_m ?? 0}
                onChange={n => setConfig({ ...config, comp_paredes_int_m: n })}
                className="ml-2 w-24 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
            </label>
          </div>
          {config.qtd_modulos > 1 && !config.comp_paredes_ext_m && (
            <p className="mt-2 text-xs text-mf-yellow">
              Informe o perímetro externo total — depende da face de conexão entre os {config.qtd_modulos} módulos.
            </p>
          )}
        </LeverGroup>

        <LeverGroup label="Cor externa">
          <div className="flex gap-2">
            {['branco','cinza','preto','grafite'].map(c => (
              <button key={c} onClick={() => setConfig({ ...config, cor_externa: c })}
                className={`px-4 py-2 rounded ${config.cor_externa === c ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {c}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Pacote de acabamento">
          <div className="flex gap-2">
            {(['padrao','premium'] as const).map(p => (
              <button key={p} onClick={() => setConfig({ ...config, pacote_acabamento: p })}
                className={`px-4 py-2 rounded ${config.pacote_acabamento === p ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Portas opacas extras">
          <label className="text-sm text-mf-text-secondary">
            Quantidade:
            <NumberField min={0} value={portas}
              onChange={n => {
                const prev = config.esquadrias_extras?.tamanhos_portas ?? [];
                const next = n > prev.length
                  ? [...prev, ...Array(n - prev.length).fill('80x210' as const)]
                  : prev.slice(0, n);
                updateEsq({ portas: n, tamanhos_portas: next });
              }}
              className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
          </label>
          {portas > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {Array.from({ length: portas }).map((_, i) => {
                const current = config.esquadrias_extras?.tamanhos_portas?.[i] ?? '80x210';
                return (
                  <label key={i} className="text-sm text-mf-text-secondary">
                    {portas === 1 ? 'Tamanho da porta:' : `Porta ${i + 1}:`}
                    <select
                      value={current}
                      onChange={e => {
                        const arr = [...(config.esquadrias_extras?.tamanhos_portas ?? Array(portas).fill('80x210'))];
                        arr[i] = e.target.value as any;
                        updateEsq({ tamanhos_portas: arr });
                      }}
                      className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border">
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
        </LeverGroup>

        <LeverGroup label="Caixilhos (janelas e portas de vidro)">
          {caixilhos.length === 0 && (
            <p className="text-xs text-mf-text-secondary">Nenhum caixilho. Adicione janelas ou portas de vidro abaixo.</p>
          )}
          <div className="flex flex-col gap-2">
            {caixilhos.map((c, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 bg-mf-black-soft/40 border border-mf-border rounded p-2">
                <label className="text-xs text-mf-text-secondary">
                  Tipo
                  <select
                    value={c.tipo}
                    onChange={e => updateCaixilho(i, { tipo: e.target.value as any })}
                    className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border">
                    <option value="janela">Janela</option>
                    <option value="porta_vidro">Porta de vidro</option>
                  </select>
                </label>
                <label className="text-xs text-mf-text-secondary">
                  Largura
                  <NumberField min={0.1} step={0.1} unit="m" value={c.largura_m}
                    onChange={n => updateCaixilho(i, { largura_m: n })}
                    className="ml-2 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
                </label>
                <label className="text-xs text-mf-text-secondary">
                  Altura
                  <NumberField min={0.1} step={0.1} unit="m" value={c.altura_m}
                    onChange={n => updateCaixilho(i, { altura_m: n })}
                    className="ml-2 w-20 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
                </label>
                <label className="text-xs text-mf-text-secondary">
                  Qtd
                  <NumberField min={1} value={c.qtd}
                    onChange={n => updateCaixilho(i, { qtd: n })}
                    className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
                </label>
                <button type="button"
                  onClick={() => removeCaixilho(i)}
                  className="ml-auto text-mf-danger text-xs px-2 py-1 hover:underline">
                  Remover
                </button>
              </div>
            ))}
          </div>
          <button type="button"
            onClick={addCaixilho}
            className="mt-3 text-sm text-mf-yellow font-semibold hover:underline">
            + Adicionar caixilho
          </button>
        </LeverGroup>

        <LeverGroup label="Piso">
          <div className="flex gap-2">
            {(['vinilico','ceramico','porcelanato'] as const).map(p => (
              <button key={p} onClick={() => setConfig({ ...config, piso: p })}
                className={`px-4 py-2 rounded ${config.piso === p ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="WC interno">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!config.tem_wc}
              onChange={e => setConfig({ ...config, tem_wc: e.target.checked })}/>
            <span className="text-white">Incluir WC</span>
          </label>
        </LeverGroup>
      </div>

      <div className="space-y-4">
        <PriceBox
          subtotal={quote.subtotal}
          total={quote.total}
          gerenciamentoPct={quote.gerenciamento_pct}
          itemCount={quote.itens.length}
          loading={loading}
        />
        <AreasPanel config={config} />
      </div>
    </div>
  );
}
