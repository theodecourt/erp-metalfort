const SIZES: Record<string, [number, number]> = {
  '3x3': [3, 3],
  '3x6': [3, 6],
  '3x9': [3, 9],
};

export interface Configuracao {
  tamanho_modulo: '3x3' | '3x6' | '3x9';
  qtd_modulos: number;
  pe_direito_m: number;
  cor_externa?: string;
  pacote_acabamento?: 'padrao' | 'premium';
  esquadrias_extras?: { portas: number; janelas: number };
  piso?: 'vinilico' | 'ceramico' | 'porcelanato';
  tem_wc?: boolean;
  num_splits?: number;
}

export function derive(config: Configuracao): Record<string, number | boolean> {
  const [larg, comp] = SIZES[config.tamanho_modulo];
  const qtd = config.qtd_modulos;
  const pe = config.pe_direito_m;
  const area_planta = larg * comp * qtd;
  const perimetro = 2 * (comp * qtd) + 2 * larg;
  const area_fechamento_ext = +(perimetro * pe).toFixed(6);
  const area_cobertura = area_planta;
  const comp_parede_interna = (qtd - 1) * larg;
  const area_parede_interna = +(comp_parede_interna * pe * 2).toFixed(6);
  const esq = config.esquadrias_extras ?? { portas: 0, janelas: 0 };

  return {
    area_planta_m2: area_planta,
    perimetro_externo_m: perimetro,
    area_fechamento_ext_m2: area_fechamento_ext,
    area_cobertura_m2: area_cobertura,
    comp_parede_interna_m: comp_parede_interna,
    area_parede_interna_m2: area_parede_interna,
    num_portas_ext: 1 + (esq.portas ?? 0),
    num_janelas: esq.janelas ?? 0,
    tem_wc: !!config.tem_wc,
    num_splits: config.num_splits ?? 0,
  };
}
