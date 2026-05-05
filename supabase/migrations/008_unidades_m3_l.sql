-- Onda 4 — Estende material_unidade com m3, l, km, dia
-- v3 da planilha do Samuel introduz:
--   m3  : agregados (areia/brita) e aglomerantes
--   l   : agua e liquidos
--   km  : frete por quilometro
--   dia : locacao por diaria (Munk etc.)

alter type material_unidade add value if not exists 'm3';
alter type material_unidade add value if not exists 'l';
alter type material_unidade add value if not exists 'km';
alter type material_unidade add value if not exists 'dia';
