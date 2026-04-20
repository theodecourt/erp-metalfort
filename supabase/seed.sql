-- Seed: 40 materiais (estrutura, fechamento, cobertura, drywall, forro, piso, instalações, esquadrias, serviços)
insert into material (sku, nome, categoria, unidade, preco_unitario) values
 -- Estrutura
 ('MT-LSF-001','Perfil LSF Z275 (kg)','estrutura','kg',14.00),
 ('MT-LSF-002','Parafuso metal/metal 4,8x19 (cx 1000)','estrutura','cx',112.00),
 ('MT-LSF-003','Banda acústica 90x10000x4mm','estrutura','rl',47.62),
 ('MT-LSF-004','Parabolt 5/16x4.1/4 (pacote 10un)','estrutura','pc',49.00),
 -- Fechamento
 ('MT-FCH-001','Placa Glasroc-X 12,5x1200x2400mm (2,88m²)','fechamento','pc',219.90),
 ('MT-FCH-002','Fita telada Vertex p/ cimentícia 100x50000mm','fechamento','rl',107.00),
 ('MT-FCH-003','Parafuso Glasroc 3,5x25mm ponta agulha (cx 100)','fechamento','ct',18.29),
 ('MT-FCH-004','Membrana hidrófuga 2740x30480mm (83,51m²)','fechamento','rl',1071.00),
 ('MT-FCH-005','Manta auto adesiva asfáltica aluminizada 20cmx10m','fechamento','rl',49.00),
 ('MT-FCH-006','Fita Tyvek Tape 50x50m','fechamento','rl',30.00),
 ('MT-FCH-007','Tela fibra de vidro Vertex R131 50m²','fechamento','rl',763.00),
 ('MT-FCH-008','Massa base coat Placoplast GRX 20kg','fechamento','sc',125.00),
 ('MT-FCH-009','Cantoneira PVC 2,50m','fechamento','pc',34.65),
 ('MT-FCH-010','Perfil início com pingadeira PVC 2500mm','fechamento','pc',62.50),
 -- Cobertura
 ('MT-COB-001','Telha termoacústica TP40 PIR 30mm','fechamento','m2',110.00),
 ('MT-COB-002','Acessórios telha termoacústica TP40','fechamento','m2',50.00),
 -- Drywall interno
 ('MT-DRW-001','Placa gesso 12,5x1200x1800mm (2,16m²)','fechamento','pc',37.00),
 ('MT-DRW-002','Parafuso drywall 3,5x25mm trombeta (cx 100)','fechamento','ct',12.06),
 ('MT-DRW-003','Lã de vidro Wallfelt POPO4 50x1200x12500mm (15m²)','fechamento','rl',189.90),
 ('MT-DRW-004','Massa junta drywall 25kg','fechamento','bd',50.00),
 ('MT-DRW-005','Guia R48: 300cm RV','estrutura','m',4.89),
 ('MT-DRW-006','Montante M48: 300cm RV','estrutura','m',5.90),
 -- Forro
 ('MT-FOR-001','Perfil forro F530 0,48x3000mm Z120','fechamento','pc',14.20),
 ('MT-FOR-002','Emenda F530','fechamento','pc',1.40),
 ('MT-FOR-003','Pendural reg F530 Z275','fechamento','pc',1.83),
 ('MT-FOR-004','Perfil forro tabica branca 0,5x3000mm Z275','fechamento','pc',21.90),
 -- Piso
 ('MT-PIS-001','Piso vinílico LVT (m²)','acabamento','m2',89.00),
 ('MT-PIS-002','Cerâmica 60x60 (m²)','acabamento','m2',55.00),
 ('MT-PIS-003','Porcelanato 60x60 (m²)','acabamento','m2',95.00),
 -- Instalações
 ('MT-INS-001','Kit hidráulico WC completo','instalacoes','und',1800.00),
 ('MT-INS-002','Kit elétrico 10 pontos','instalacoes','und',2500.00),
 ('MT-INS-003','Split 12.000 BTU','equipamento','und',2200.00),
 -- Esquadrias
 ('MT-ESQ-001','Porta externa 90x210 + kit (folha+batente+fechadura)','esquadria','und',950.00),
 ('MT-ESQ-002','Janela maxim-ar 100x60','esquadria','und',420.00),
 ('MT-ESQ-003','Porta WC 70x210','esquadria','und',380.00),
 -- Serviços
 ('MT-SVC-001','Mão de obra LSF (R$/m²)','servico','m2',450.00),
 ('MT-SVC-002','Frete + guindaste (por deslocamento)','servico','und',1000.00),
 -- Addons
 ('MT-ADD-001','Comunicação visual (logo, adesivação) — estimado','servico','und',3500.00),
 ('MT-ADD-002','Iluminação comercial especial — por ponto','equipamento','und',280.00),
 ('MT-ADD-003','Balcão fixo em steelframe + MDF (por metro linear)','equipamento','m',1200.00),
 -- SKUs adicionais para combos do configurador em etapas
 ('MT-FCH-011','Placa Infibra cimentícia 10x1200x2400mm (2,88m²)','fechamento','pc',198.00),
 ('MT-DRW-007','Lã de rocha 50x1200x12500mm densa (15m²)','fechamento','rl',289.00),
 ('MT-DRW-008','Placa gesso RU 12,5x1200x1800mm resistente umidade (2,16m²)','fechamento','pc',58.00),
 ('MT-FOR-005','Placa forro perfurada acústica 600x600mm (0,36m²)','fechamento','pc',42.00),
 ('MT-PIS-004','Contrapiso seco Knauf 18mm (m²)','acabamento','m2',78.00),
 ('MT-PIS-005','Contrapiso cimentício pré-misturado (m²)','acabamento','m2',45.00),
 ('MT-VID-001','Vidro laminado 6mm (m²)','esquadria','m2',185.00),
 ('MT-VID-002','Vidro duplo 6+6mm com câmara (m²)','esquadria','m2',420.00),
 ('MT-VID-003','Vidro temperado 8mm (m²)','esquadria','m2',310.00),
 ('MT-COB-003','Laje seca drywall completa kit (m²)','fechamento','m2',220.00);

