-- Onda 2 — Controle de Estoque
-- Adds: material.estoque_minimo, fornecedor, estoque_movimento, estoque_saldo_v, RLS

-- 1. material: minimum stock threshold (0 = unmonitored)
alter table material
  add column estoque_minimo numeric(12,3) not null default 0
    check (estoque_minimo >= 0);

-- 2. fornecedor
create table fornecedor (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text unique,
  contato_nome text,
  contato_email text,
  contato_fone text,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fornecedor_nome on fornecedor(nome);
create trigger fornecedor_updated_at before update on fornecedor
  for each row execute function set_updated_at();

-- 3. estoque_movimento: append-only ledger
create type estoque_movimento_tipo as enum (
  'compra',
  'ajuste_positivo',
  'saida_obra',
  'ajuste_negativo'
);

create table estoque_movimento (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references material(id),
  tipo estoque_movimento_tipo not null,
  quantidade numeric(12,3) not null check (quantidade > 0),
  preco_unitario numeric(12,2) check (preco_unitario is null or preco_unitario >= 0),
  fornecedor_id uuid references fornecedor(id),
  orcamento_id uuid references orcamento(id),
  destino text,
  nota_fiscal text,
  observacao text,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),

  constraint mov_compra_precisa_preco check (
    tipo <> 'compra' or (preco_unitario is not null and fornecedor_id is not null)
  ),
  constraint mov_saida_precisa_destino check (
    tipo <> 'saida_obra' or destino is not null
  ),
  constraint mov_ajuste_precisa_motivo check (
    tipo not in ('ajuste_positivo','ajuste_negativo') or observacao is not null
  ),
  constraint mov_sem_fornecedor_fora_compra check (
    tipo = 'compra' or fornecedor_id is null
  ),
  constraint mov_sem_orcamento_fora_saida check (
    tipo = 'saida_obra' or orcamento_id is null
  ),
  constraint mov_preco_fora_compra_null check (
    tipo = 'compra' or preco_unitario is null
  )
);

create index idx_estoque_mov_material on estoque_movimento(material_id, created_at desc);
create index idx_estoque_mov_tipo on estoque_movimento(tipo, created_at desc);
create index idx_estoque_mov_orcamento on estoque_movimento(orcamento_id);
create index idx_estoque_mov_fornecedor on estoque_movimento(fornecedor_id, created_at desc);

-- 4. estoque_saldo_v: computed balance per material
create view estoque_saldo_v as
select
  m.id as material_id,
  coalesce(sum(
    case mv.tipo
      when 'compra'            then  mv.quantidade
      when 'ajuste_positivo'   then  mv.quantidade
      when 'saida_obra'        then -mv.quantidade
      when 'ajuste_negativo'   then -mv.quantidade
    end
  ), 0) as saldo
from material m
left join estoque_movimento mv on mv.material_id = m.id
group by m.id;

-- 5. RLS: admin only
alter table fornecedor        enable row level security;
alter table estoque_movimento enable row level security;

create policy "fornecedor_admin_all" on fornecedor for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "estoque_movimento_admin_read" on estoque_movimento for select
  using (current_role_internal() = 'admin');
create policy "estoque_movimento_admin_insert" on estoque_movimento for insert
  with check (current_role_internal() = 'admin');
-- no update/delete policies => blocked by default (append-only)
