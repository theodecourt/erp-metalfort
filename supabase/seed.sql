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
 ('MT-ADD-003','Balcão fixo em steelframe + MDF (por metro linear)','equipamento','m',1200.00);
