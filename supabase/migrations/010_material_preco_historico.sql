-- Migration 010 — Histórico de preço por material (ciclo "e")
--
-- Captura toda mudança em material.preco_unitario via trigger AFTER UPDATE.
-- Contexto (responsável, motivo, origem) é setado via set_config(..., true)
-- dentro da função RPC `set_preco_material_com_contexto`, que encapsula
-- SET + UPDATE numa única transação (necessário porque supabase-py é cliente
-- REST e não permite SET LOCAL ad-hoc entre chamadas).
--
-- Append-only: nenhuma policy de UPDATE/DELETE no histórico.

-- 1. Tabela
create table material_preco_historico (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references material(id) on delete cascade,
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  preco_anterior numeric(12,2),   -- NULL no snapshot inicial e em criações
  vigente_de timestamptz not null default now(),
  responsavel_id uuid references auth.users(id),   -- NULL = script/sistema
  motivo text,
  origem text not null check (origem in (
    'api_material', 'api_compra', 'import_script', 'manual_sql', 'migration'
  )),
  created_at timestamptz not null default now()
);

create index idx_material_preco_hist_material_data
  on material_preco_historico(material_id, vigente_de desc);

-- 2. RLS: admin read-only. Sem policy de insert/update/delete:
--    o trigger escreve via SECURITY DEFINER (bypassa RLS por design).
alter table material_preco_historico enable row level security;

create policy "hist_admin_read" on material_preco_historico for select
  using (current_role_internal() = 'admin');

-- 3. Trigger function: captura mudanças em material.preco_unitario
create or replace function registra_preco_historico()
returns trigger language plpgsql security definer as $$
declare
  v_responsavel uuid;
  v_motivo text;
  v_origem text;
begin
  if new.preco_unitario is distinct from old.preco_unitario then
    -- contexto setado via set_config('app.x', ..., true) na transação corrente.
    -- current_setting(key, true) retorna '' se não definido (missing_ok=true).
    v_responsavel := nullif(current_setting('app.responsavel_id', true), '')::uuid;
    v_motivo     := nullif(current_setting('app.motivo', true), '');
    v_origem     := coalesce(nullif(current_setting('app.origem', true), ''), 'manual_sql');

    insert into material_preco_historico
      (material_id, preco_unitario, preco_anterior, responsavel_id, motivo, origem)
    values
      (new.id, new.preco_unitario, old.preco_unitario, v_responsavel, v_motivo, v_origem);
  end if;
  return new;
end;
$$;

create trigger material_preco_historico_trg
  after update of preco_unitario on material
  for each row execute function registra_preco_historico();

-- 4. RPC: única forma garantida de propagar contexto via supabase-py.
--    Backend chama via sb.rpc("set_preco_material_com_contexto", {...}).
create or replace function set_preco_material_com_contexto(
  p_material_id uuid,
  p_preco numeric,
  p_responsavel_id uuid default null,
  p_motivo text default null,
  p_origem text default 'api_material'
)
returns void
language plpgsql
security definer
as $$
begin
  -- valida origem (mesmo conjunto do CHECK da tabela, exceto 'manual_sql' e 'migration')
  if p_origem not in ('api_material', 'api_compra', 'import_script') then
    raise exception 'origem invalida para RPC: %', p_origem;
  end if;

  -- set_config(..., true) = LOCAL à transação corrente.
  -- Triggers do UPDATE abaixo rodam na mesma transação e leem esses valores.
  perform set_config('app.responsavel_id', coalesce(p_responsavel_id::text, ''), true);
  perform set_config('app.motivo', coalesce(p_motivo, ''), true);
  perform set_config('app.origem', p_origem, true);

  update material
     set preco_unitario = p_preco
   where id = p_material_id;
end;
$$;

-- 5. Snapshot inicial: 1 entrada por material com vigente_de = updated_at
insert into material_preco_historico
  (material_id, preco_unitario, preco_anterior, vigente_de, responsavel_id, motivo, origem)
select id, preco_unitario, null, updated_at, null, 'snapshot inicial', 'migration'
from material;
