const SIZES: Record<string, [number, number]> = {
  '3x3': [3, 3],
  '3x6': [3, 6],
  '3x9': [3, 9],
};

type PortaSize = '60x210' | '70x210' | '80x210' | '90x210';

const PORTA_AREAS: Record<PortaSize, number> = {
  '60x210': 0.60 * 2.10,
  '70x210': 0.70 * 2.10,
  '80x210': 0.80 * 2.10,
  '90x210': 0.90 * 2.10,
};
export const PORTA_ENTRADA_M2 = PORTA_AREAS['90x210'];
export const PORTA_WC_M2 = PORTA_AREAS['70x210'];

export type CaixilhoTipo = 'janela' | 'porta_vidro';

export interface Caixilho {
  tipo: CaixilhoTipo;
  largura_m: number;
  altura_m: number;
  qtd: number;
}

export interface ItemPersonalizado {
  material_id: string;
  qtd: number;
}

export type Piso = 'vinilico' | 'ceramico' | 'porcelanato';
export type AcabamentoExt = 'textura' | 'pintura' | 'cimenticia';

// Paletas — cada material tem sua própria lista de cores possíveis.
// Futuramente isso pode vir da tabela material (cores_disponiveis_json).
export const PISO_CORES: Record<Piso, string[]> = {
  vinilico: ['carvalho claro', 'carvalho escuro', 'cinza', 'bege'],
  ceramico: ['branco', 'bege', 'cinza claro', 'grafite'],
  porcelanato: ['branco polido', 'cinza', 'marmorizado', 'preto absoluto'],
};

export const ACABAMENTO_EXT_CORES: Record<AcabamentoExt, string[]> = {
  textura: ['branco', 'cinza claro', 'cinza médio', 'grafite'],
  pintura: ['branco', 'cinza', 'bege', 'preto', 'amarelo metalfort'],
  cimenticia: ['cinza natural', 'cinza claro'],
};

export interface Configuracao {
  tamanho_modulo: '3x3' | '3x6' | '3x9';
  qtd_modulos: number;
  pe_direito_m: number;
  acabamento_ext?: AcabamentoExt;
  cor_ext?: string;
  pacote_acabamento?: 'padrao' | 'premium' | 'personalizado';
  itens_personalizados?: ItemPersonalizado[];
  esquadrias_extras?: {
    portas: number;
    tamanhos_portas?: PortaSize[];
    caixilhos?: Caixilho[];
  };
  piso?: Piso;
  piso_cor?: string;
  tem_wc?: boolean;
  wc_itens?: {
    pia_parede?: boolean;
    pia_bancada?: boolean;
    privada?: boolean;
    chuveiro?: boolean;
  };
  num_splits?: number;
  comp_paredes_ext_m?: number;
  comp_paredes_int_m?: number;
}

const round6 = (n: number) => +n.toFixed(6);

export function derive(config: Configuracao): Record<string, number | boolean> {
  const [larg, comp] = SIZES[config.tamanho_modulo];
  const qtd = config.qtd_modulos;
  const pe = config.pe_direito_m;

  const area_planta = larg * comp * qtd;
  const area_cobertura = area_planta;

  const perimetro = config.comp_paredes_ext_m !== undefined
    ? config.comp_paredes_ext_m
    : 2 * (comp * qtd) + 2 * larg;

  const comp_parede_interna = config.comp_paredes_int_m !== undefined
    ? config.comp_paredes_int_m
    : (qtd - 1) * larg;

  const esq = config.esquadrias_extras ?? { portas: 0 };
  const portas_extras = esq.portas ?? 0;

  const tamanhos = (esq.tamanhos_portas ?? []).slice(0, portas_extras);
  while (tamanhos.length < portas_extras) tamanhos.push('80x210');

  const area_portas_extras = tamanhos.reduce((acc, s) => acc + PORTA_AREAS[s], 0);
  const area_portas_ext = PORTA_ENTRADA_M2 + area_portas_extras;

  const caixilhos = esq.caixilhos ?? [];
  let area_caixilhos = 0;
  let num_janelas = 0;
  let num_portas_vidro = 0;
  for (const c of caixilhos) {
    area_caixilhos += c.largura_m * c.altura_m * c.qtd;
    if (c.tipo === 'janela') num_janelas += c.qtd;
    else if (c.tipo === 'porta_vidro') num_portas_vidro += c.qtd;
  }

  const area_aberturas_ext = area_portas_ext + area_caixilhos;

  const area_fechamento_ext_bruta = perimetro * pe;
  const area_fechamento_ext = Math.max(0, area_fechamento_ext_bruta - area_aberturas_ext);

  const tem_wc = !!config.tem_wc;
  const area_porta_wc = tem_wc ? PORTA_WC_M2 : 0;
  const area_parede_interna_bruta = comp_parede_interna * pe * 2;
  const area_parede_interna = Math.max(0, area_parede_interna_bruta - 2 * area_porta_wc);

  return {
    area_planta_m2: area_planta,
    perimetro_externo_m: perimetro,
    area_fechamento_ext_bruta_m2: round6(area_fechamento_ext_bruta),
    area_fechamento_ext_m2: round6(area_fechamento_ext),
    area_aberturas_ext_m2: round6(area_aberturas_ext),
    area_cobertura_m2: area_cobertura,
    comp_parede_interna_m: comp_parede_interna,
    area_parede_interna_bruta_m2: round6(area_parede_interna_bruta),
    area_parede_interna_m2: round6(area_parede_interna),
    num_portas_ext: 1 + portas_extras,
    num_janelas,
    num_portas_vidro,
    tem_wc,
    num_splits: config.num_splits ?? 0,
  };
}