-- PRODUTOS
insert into produto (slug, nome, tipo_base, finalidade, pe_direito_sugerido_m, descricao) values
 ('metalfort-home','Metalfort Home','3x6','casa',2.70,
  'Módulos para residências, casas de veraneio, hotéis, Airbnb e mais.'),
 ('metalfort-shop','Metalfort Shop','3x9','loja',3.00,
  'Módulos para comércios como farmácias, pet shops, lojas de conveniência e lanchonetes.');

-- OPCOES (9 alavancas para Farmácia Express 3x6)
insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'tamanho_modulo','Tamanho do módulo'::text,
  '["3x3","3x6","3x9"]'::jsonb,'"3x6"'::jsonb,1
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'qtd_modulos','Quantidade de módulos',
  '{"min":1,"max":3}'::jsonb,'1'::jsonb,2
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'pe_direito','Pé direito (m)',
  '{"min":2.40,"max":3.50,"step":0.10}'::jsonb,'2.70'::jsonb,3
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'cor','Cor externa',
  '["branco","cinza","preto","grafite"]'::jsonb,'"cinza"'::jsonb,4
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'pacote_acabamento','Pacote de acabamento',
  '["padrao","premium"]'::jsonb,'"padrao"'::jsonb,5
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'esquadria','Esquadrias extras',
  '{"portas":{"min":0,"max":2},"janelas":{"min":0,"max":4}}'::jsonb,
  '{"portas":0,"janelas":2}'::jsonb,6
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'piso','Piso',
  '["vinilico","ceramico","porcelanato"]'::jsonb,'"vinilico"'::jsonb,7
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'wc','WC interno',
  '[true,false]'::jsonb,'true'::jsonb,8
from produto where slug='metalfort-home';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'ac','Splits de ar-condicionado',
  '{"min":0,"max":4}'::jsonb,'1'::jsonb,9
from produto where slug='metalfort-home';

-- Copia as mesmas 9 opções para Loja Modular 3x9 com alguns defaults diferentes
insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select (select id from produto where slug='metalfort-shop') as produto_id,
  o.tipo, o.label, o.valores_possiveis_json,
  case o.tipo
    when 'tamanho_modulo' then '"3x9"'::jsonb
    when 'pe_direito' then '3.00'::jsonb
    when 'esquadria' then '{"portas":0,"janelas":3}'::jsonb
    when 'ac' then '2'::jsonb
    else o.default_json
  end as default_json,
  o.ordem
from produto_opcao o
where o.produto_id = (select id from produto where slug='metalfort-home');

