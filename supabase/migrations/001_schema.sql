-- Enums
create type material_categoria as enum (
  'estrutura','fechamento','instalacoes','acabamento','esquadria','equipamento','servico'
);
create type material_unidade as enum (
  'kg','m','m2','pc','cx','und','h','bd','rl','sc','ml','ct'
);
create type produto_tipo_base as enum ('3x3','3x6','3x9');
create type produto_finalidade as enum (
  'casa','farmacia','loja','conveniencia','escritorio','quiosque','outro'
);
create type produto_opcao_tipo as enum (
  'tamanho_modulo','qtd_modulos','pe_direito','cor',
  'pacote_acabamento','esquadria','piso','wc','ac'
);
create type bom_tier as enum ('core','addon');
create type orcamento_tipo as enum ('publico','interno');
create type orcamento_tier as enum ('core','full');
create type orcamento_status as enum ('rascunho','enviado','aprovado','perdido');
create type usuario_role as enum ('admin','vendedor');

-- Helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- material
create table material (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nome text not null,
  categoria material_categoria not null,
  unidade material_unidade not null,
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger material_updated_at before update on material
  for each row execute function set_updated_at();

-- produto
create table produto (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  tipo_base produto_tipo_base not null,
  finalidade produto_finalidade not null default 'outro',
  pe_direito_sugerido_m numeric(3,2) not null,
  descricao text,
  imagem_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger produto_updated_at before update on produto
  for each row execute function set_updated_at();

-- produto_opcao
create table produto_opcao (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto(id) on delete cascade,
  tipo produto_opcao_tipo not null,
  label text not null,
  valores_possiveis_json jsonb not null,
  default_json jsonb not null,
  ordem int not null default 0,
  unique (produto_id, tipo)
);

-- produto_bom_regra
create table produto_bom_regra (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto(id) on delete cascade,
  material_id uuid not null references material(id),
  formula_json jsonb not null,
  tier bom_tier not null default 'core',
  categoria material_categoria not null,
  ordem int not null default 0
);

-- usuario_interno
create table usuario_interno (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role usuario_role not null default 'vendedor',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- orcamento
create sequence orcamento_numero_seq;
create table orcamento (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_nome text not null,
  cliente_email text not null,
  cliente_telefone text,
  produto_id uuid not null references produto(id),
  finalidade produto_finalidade not null,
  configuracao_json jsonb not null,
  tipo orcamento_tipo not null,
  tier_aplicado orcamento_tier not null default 'core',
  valor_subtotal numeric(12,2) not null,
  valor_gerenciamento_pct numeric(4,2) not null default 8.0,
  valor_total numeric(12,2) not null,
  criado_por uuid references auth.users(id) on delete set null,
  status orcamento_status not null default 'rascunho',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orcamento_updated_at before update on orcamento
  for each row execute function set_updated_at();

-- orcamento_item (snapshot)
create table orcamento_item (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamento(id) on delete cascade,
  material_id uuid not null references material(id),
  descricao text not null,
  unidade text not null,
  quantidade numeric(12,3) not null,
  preco_unitario numeric(12,2) not null,
  subtotal numeric(14,2) not null,
  tier bom_tier not null,
  categoria text not null,
  ordem int not null default 0
);

create index idx_orcamento_status on orcamento(status);
create index idx_orcamento_tipo on orcamento(tipo);
create index idx_orcamento_created_at on orcamento(created_at desc);
create index idx_orcamento_item_orcamento on orcamento_item(orcamento_id);
create index idx_produto_bom_regra_produto on produto_bom_regra(produto_id);
