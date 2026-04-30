-- Onda 3 — Alias material x fornecedor
-- Cada fornecedor tem seu próprio SKU/descrição para o mesmo material físico.
-- Esta tabela registra esses aliases + o último preço pago naquele fornecedor,
-- para que futuras leituras de NF reconheçam o item automaticamente.

create table material_fornecedor (
  material_id uuid not null references material(id) on delete cascade,
  fornecedor_id uuid not null references fornecedor(id) on delete cascade,
  sku_fornecedor text,
  descricao_fornecedor text,
  ultimo_preco numeric(12,4),
  ultima_compra_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (material_id, fornecedor_id)
);

create index idx_material_fornecedor_lookup
  on material_fornecedor (fornecedor_id, sku_fornecedor)
  where sku_fornecedor is not null;

create index idx_material_fornecedor_material on material_fornecedor (material_id);

create trigger material_fornecedor_updated_at before update on material_fornecedor
  for each row execute function set_updated_at();

-- RLS: admin only
alter table material_fornecedor enable row level security;

create policy "material_fornecedor_admin_all" on material_fornecedor for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');