-- BOM regras — Farmácia Express 3x6 (Tier core + addons). 13 regras.
with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-001'),
  '{"op":"mul","of":[{"op":"var","of":"area_planta_m2"},30]}'::jsonb,
  'core','estrutura',1 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-002'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},30]}}'::jsonb,
  'core','estrutura',2 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-003'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"perimetro_externo_m"},10]}}'::jsonb,
  'core','estrutura',3 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-004'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"perimetro_externo_m"},3]}}'::jsonb,
  'core','estrutura',4 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ESQ-001'),
  '{"op":"var","of":"num_portas_ext"}'::jsonb,
  'core','esquadria',5 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ESQ-002'),
  '{"op":"var","of":"num_janelas"}'::jsonb,
  'core','esquadria',6 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-INS-001'),
  '{"op":"if","cond":{"op":"var","of":"tem_wc"},"then":1,"else":0}'::jsonb,
  'core','instalacoes',7 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ESQ-003'),
  '{"op":"if","cond":{"op":"var","of":"tem_wc"},"then":1,"else":0}'::jsonb,
  'core','esquadria',8 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-INS-002'),'1'::jsonb,
  'core','instalacoes',9 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-SVC-001'),
  '{"op":"var","of":"area_planta_m2"}'::jsonb,
  'core','servico',10 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-INS-003'),
  '{"op":"if","cond":{"op":"gt","of":[{"op":"var","of":"num_splits"},0]},"then":{"op":"var","of":"num_splits"},"else":0}'::jsonb,
  'addon','equipamento',11 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ADD-001'),'1'::jsonb,
  'addon','servico',12 from p;

with p as (select id as pid from produto where slug='metalfort-home')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-SVC-002'),'1'::jsonb,
  'addon','servico',13 from p;

-- BOM regras — Loja Modular 3x9: copia as mesmas 13 regras do produto farmácia
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select (select id from produto where slug='metalfort-shop'),
  material_id, formula_json, tier, categoria, ordem
from produto_bom_regra
where produto_id = (select id from produto where slug='metalfort-home');


