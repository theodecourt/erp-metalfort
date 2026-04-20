export type MovimentoTipo =
  | 'compra'
  | 'ajuste_positivo'
  | 'saida_obra'
  | 'ajuste_negativo';

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
  contato_fone?: string | null;
  observacao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FornecedorInput {
  nome: string;
  cnpj?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
  contato_fone?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export interface SaldoRow {
  material_id: string;
  sku: string;
  nome: string;
  categoria: string;
  unidade: string;
  saldo: string;            // backend sends Decimal as string via JSON
  estoque_minimo: string;
  abaixo_minimo: boolean;
  preco_unitario: string;
}

export interface Movimento {
  id: string;
  material_id: string;
  tipo: MovimentoTipo;
  quantidade: string;
  preco_unitario: string | null;
  fornecedor_id: string | null;
  orcamento_id: string | null;
  destino: string | null;
  nota_fiscal: string | null;
  observacao: string | null;
  criado_por: string;
  created_at: string;
}

export type MovimentoInput =
  | {
      tipo: 'compra';
      material_id: string;
      quantidade: string;
      preco_unitario: string;
      fornecedor_id: string;
      nota_fiscal?: string | null;
      observacao?: string | null;
    }
  | {
      tipo: 'saida_obra';
      material_id: string;
      quantidade: string;
      orcamento_id?: string | null;
      destino: string;
      observacao?: string | null;
    }
  | {
      tipo: 'ajuste_positivo' | 'ajuste_negativo';
      material_id: string;
      quantidade: string;
      observacao: string;
    };

export interface FabricacaoLinha {
  material_id: string;
  sku: string;
  nome: string;
  unidade: string;
  necessario: string;
  saldo_atual: string;
  falta: string;
  status: 'suficiente' | 'faltante';
  preco_unitario: string;
  custo_reposicao_linha: string;
}

export interface FabricacaoAnalise {
  orcamento_id: string;
  orcamento_numero: string;
  cliente_nome: string;
  produto_nome: string;
  itens: FabricacaoLinha[];
  totais: {
    itens_total: number;
    itens_faltantes: number;
    custo_reposicao: string;
  };
}

// ----- API calls -----

export type Fetcher = <T>(path: string, init?: RequestInit) => Promise<T>;

export const estoqueApi = {
  listSaldo: (
    fetchApi: Fetcher,
    opts: { abaixoMinimo?: boolean; q?: string } = {},
  ) => {
    const p = new URLSearchParams();
    if (opts.abaixoMinimo) p.set('abaixo_minimo', 'true');
    if (opts.q) p.set('q', opts.q);
    const qs = p.toString();
    return fetchApi<SaldoRow[]>(`/api/estoque/saldo${qs ? `?${qs}` : ''}`);
  },

  listMovimentos: (
    fetchApi: Fetcher,
    filters: Partial<{
      material_id: string;
      tipo: MovimentoTipo;
      fornecedor_id: string;
      orcamento_id: string;
      data_inicio: string;
      data_fim: string;
      limit: number;
      offset: number;
    }> = {},
  ) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
    }
    const qs = p.toString();
    return fetchApi<Movimento[]>(`/api/estoque/movimento${qs ? `?${qs}` : ''}`);
  },

  createMovimento: (fetchApi: Fetcher, body: MovimentoInput) =>
    fetchApi<Movimento>('/api/estoque/movimento', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  analiseFabricacao: (fetchApi: Fetcher, orcamentoId: string) =>
    fetchApi<FabricacaoAnalise>(`/api/estoque/fabricacao/${orcamentoId}`),
};

export const fornecedorApi = {
  list: (fetchApi: Fetcher, opts: { ativo?: boolean; q?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.ativo !== undefined) p.set('ativo', String(opts.ativo));
    if (opts.q) p.set('q', opts.q);
    const qs = p.toString();
    return fetchApi<Fornecedor[]>(`/api/fornecedor${qs ? `?${qs}` : ''}`);
  },

  create: (fetchApi: Fetcher, body: FornecedorInput) =>
    fetchApi<Fornecedor>('/api/fornecedor', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (fetchApi: Fetcher, id: string, body: Partial<FornecedorInput>) =>
    fetchApi<Fornecedor>(`/api/fornecedor/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivate: (fetchApi: Fetcher, id: string) =>
    fetchApi<{ ok: boolean }>(`/api/fornecedor/${id}`, {
      method: 'DELETE',
    }),
};
