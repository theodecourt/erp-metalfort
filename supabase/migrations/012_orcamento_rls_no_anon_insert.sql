-- Migration 012 — Remove RLS de insert anonimo em orcamento
--
-- A policy original `orcamento_public_insert` (migracao 002) permitia que
-- qualquer cliente com a publishable key (anon) inserisse direto em
-- orcamento desde que `tipo = 'publico'`. Isso burlava completamente o
-- backend FastAPI:
--   - bypass do rate limit slowapi (5/min) em /api/public/quote/submit
--   - bypass da validacao EmailStr/Pydantic
--   - bypass do calculo server-side dos totais
--   - permitia disparar o pipeline de email Resend via insert + trigger
--
-- O fluxo legitimo do site publico ja passa por /api/public/quote/submit,
-- que usa a secret key no backend e ignora RLS — entao remover a policy
-- nao quebra nada que esteja em producao.

drop policy if exists "orcamento_public_insert" on orcamento;

-- Sem policy de insert, o RLS bloqueia inserts diretos via anon e
-- authenticated nao-admin/vendedor. O backend continua usando a secret
-- key (service_role) e bypassa RLS normalmente.