-- Dev-only: create admin user. Never run in production.
-- Password: metalfort2026!
do $$
declare
  admin_uid uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'admin@metalfort.tech') then
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at
    ) values (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'admin@metalfort.tech',
      crypt('metalfort2026!', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'sub', admin_uid::text,
        'email', 'admin@metalfort.tech',
        'email_verified', true,
        'phone_verified', false,
        'nome', 'Admin Dev'
      ),
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      '', '', '', '',
      now(),
      now()
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(),
      admin_uid::text,
      admin_uid,
      jsonb_build_object(
        'sub', admin_uid::text,
        'email', 'admin@metalfort.tech',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  insert into usuario_interno (id, nome, role, ativo)
  select id, 'Admin Dev', 'admin', true from auth.users where email='admin@metalfort.tech'
  on conflict (id) do nothing;
end $$;

-- ===== Onda 2: estoque =====

-- Fornecedores
insert into fornecedor (nome, cnpj, contato_nome, contato_email, contato_fone) values
  ('Casa do Construtor', '12.345.678/0001-90', 'João Silva', 'joao@casaconstrutor.com.br', '(11) 94000-0001'),
  ('Metalúrgica Santos', '98.765.432/0001-10', 'Maria Santos', 'vendas@metalsantos.com.br', '(11) 94000-0002'),
  ('Aço Forte',          '55.444.333/0001-22', 'Carlos Lima',  'carlos@acoforte.com.br',    '(11) 94000-0003');

-- Minimums for representative SKUs (others stay 0 = unmonitored)
update material set estoque_minimo = 40  where sku = 'MT-FCH-001';  -- Placa Glasroc-X
update material set estoque_minimo = 500 where sku = 'MT-LSF-001';  -- Perfil LSF (kg)
update material set estoque_minimo = 3   where sku = 'MT-LSF-002';  -- Parafuso metal/metal (cx)
update material set estoque_minimo = 30  where sku = 'MT-DRW-001';  -- Placa gesso 12,5
update material set estoque_minimo = 20  where sku = 'MT-COB-001';  -- Telha TP40 PIR
update material set estoque_minimo = 40  where sku = 'MT-PIS-001';  -- LVT
update material set estoque_minimo = 2   where sku = 'MT-INS-001';  -- Kit hidráulico WC
update material set estoque_minimo = 2   where sku = 'MT-INS-002';  -- Kit elétrico 10 pontos
update material set estoque_minimo = 2   where sku = 'MT-INS-003';  -- Split 12k BTU
update material set estoque_minimo = 5   where sku = 'MT-FCH-005';  -- Manta asfáltica

-- Example movements: creates initial stock for dev/demo.
-- Uses admin dev user (email admin@metalfort.tech) and fornecedores above.
do $$
declare
  admin_id uuid := (select id from auth.users where email = 'admin@metalfort.tech' limit 1);
  casa_id  uuid := (select id from fornecedor where nome = 'Casa do Construtor');
  metal_id uuid := (select id from fornecedor where nome = 'Metalúrgica Santos');
  forte_id uuid := (select id from fornecedor where nome = 'Aço Forte');
  any_orc  uuid := (select id from orcamento order by created_at limit 1);
begin
  if admin_id is null then
    raise notice 'admin user missing, skipping estoque movements';
    return;
  end if;

  -- Compras (saldo inicial)
  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 60, 219.90, casa_id, 'NF-1001', admin_id
  from material where sku = 'MT-FCH-001';

  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 800, 14.00, metal_id, 'NF-1002', admin_id
  from material where sku = 'MT-LSF-001';

  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 5, 112.00, forte_id, 'NF-1003', admin_id
  from material where sku = 'MT-LSF-002';

  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 50, 37.00, casa_id, 'NF-1004', admin_id
  from material where sku = 'MT-DRW-001';

  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 30, 110.00, forte_id, 'NF-1005', admin_id
  from material where sku = 'MT-COB-001';

  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 100, 89.00, casa_id, 'NF-1006', admin_id
  from material where sku = 'MT-PIS-001';

  insert into estoque_movimento
    (material_id, tipo, quantidade, preco_unitario, fornecedor_id, nota_fiscal, criado_por)
  select id, 'compra', 3, 1800.00, casa_id, 'NF-1007', admin_id
  from material where sku = 'MT-INS-001';

  -- Intentionally leave Placa Glasroc-X (MT-FCH-001) "below minimum" after a partial sale
  insert into estoque_movimento
    (material_id, tipo, quantidade, destino, orcamento_id, criado_por)
  select id, 'saida_obra', 45, 'Farmácia Tatuí (exemplo)', any_orc, admin_id
  from material where sku = 'MT-FCH-001';

  -- An ajuste positivo (found 2 extra kits)
  insert into estoque_movimento
    (material_id, tipo, quantidade, observacao, criado_por)
  select id, 'ajuste_positivo', 2, 'Encontrados no inventário físico', admin_id
  from material where sku = 'MT-INS-001';

  -- An ajuste negativo (broken telha)
  insert into estoque_movimento
    (material_id, tipo, quantidade, observacao, criado_por)
  select id, 'ajuste_negativo', 1, 'Telha quebrada na descarga', admin_id
  from material where sku = 'MT-COB-001';
end $$;

-- ===== Combos por categoria (configurador em etapas) =====

-- Combos de fechamento externo
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('fechamento-standard', 'fechamento_ext', 'Standard',
  'Glasroc-X 12,5mm + membrana + lã vidro 50mm + gesso 12,5mm. Atende NBR.', 1),
 ('fechamento-termico', 'fechamento_ext', 'Térmico',
  'Glasroc-X + manta refletiva aluminizada + lã vidro 100mm + gesso. Para clima extremo.', 2),
 ('fechamento-acustico', 'fechamento_ext', 'Acústico',
  'Glasroc-X + lã de rocha densa + gesso duplo. Hotelaria e urbano.', 3),
 ('fechamento-premium', 'fechamento_ext', 'Premium',
  'Cimentícia Infibra + Glasroc-X dupla + lã rocha 100mm. Fachada aparente.', 4);

-- Materiais de fechamento-standard
with c as (select id from pacote_combo where slug='fechamento-standard')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-FCH-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.88]},"waste":0.07}', 1),
  ('MT-FCH-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},30]}}', 2),
  ('MT-FCH-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},83.51]}}', 3),
  ('MT-FCH-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}', 4),
  ('MT-DRW-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}', 5),
  ('MT-DRW-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.16]},"waste":0.07}', 6),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},30]}}', 7),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},50]}}', 8),
  ('MT-FCH-008', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},20]}}', 9)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Materiais de fechamento-termico (Standard + manta refletiva, lã dobrada)
