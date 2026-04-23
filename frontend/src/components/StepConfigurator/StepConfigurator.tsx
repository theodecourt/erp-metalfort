import { useEffect, useMemo, useRef, useState } from 'react';
import StepSection from './StepSection';
import EstruturaStep from './steps/EstruturaStep';
import CategoryComboStep from './steps/CategoryComboStep';
import EsquadriasStep from './steps/EsquadriasStep';
import WcStep from './steps/WcStep';
import AcabamentoStep from './steps/AcabamentoStep';
import ExtrasStep from './steps/ExtrasStep';
import PriceBar from './PriceBar';
import { derive, type Configuracao, type TemplateSlug } from '../../lib/variables';
import { fetchCombos, fetchTemplates, type PacoteCombo, type TemplateOrcamento } from '../../lib/combos';
import { apiFetch } from '../../lib/api';

interface ProdutoInput {
  id: string;
  slug: string;
  nome: string;
  tipo_base: '3x3' | '3x6' | '3x9';
  pe_direito_sugerido_m: number;
  opcoes: any[];
}

interface Props {
  produto: ProdutoInput;
  initialConfig?: Configuracao;         // seed de rascunho salvo (localStorage)
  initialCombos?: PacoteCombo[];        // para tests; em producao, fetched from API
  initialTemplates?: TemplateOrcamento[]; // idem
  onConfigChange: (c: Configuracao) => void;
  onQuoteChange: (q: { subtotal: number; total: number; itemCount: number }) => void;
  calculate?: (body: unknown) => Promise<any>;
}

const MODULO_SIZES = { '3x3': [3, 3], '3x6': [3, 6], '3x9': [3, 9] } as const;

function defaultConfig(produto: ProdutoInput): Configuracao {
  const [larg, comp] = MODULO_SIZES[produto.tipo_base];
  return {
    tamanho_modulo: produto.tipo_base,
    qtd_modulos: 1,
    pe_direito_m: produto.pe_direito_sugerido_m,
    acabamento_ext: 'textura',
    cor_ext: 'branco',
    piso: 'vinilico',
    piso_cor: 'carvalho claro',
    esquadrias_extras: { portas: 0, tamanhos_portas: [], caixilhos: [] },
    tem_wc: false,
    num_splits: 0,
    comp_paredes_ext_m: 2 * larg + 2 * comp,
    comp_paredes_int_m: 0,
    combos: {},
    template_aplicado: 'basico',
  };
}

function applyTemplateSelecoes(
  base: Configuracao,
  template: TemplateOrcamento | undefined,
  slug: TemplateSlug,
): Configuracao {
  const selecoes = template?.selecoes ?? {};
  const combos = { ...selecoes };
  if (base.tem_wc) combos.divisoria_wc = 'divisoria-umida';
  else delete combos.divisoria_wc;
  if (slug === 'personalizado') {
    return {
      ...base,
      template_aplicado: 'personalizado',
      combos: base.tem_wc ? { divisoria_wc: 'divisoria-umida' } : {},
    };
  }
  return { ...base, template_aplicado: slug, combos };
}

