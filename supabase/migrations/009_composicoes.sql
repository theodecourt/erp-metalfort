-- Onda 5 — Composições (subsistemas construtivos reutilizáveis)
--
-- Composição = receita técnica de subsistema com lista de insumos + qtds
-- (ex.: "Painel LSF UE 90 X 0,95mm" = 4,5m de perfil + 18 parafusos + 1m² MO).
--
-- Diferente de combo (alternativa que cliente público escolhe por categoria),
-- composição é item técnico que entra automático no produto OU é ligado por
-- decisão do orçamentista (prompt obrigatório no /admin/orcamento/new).
--
-- Modelagem:
--   composicao            : catalogo central das receitas (compartilhado entre produtos)
--   composicao_material   : ingredientes de cada receita (qtd por unidade da composicao)
--   produto_composicao    : vincula produto a composicoes "automaticas" com formula de qtd
--
-- Composições "opcionais" (fundação, projeto) NÃO ficam em produto_composicao —
-- são ativadas/desativadas por orçamento via flags em configuracao_json.

-- 1. Catalogo de composicoes
create type composicao_modo as enum ('automatico', 'opcional');

create table composicao (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,                       -- ex: 'COMP00001' (slug da planilha)
  descricao text not null,
  unidade material_unidade not null,                 -- m, m2, m3, und, vb (verba)...
  modo composicao_modo not null,
  default_ativo boolean not null default false,      -- só relevante se modo='opcional'
  default_valor_override numeric(12,2)               -- pra projeto: valor sugerido editável
    check (default_valor_override is null or default_valor_override >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_composicao_codigo on composicao(codigo) where ativo = true;
create index idx_composicao_modo on composicao(modo) where ativo = true;

create trigger composicao_updated_at before update on composicao
  for each row execute function set_updated_at();

-- 2. Materiais que compoem cada composicao
create table composicao_material (
  composicao_id uuid not null references composicao(id) on delete restrict,
  material_id uuid not null references material(id),
  quantidade numeric(12,4) not null check (quantidade > 0),
  ordem int not null default 0,
  primary key (composicao_id, material_id)
);

create index idx_composicao_material_composicao on composicao_material(composicao_id, ordem);

-- 3. Vincula produto a composicoes "automaticas" com formula de qtd
create table produto_composicao (
  produto_id uuid not null references produto(id) on delete cascade,
  composicao_id uuid not null references composicao(id) on delete restrict,
  formula_json jsonb not null,                       -- formula que retorna qtd da composicao
  incluir_mo boolean not null default true,          -- false = filtra materiais categoria=servico
  ordem int not null default 0,
  primary key (produto_id, composicao_id)
);

create index idx_produto_composicao_produto on produto_composicao(produto_id, ordem);

-- 4. RLS: admin only (composicoes sao itens internos da Metalfort)
alter table composicao enable row level security;
alter table composicao_material enable row level security;
alter table produto_composicao enable row level security;

create policy "composicao_admin_all" on composicao for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "composicao_material_admin_all" on composicao_material for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "produto_composicao_admin_all" on produto_composicao for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- Leitura publica de composicoes ATIVAS para o quote_calculator do fluxo
-- /api/public/quote/* — composicoes precisam ser carregadas no calculo
-- mesmo sem usuario admin logado (cliente publico nao ve, mas o calculo
-- as inclui automaticamente). RLS publica so SELECT, nao INSERT/UPDATE.
create policy "composicao_read_calculo" on composicao for select using (ativo = true);
create policy "composicao_material_read_calculo" on composicao_material for select using (true);
create policy "produto_composicao_read_calculo" on produto_composicao for select using (true);
