-- Cada produto carrega a planta: metragem linear de paredes ext/int e a
-- face usada para conectar módulos adjacentes (3, 6 ou 9 m).
--
-- Com essas três colunas, derive() pode substituir o perímetro heurístico
-- por dados da planta:
--   perimetro_externo = qtd × comp_paredes_ext_m − (qtd−1) × 2 × face_conexao
--   comp_parede_interna = qtd × comp_paredes_int_m
--
-- NULL → derive() usa o cálculo antigo (compatibilidade com fixtures).

alter table produto
  add column comp_paredes_ext_m numeric(6,2),
  add column comp_paredes_int_m numeric(6,2),
  add column face_conexao_m numeric(4,1);

-- Seed defaults para os dois produtos existentes (perímetro bruto de 1 módulo).
update produto set
  comp_paredes_ext_m = 18,  -- 2×3 + 2×6
  comp_paredes_int_m = 1.5, -- divisória WC (~1,5 m)
  face_conexao_m = 3
where slug = 'farmacia-express-3x6';

update produto set
  comp_paredes_ext_m = 24,  -- 2×3 + 2×9
  comp_paredes_int_m = 0,
  face_conexao_m = 3
where slug = 'loja-modular-3x9';
