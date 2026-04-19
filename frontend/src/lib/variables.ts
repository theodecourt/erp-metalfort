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
export const JANELA_PADRAO_M2 = 1.20 * 1.00;

export interface Configuracao {
  tamanho_modulo: '3x3' | '3x6' | '3x9';
  qtd_modulos: number;
  pe_direito_m: number;
  cor_externa?: string;
  pacote_acabamento?: 'padrao' | 'premium';
  esquadrias_extras?: {
    portas: number;
    janelas: number;
    tamanhos_portas?: PortaSize[];
  };
  piso?: 'vinilico' | 'ceramico' | 'porcelanato';
  tem_wc?: boolean;
  num_splits?: number;
  // Plant metadata pulled from produto at call time (optional)
  planta_comp_paredes_ext_m?: number;
  planta_comp_paredes_int_m?: number;
  planta_face_conexao_m?: number;
}

const round6 = (n: number) => +n.toFixed(6);

export function derive(config: Configuracao): Record<string, number | boolean> {
  const [larg, comp] = SIZES[config.tamanho_modulo];
  const qtd = config.qtd_modulos;
  const pe = config.pe_direito_m;

  const area_planta = larg * comp * qtd;
  const area_cobertura = area_planta;

  const compExt = config.planta_comp_paredes_ext_m;
  const compInt = config.planta_comp_paredes_int_m;
  const faceConn = config.planta_face_conexao_m;

  const perimetro = compExt !== undefined && faceConn !== undefined
    ? qtd * compExt - (qtd - 1) * 2 * faceConn
    : 2 * (comp * qtd) + 2 * larg;

  const comp_parede_interna = compInt !== undefined
    ? qtd * compInt
    : (qtd - 1) * larg;

  const esq = config.esquadrias_extras ?? { portas: 0, janelas: 0 };
  const portas_extras = esq.portas ?? 0;
  const num_janelas = esq.janelas ?? 0;

  const tamanhos = (esq.tamanhos_portas ?? []).slice(0, portas_extras);
  while (tamanhos.length < portas_extras) tamanhos.push('80x210');

  const area_portas_extras = tamanhos.reduce((acc, s) => acc + PORTA_AREAS[s], 0);
  const area_portas_ext = PORTA_ENTRADA_M2 + area_portas_extras;
  const area_janelas = num_janelas * JANELA_PADRAO_M2;
  const area_aberturas_ext = area_portas_ext + area_janelas;

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
    tem_wc,
    num_splits: config.num_splits ?? 0,
  };
}
