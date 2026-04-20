-- supabase/migrations/006_combos.sql
-- Combos por categoria + templates (selecoes salvas) para o configurador em etapas.

-- pacote_combo: um combo por categoria (ex: "fechamento-premium").
create table pacote_combo (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  categoria text not null check (categoria in (
    'fechamento_ext', 'cobertura', 'forro', 'divisoria', 'divisoria_wc',
    'piso', 'subpiso', 'vidro'
  )),
  nome text not null,
  descricao text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_pacote_combo_categoria on pacote_combo(categoria) where ativo;

-- pacote_combo_material: regras BOM sinteticas por combo.
-- Mesma DSL de formula_json que produto_bom_regra.
create table pacote_combo_material (
  pacote_combo_id uuid not null references pacote_combo(id) on delete cascade,
  material_id uuid not null references material(id),
  formula_json jsonb not null,
  ordem int not null default 0,
  primary key (pacote_combo_id, material_id)
);

-- template_orcamento: "Basico", "Premium" — nomeia uma selecao de combos.
create table template_orcamento (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  ordem int not null default 0
);

-- template_orcamento_selecao: template -> combo por categoria.
create table template_orcamento_selecao (
  template_id uuid not null references template_orcamento(id) on delete cascade,
  categoria text not null check (categoria in (
    'fechamento_ext', 'cobertura', 'forro', 'divisoria', 'divisoria_wc',
    'piso', 'subpiso', 'vidro'
  )),
  pacote_combo_id uuid not null references pacote_combo(id),
  primary key (template_id, categoria)
);

-- RLS admin-only (publicly readable para o site publico eventualmente exibir pacotes).
alter table pacote_combo enable row level security;
alter table pacote_combo_material enable row level security;
alter table template_orcamento enable row level security;
alter table template_orcamento_selecao enable row level security;

-- Leitura publica (anon pode ler combos ativos).
create policy "pacote_combo_public_read" on pacote_combo for select using (true);
create policy "pacote_combo_material_public_read" on pacote_combo_material for select using (true);
create policy "template_orcamento_public_read" on template_orcamento for select using (true);
create policy "template_orcamento_selecao_public_read" on template_orcamento_selecao for select using (true);

-- Escrita apenas admin (mesmo padrao de material/produto_opcao).
create policy "pacote_combo_admin_write" on pacote_combo for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "pacote_combo_material_admin_write" on pacote_combo_material for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "template_orcamento_admin_write" on template_orcamento for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "template_orcamento_selecao_admin_write" on template_orcamento_selecao for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');
