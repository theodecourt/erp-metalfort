-- Migration 011 — Campo de transição visual para renomeação de catálogo
--
-- Adiciona coluna `nome_origem_planilha` para preservar o nome original
-- da planilha do Samuel quando aplicarmos renames cosméticos (ex.: itens
-- de MO ganham nomes de tier explícitos). UI renderiza esse campo abaixo
-- do nome principal em fonte menor enquanto a equipe internaliza a nova
-- nomenclatura. Sem prazo de aposentadoria — quando virar dispensável,
-- basta UPDATE ... = NULL.
--
-- Renames aplicados em 7 itens de MO (CF006SF001-007) usando convenção
-- T1/T2/T3/T4 baseada em valor R$/m² + trecho descritivo de uso. Tiers:
--   T1 = R$40/m² (básico — painel simples)
--   T2 = R$55/m² (médio — painel 2UE; CF006SF004 é órfão, sem composição)
--   T3 = R$60/m² (complexo — painel duplo, treliça, cobertura, fechamento)
--   T4 = R$75/m² (forro)
--
-- CF006SF008 (R$700/m² global) FICA FORA desta rodada. R$700/m² não é tier
-- de MO no mesmo sentido (que são por m²) — pode ser MO global de serviço
-- específico. Documentado em composicoes-pendentes-revisao.md para
-- investigação com Samuel.

begin;

-- 1. Coluna nova (idempotente)
alter table material
  add column if not exists nome_origem_planilha text;

comment on column material.nome_origem_planilha is
  'Nome original da planilha do Samuel, preservado quando catalogo for renomeado por convencao interna. NULL = item nao renomeado. Editavel apenas via SQL/script — sem endpoint na UI.';

-- 2. Renomear MO CF006SF001-007.
--    WHERE filtra pelo nome antigo exato → idempotente: se a migration rodar
--    2x, a segunda passada não encontra match e não faz nada.

update material set
  nome = 'MO LSF T1 — painel simples (R$40/m²)',
  nome_origem_planilha = 'MÃO DE OBRA PARA MONTAR 1M2 DE PAINEL SIMPLES UE 90 X 0,95 MM  - MALHA 400 E 600 MM'
where sku = 'CF006SF001'
  and nome = 'MÃO DE OBRA PARA MONTAR 1M2 DE PAINEL SIMPLES UE 90 X 0,95 MM  - MALHA 400 E 600 MM';

update material set
  nome = 'MO LSF T1 — painel simples (R$40/m²)',
  nome_origem_planilha = 'MÃO DE OBRA PARA INSTALAÇÃO DE PLACAS CIMENTÍCIAS DE 1200 X 2400 X 10 MM'
where sku = 'CF006SF002'
  and nome = 'MÃO DE OBRA PARA INSTALAÇÃO DE PLACAS CIMENTÍCIAS DE 1200 X 2400 X 10 MM';

update material set
  nome = 'MO LSF T3 — painel duplo / cobertura / fechamento (R$60/m²)',
  nome_origem_planilha = 'MÃO DE OBRA PARA MONTAR 1M2 DE PAINEL SIMPLES UE 300 X 2,30 MM  - MALHA 300 MM'
where sku = 'CF006SF003'
  and nome = 'MÃO DE OBRA PARA MONTAR 1M2 DE PAINEL SIMPLES UE 300 X 2,30 MM  - MALHA 300 MM';

update material set
  nome = 'MO LSF T2 — painel 2UE médio (R$55/m²)',
  nome_origem_planilha = 'MÃO DE OBRA PARA MONTAR 1M2 DE PAINEL 2UE 90 X 0,95 MM  - MALHA 400 E 600 MM'
where sku = 'CF006SF004'
  and nome = 'MÃO DE OBRA PARA MONTAR 1M2 DE PAINEL 2UE 90 X 0,95 MM  - MALHA 400 E 600 MM';

update material set
  nome = 'MO LSF T3 — painel duplo / cobertura / fechamento (R$60/m²)',
  nome_origem_planilha = 'MÃO DE OBRA INSTALAÇÃO DE TELHAS CERÂMICAS + APLICAÇÃO DE MANTA'
where sku = 'CF006SF005'
  and nome = 'MÃO DE OBRA INSTALAÇÃO DE TELHAS CERÂMICAS + APLICAÇÃO DE MANTA';

update material set
  nome = 'MO LSF T3 — painel duplo / cobertura / fechamento (R$60/m²)',
  nome_origem_planilha = 'MÃO DE OBRA INSTALAÇÃO DE PLACAS CIMENTÍCIAS + TRATAMENTO DE JUNTAS + BASECOAT'
where sku = 'CF006SF006'
  and nome = 'MÃO DE OBRA INSTALAÇÃO DE PLACAS CIMENTÍCIAS + TRATAMENTO DE JUNTAS + BASECOAT';

update material set
  nome = 'MO LSF T4 — forro (R$75/m²)',
  nome_origem_planilha = 'MÃO DE OBRA INSTALAÇÃO FORRO DE GESSO ESTRUTURADO + LÃ DE VIDRO + TRATAMENTO DE JUNTAS'
where sku = 'CF006SF007'
  and nome = 'MÃO DE OBRA INSTALAÇÃO FORRO DE GESSO ESTRUTURADO + LÃ DE VIDRO + TRATAMENTO DE JUNTAS';

commit;
