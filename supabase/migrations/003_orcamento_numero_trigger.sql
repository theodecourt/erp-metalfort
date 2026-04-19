-- Auto-generate orcamento.numero on INSERT when not provided.
-- Format: ORC-<year>-<4-digit seq>. Built-in nextval() is not exposed via
-- PostgREST RPC, so the API layer can no longer call it directly.

create or replace function set_orcamento_numero() returns trigger as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'ORC-' || extract(year from now())::int || '-' ||
                  lpad(nextval('orcamento_numero_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger orcamento_numero_before_insert
  before insert on orcamento
  for each row execute function set_orcamento_numero();
