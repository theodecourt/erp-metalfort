-- Enable RLS on all tables
alter table material enable row level security;
alter table produto enable row level security;
alter table produto_opcao enable row level security;
alter table produto_bom_regra enable row level security;
alter table orcamento enable row level security;
alter table orcamento_item enable row level security;
alter table usuario_interno enable row level security;

-- Helper: returns role of current user (null if not logged in)
create or replace function current_role_internal() returns usuario_role
language sql stable as $$
  select role from usuario_interno where id = auth.uid() and ativo = true
$$;

-- material: public read, admin write
create policy "material_public_read" on material for select using (true);
create policy "material_admin_write" on material for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- produto: public read, admin write
create policy "produto_public_read" on produto for select using (true);
create policy "produto_admin_write" on produto for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- produto_opcao: public read, admin write
create policy "produto_opcao_public_read" on produto_opcao for select using (true);
create policy "produto_opcao_admin_write" on produto_opcao for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- produto_bom_regra: authenticated read only (price sensitivity), admin write
create policy "produto_bom_regra_auth_read" on produto_bom_regra for select
  using (auth.role() = 'authenticated');
create policy "produto_bom_regra_admin_write" on produto_bom_regra for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- orcamento:
-- - anon can insert (lead capture) with restricted columns enforced by API
-- - authenticated vendedor/admin read all
-- - no public select
create policy "orcamento_public_insert" on orcamento for insert
  with check (tipo = 'publico');
create policy "orcamento_internal_read" on orcamento for select
  using (current_role_internal() in ('admin','vendedor'));
create policy "orcamento_internal_write" on orcamento for update
  using (current_role_internal() in ('admin','vendedor'))
  with check (current_role_internal() in ('admin','vendedor'));
create policy "orcamento_admin_delete" on orcamento for delete
  using (current_role_internal() = 'admin');

-- orcamento_item: no direct client access; server uses service role
-- (policies deny all by default after enabling RLS)

-- usuario_interno: self-read, admin all
create policy "usuario_interno_self_read" on usuario_interno for select
  using (id = auth.uid());
create policy "usuario_interno_admin_all" on usuario_interno for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');