with c as (select id from pacote_combo where slug='fechamento-termico')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-FCH-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.88]},"waste":0.07}', 1),
  ('MT-FCH-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},30]}}', 2),
  ('MT-FCH-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},83.51]}}', 3),
  ('MT-FCH-005', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2]}}', 4),
  ('MT-FCH-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}', 5),
  ('MT-DRW-003', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}]}', 6),
  ('MT-DRW-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.16]},"waste":0.07}', 7),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},30]}}', 8),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},50]}}', 9),
  ('MT-FCH-008', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},20]}}', 10)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Materiais de fechamento-acustico (Standard + lã de rocha densa + gesso interno duplo)
with c as (select id from pacote_combo where slug='fechamento-acustico')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-FCH-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.88]},"waste":0.07}', 1),
  ('MT-FCH-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},30]}}', 2),
  ('MT-FCH-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},83.51]}}', 3),
  ('MT-FCH-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}', 4),
  ('MT-DRW-007', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}', 5),
  ('MT-DRW-001', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.16]},"waste":0.07}]}', 6),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},20]}}', 7),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},50]}}', 8),
  ('MT-FCH-008', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},20]}}', 9)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Materiais de fechamento-premium (Infibra + Glasroc dupla + lã rocha + gesso RU + acabamento premium)
with c as (select id from pacote_combo where slug='fechamento-premium')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-FCH-011', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.88]},"waste":0.07}', 1),
  ('MT-FCH-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.88]},"waste":0.07}', 2),
  ('MT-FCH-003', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},30]}}]}', 3),
  ('MT-FCH-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},83.51]}}', 4),
  ('MT-FCH-005', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2]}}', 5),
  ('MT-FCH-007', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},50]}}', 6),
  ('MT-DRW-007', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},15]}}]}', 7),
  ('MT-DRW-008', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.16]},"waste":0.07}', 8),
  ('MT-DRW-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.16]},"waste":0.07}', 9),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},20]}}', 10),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},50]}}', 11),
  ('MT-FCH-008', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},20]}}', 12)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Combos de cobertura
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('cobertura-standard', 'cobertura', 'Standard',
  'Telha termoacústica TP40 30mm + acessórios. Atende NBR.', 1),
 ('cobertura-termica', 'cobertura', 'Térmica',
  'Telha TP40 50mm (isolante reforçado) + acessórios. Para clima extremo.', 2),
 ('cobertura-laje', 'cobertura', 'Laje seca',
  'Laje seca em drywall, cobertura plana. Aceita terraço.', 3);

with c as (select id from pacote_combo where slug='cobertura-standard')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-COB-001', '{"op":"var","of":"area_cobertura_m2"}', 1),
  ('MT-COB-002', '{"op":"var","of":"area_cobertura_m2"}', 2)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='cobertura-termica')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-COB-001', '{"op":"mul","of":[1.35,{"op":"var","of":"area_cobertura_m2"}]}', 1),
  ('MT-COB-002', '{"op":"var","of":"area_cobertura_m2"}', 2)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='cobertura-laje')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-COB-003', '{"op":"var","of":"area_cobertura_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Combos de forro
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('forro-standard', 'forro', 'Standard',
  'Gesso liso 12,5mm com perfis F530 + pendurais. Acabamento pintura.', 1),
 ('forro-acustico', 'forro', 'Acústico',
  'Placa perfurada acústica + lã de vidro. Para ambientes barulhentos.', 2),
 ('forro-sem', 'forro', 'Sem forro',
  'Sem forro — pé-direito aparente. Zero material.', 3);

with c as (select id from pacote_combo where slug='forro-standard')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-DRW-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},2.16]},"waste":0.07}', 1),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},30]}}', 2),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},50]}}', 3),
  ('MT-FOR-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},2]}}', 4),
  ('MT-FOR-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},4]}}', 5),
  ('MT-FOR-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},1]}}', 6),
  ('MT-FOR-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"perimetro_externo_m"},3]}}', 7)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='forro-acustico')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-FOR-005', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},0.36]},"waste":0.05}', 1),
  ('MT-DRW-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},15]}}', 2),
  ('MT-FOR-001', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},2]}}', 3),
  ('MT-FOR-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},4]}}', 4),
  ('MT-FOR-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},1]}}', 5),
  ('MT-FOR-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"perimetro_externo_m"},3]}}', 6)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- forro-sem: nenhum material.