export default function StepConfigurator({
  produto, initialConfig, initialCombos, initialTemplates, onConfigChange, onQuoteChange, calculate,
}: Props) {
  const [combos, setCombos] = useState<PacoteCombo[]>(initialCombos ?? []);
  const [templates, setTemplates] = useState<TemplateOrcamento[]>(initialTemplates ?? []);
  const [config, setConfig] = useState<Configuracao>(() => initialConfig ?? defaultConfig(produto));
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ subtotal: number; total: number; gerenciamento_pct: number; itens: any[] }>({
    subtotal: 0, total: 0, gerenciamento_pct: 8, itens: [],
  });

  useEffect(() => {
    if (initialCombos && initialTemplates) return;
    (async () => {
      try {
        const [cs, ts] = await Promise.all([fetchCombos(), fetchTemplates()]);
        setCombos(cs);
        setTemplates(ts);
      } catch { /* ignored in UI */ }
    })();
  }, []);

  const appliedInitialTemplate = useRef(!!initialConfig);
  useEffect(() => {
    if (appliedInitialTemplate.current || templates.length === 0) return;
    const basico = templates.find(t => t.slug === 'basico');
    setConfig(prev => applyTemplateSelecoes(prev, basico, 'basico'));
    appliedInitialTemplate.current = true;
  }, [templates]);

  const defaultCalculate = (body: unknown) =>
    apiFetch<any>('/api/public/quote/calculate', { method: 'POST', body: JSON.stringify(body) });

  useEffect(() => {
    onConfigChange(config);
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      (calculate ?? defaultCalculate)({ produto_id: produto.id, configuracao: config })
        .then((r: any) => {
          if (cancelled) return;
          setQuote({ subtotal: r.subtotal, total: r.total, gerenciamento_pct: r.gerenciamento_pct, itens: r.itens });
          onQuoteChange({ subtotal: r.subtotal, total: r.total, itemCount: r.itens.length });
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(id); };
  }, [JSON.stringify(config), produto.id]);

  const vars = useMemo(() => derive(config), [JSON.stringify(config)]);

  function setComboForCategoria(cat: keyof NonNullable<Configuracao['combos']>, slug: string) {
    setConfig(prev => ({
      ...prev,
      combos: { ...(prev.combos ?? {}), [cat]: slug },
    }));
  }

  const peSuggested = ({ '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 } as const)[config.tamanho_modulo];

  return (
    <div>
      <main className="min-w-0">
          <StepSection id="estrutura" number={1} title="Estrutura & geometria" phaseEnd>
            <EstruturaStep config={config} onChange={setConfig} peSuggested={peSuggested} />
          </StepSection>

          <StepSection id="fechamento_ext" number={2} title="Fechamento de parede externa">
            <CategoryComboStep
              categoria="fechamento_ext" unitLabel="m² parede" unitVar="area_fechamento_ext_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.fechamento_ext}
              onSelect={slug => setComboForCategoria('fechamento_ext', slug)}
            />
          </StepSection>

          <StepSection id="cobertura" number={3} title="Cobertura">
            <CategoryComboStep
              categoria="cobertura" unitLabel="m² cobertura" unitVar="area_cobertura_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.cobertura}
              onSelect={slug => setComboForCategoria('cobertura', slug)}
            />
          </StepSection>

          <StepSection id="forro" number={4} title="Forro interno">
            <CategoryComboStep
              categoria="forro" unitLabel="m² piso" unitVar="area_planta_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.forro}
              onSelect={slug => setComboForCategoria('forro', slug)}
            />
          </StepSection>

          <StepSection id="divisoria" number={5} title="Divisórias internas" phaseEnd>
            <CategoryComboStep
              categoria="divisoria" unitLabel="m² parede" unitVar="area_parede_interna_nao_wc_m2"
              combos={combos} vars={vars}
              selectedSlug={config.combos?.divisoria}
              onSelect={slug => setComboForCategoria('divisoria', slug)}
            />
          </StepSection>

          <StepSection id="piso" number={6} title="Piso e subpiso">
            <div className="mb-6">
              <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Piso</div>
              <CategoryComboStep
                categoria="piso" unitLabel="m² piso" unitVar="area_planta_m2"
                combos={combos} vars={vars}
                selectedSlug={config.combos?.piso}
                onSelect={slug => setComboForCategoria('piso', slug)}
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-mf-text-secondary mb-2">Subpiso</div>
              <CategoryComboStep
                categoria="subpiso" unitLabel="m² piso" unitVar="area_planta_m2"
                combos={combos} vars={vars}
                selectedSlug={config.combos?.subpiso}
                onSelect={slug => setComboForCategoria('subpiso', slug)}
              />
            </div>
          </StepSection>

          <StepSection id="esquadrias" number={7} title="Esquadrias (portas e caixilhos)">
            <EsquadriasStep config={config} onChange={setConfig} combos={combos} vars={vars} />
          </StepSection>

          <StepSection id="wc" number={8} title="WC interno" phaseEnd>
            <WcStep config={config} onChange={setConfig} />
          </StepSection>

          <StepSection id="acabamento" number={9} title="Acabamento de superfície & cores">
            <AcabamentoStep config={config} onChange={setConfig} />
          </StepSection>

          <StepSection id="extras" number={10} title="Extras & instalações">
            <ExtrasStep config={config} onChange={setConfig} />
          </StepSection>
      </main>
      <PriceBar
        subtotal={quote.subtotal}
        total={quote.total}
        gerenciamentoPct={quote.gerenciamento_pct}
        itemCount={quote.itens.length}
        loading={loading}
      />
    </div>
  );
}
