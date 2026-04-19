import { useEffect, useMemo, useState } from 'react';
import type { Configuracao } from '../../lib/variables';
import LeverGroup from './LeverGroup';
import PriceBox from './PriceBox';
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

function opcaoByTipo(opcoes: Opcao[], tipo: string) {
  return opcoes.find(o => o.tipo === tipo);
}

function defaultConfig(produto: ProdutoWithOpcoes): Configuracao {
  const o = produto.opcoes;
  return {
    tamanho_modulo: (opcaoByTipo(o, 'tamanho_modulo')?.default_json ?? produto.tipo_base) as any,
    qtd_modulos: opcaoByTipo(o, 'qtd_modulos')?.default_json ?? 1,
    pe_direito_m: opcaoByTipo(o, 'pe_direito')?.default_json ?? produto.pe_direito_sugerido_m,
    cor_externa: opcaoByTipo(o, 'cor')?.default_json ?? 'cinza',
    pacote_acabamento: (opcaoByTipo(o, 'pacote_acabamento')?.default_json ?? 'padrao') as any,
    esquadrias_extras: opcaoByTipo(o, 'esquadria')?.default_json ?? { portas: 0, janelas: 0 },
    piso: (opcaoByTipo(o, 'piso')?.default_json ?? 'vinilico') as any,
    tem_wc: opcaoByTipo(o, 'wc')?.default_json ?? false,
    num_splits: opcaoByTipo(o, 'ac')?.default_json ?? 0,
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

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8">
      <div>
        <LeverGroup label="Tamanho do módulo">
          <div className="flex gap-2">
            {(['3x3','3x6','3x9'] as const).map(t => (
              <button key={t}
                onClick={() => setConfig({ ...config, tamanho_modulo: t, pe_direito_m: ({'3x3':2.4,'3x6':2.7,'3x9':3.0}[t]) })}
                className={`flex-1 py-3 rounded ${config.tamanho_modulo === t ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Quantidade de módulos">
          <NumberField min={1} max={3} value={config.qtd_modulos}
            onChange={n => setConfig({ ...config, qtd_modulos: n })}
            className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"/>
        </LeverGroup>

        <LeverGroup label={`Pé direito — sugerido: ${peSuggested.toLocaleString('pt-BR')} m`}>
          <NumberField min={2.4} max={3.5} step={0.1} unit="m" value={config.pe_direito_m}
            onChange={n => setConfig({ ...config, pe_direito_m: n })}
            className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"/>
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

        <LeverGroup label="Esquadrias extras">
          <div className="flex flex-wrap gap-4 items-start">
            <label className="text-sm text-mf-text-secondary">
              Portas extras:
              <NumberField min={0} max={2} value={config.esquadrias_extras?.portas ?? 0}
                onChange={n => setConfig({ ...config, esquadrias_extras: { ...(config.esquadrias_extras ?? { janelas: 0 }), portas: n, janelas: config.esquadrias_extras?.janelas ?? 0 } })}
                className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
            </label>
            <label className={`text-sm ${(config.esquadrias_extras?.portas ?? 0) > 0 ? 'text-mf-text-secondary' : 'text-mf-text-secondary opacity-50'}`}>
              Tamanho da porta:
              <select
                disabled={(config.esquadrias_extras?.portas ?? 0) === 0}
                value={config.esquadrias_extras?.tamanho_porta ?? '80x210'}
                onChange={e => setConfig({ ...config, esquadrias_extras: { portas: config.esquadrias_extras?.portas ?? 0, janelas: config.esquadrias_extras?.janelas ?? 0, tamanho_porta: e.target.value as any } })}
                className="ml-2 bg-mf-black-soft text-white p-1 rounded border border-mf-border disabled:cursor-not-allowed">
                <option value="60x210">60 × 210 cm (banheiro)</option>
                <option value="70x210">70 × 210 cm (serviço)</option>
                <option value="80x210">80 × 210 cm (padrão)</option>
                <option value="90x210">90 × 210 cm (entrada)</option>
              </select>
            </label>
            <label className="text-sm text-mf-text-secondary">
              Janelas:
              <NumberField min={0} max={4} value={config.esquadrias_extras?.janelas ?? 0}
                onChange={n => setConfig({ ...config, esquadrias_extras: { ...(config.esquadrias_extras ?? { portas: 0 }), portas: config.esquadrias_extras?.portas ?? 0, janelas: n } })}
                className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
            </label>
          </div>
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
      </div>
    </div>
  );
}