-- Combos de divisória
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('divisoria-simples', 'divisoria', 'Simples',
  'Chapa gesso 12,5mm única cada lado + lã vidro 50mm entre montantes.', 1),
 ('divisoria-acustica', 'divisoria', 'Acústica',
  'Chapa gesso dupla cada lado + lã de rocha densa. STC elevado.', 2);

with c as (select id from pacote_combo where slug='divisoria-simples')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-DRW-001', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},2.16]},"waste":0.07}]}', 1),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},15]}}', 2),
  ('MT-DRW-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},15]}}', 3),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},50]}}', 4),
  ('MT-DRW-005', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"comp_parede_interna_m"},3]}}', 5),
  ('MT-DRW-006', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"comp_parede_interna_m"},0.6]}}', 6)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='divisoria-acustica')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-DRW-001', '{"op":"mul","of":[4,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},2.16]},"waste":0.07}]}', 1),
  ('MT-DRW-002', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},15]}}]}', 2),
  ('MT-DRW-007', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},15]}}', 3),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_interna_nao_wc_m2"},50]}}', 4),
  ('MT-DRW-005', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"comp_parede_interna_m"},3]}}', 5),
  ('MT-DRW-006', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"comp_parede_interna_m"},0.6]}}', 6)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Combo de divisória do WC (auto-aplicado quando tem_wc)
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('divisoria-umida', 'divisoria_wc', 'Úmida',
  'Placa gesso RU (resistente à umidade) na parede do WC.', 1);

with c as (select id from pacote_combo where slug='divisoria-umida')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-DRW-008', '{"op":"mul","of":[2,{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_wc_m2"},2.16]},"waste":0.07}]}', 1),
  ('MT-DRW-002', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_wc_m2"},15]}}', 2),
  ('MT-DRW-003', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_wc_m2"},15]}}', 3),
  ('MT-DRW-004', '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_parede_wc_m2"},50]}}', 4)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Combos de piso
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('piso-vinilico', 'piso', 'Vinílico', 'LVT 3mm — econômico e prático.', 1),
 ('piso-ceramico', 'piso', 'Cerâmico', 'Cerâmica 60x60 — bom custo-benefício.', 2),
 ('piso-porcelanato', 'piso', 'Porcelanato', 'Porcelanato 60x60 — alto padrão.', 3);

with c as (select id from pacote_combo where slug='piso-vinilico')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-PIS-001', '{"op":"var","of":"area_planta_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='piso-ceramico')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-PIS-002', '{"op":"mul","of":[{"op":"var","of":"area_planta_m2"},1.07]}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='piso-porcelanato')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-PIS-003', '{"op":"mul","of":[{"op":"var","of":"area_planta_m2"},1.07]}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Combos de subpiso
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('subpiso-seco', 'subpiso', 'Seco', 'Contrapiso seco Knauf 18mm. Instalação rápida.', 1),
 ('subpiso-umido', 'subpiso', 'Úmido', 'Contrapiso cimentício pré-misturado. Convencional.', 2);

with c as (select id from pacote_combo where slug='subpiso-seco')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-PIS-004', '{"op":"var","of":"area_planta_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='subpiso-umido')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-PIS-005', '{"op":"var","of":"area_planta_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

-- Combos de vidro
insert into pacote_combo (slug, categoria, nome, descricao, ordem) values
 ('vidro-simples', 'vidro', 'Simples', 'Vidro laminado 6mm.', 1),
 ('vidro-duplo', 'vidro', 'Duplo', 'Vidro duplo 6+6mm com câmara de ar. Termoacústico.', 2),
 ('vidro-temperado', 'vidro', 'Temperado', 'Temperado 8mm. Alta resistência.', 3);

with c as (select id from pacote_combo where slug='vidro-simples')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-VID-001', '{"op":"var","of":"area_caixilhos_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='vidro-duplo')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-VID-002', '{"op":"var","of":"area_caixilhos_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;

with c as (select id from pacote_combo where slug='vidro-temperado')
insert into pacote_combo_material (pacote_combo_id, material_id, formula_json, ordem)
select c.id, m.id, f.formula::jsonb, f.ordem from c, (values
  ('MT-VID-003', '{"op":"var","of":"area_caixilhos_m2"}', 1)
) as f(sku, formula, ordem)
join material m on m.sku = f.sku;
