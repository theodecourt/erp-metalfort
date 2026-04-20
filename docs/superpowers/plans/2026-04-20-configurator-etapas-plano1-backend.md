# Configurador em Etapas — Plano 1 (fundação backend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o modelo de dados + cálculo de BOM para combos/templates da onda 3, sem tocar na UI. Ao final, um `POST /api/quote/calculate` com `configuracao.combos = {...}` retorna BOM correta (união de regras de geometria + materiais dos combos selecionados), e o site público continua funcionando via adapter de legado.

**Architecture:** Quatro tabelas novas (`pacote_combo`, `pacote_combo_material`, `template_orcamento`, `template_orcamento_selecao`). Regras combo-governadas (fechamento, cobertura, forro, piso, divisória) saem de `produto_bom_regra` e viram linhas em `pacote_combo_material`. Um serviço `combo_service` avalia essas linhas como BOM sintética que se une ao restante (geometria). Adapter `normalize_configuracao` traduz o schema legado (`pacote_acabamento`) para o novo (`combos`) na entrada dos endpoints.

**Tech Stack:** Supabase/Postgres (migrations + seed.sql), FastAPI + pydantic v2, pytest, uv.

**Especificação:** `docs/superpowers/specs/2026-04-20-configurator-etapas-design.md`.

**Commits:** cada task termina num commit. Seguir convenção do repo (`feat(scope): ...`, `test(scope): ...`, `refactor(scope): ...`, em pt-BR sem acento).

---

## File Structure

**Novos arquivos:**
- `supabase/migrations/006_combos.sql` — DDL das 4 tabelas + RLS.
- `backend/app/services/combo_service.py` — serviço que avalia `pacote_combo_material` e gera BOM sintética.
- `backend/app/services/configuracao_normalizer.py` — adapter `normalize_configuracao(dict) -> dict` que traduz shape legado para novo.
- `backend/app/routers/combos.py` — `GET /api/combos`, `GET /api/templates`.
- `backend/tests/test_combo_service.py`
- `backend/tests/test_configuracao_normalizer.py`

**Modificados:**
- `supabase/seed.sql` — adiciona SKUs novos, remove regras combo-governadas de `produto_bom_regra`, insere combos, materials dos combos e templates.
- `backend/app/services/variables.py` — adiciona `area_parede_wc_m2`, `area_parede_interna_nao_wc_m2`, `area_caixilhos_m2`.
- `backend/app/services/quote_calculator.py` — `calculate(...)` passa a aceitar `combos_bom` (lista de regras sintéticas) e fazer união.
- `backend/app/models/quote.py` — `Configuracao` recebe `combos`, `template_aplicado`; `pacote_acabamento` vira `Optional` deprecated.
- `backend/app/lib/repository.py` — helpers `list_combos`, `get_combos_by_slugs`, `list_templates`, `get_template_by_slug`, `list_combo_materials_by_slugs`.
- `backend/app/routers/quote.py` e `backend/app/routers/public_quote.py` — aplicam `normalize_configuracao` e alimentam `calculate()` com combo BOM.
- `backend/app/main.py` — registra router de combos.
- `backend/tests/test_variables.py` — asserts nas novas vars.
- `backend/tests/test_quote_calculator.py` — testes da união geometria+combos.

---

## Task 1: Migration `006_combos.sql` — schema

**Files:**
- Create: `supabase/migrations/006_combos.sql`

- [ ] **Step 1: Criar o arquivo de migration com as 4 tabelas, índices e RLS**

```sql
-- supabase/migrations/006_combos.sql
-- Onda 3: combos por categoria + templates (selecoes salvas).

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

-- pacote_combo_material: regras BOM sintéticas por combo.
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
  categoria text not null,
  pacote_combo_id uuid not null references pacote_combo(id),
  primary key (template_id, categoria)
);

-- RLS admin-only (publicly readable para o site publico eventualmente exibir pacotes).
alter table pacote_combo enable row level security;
alter table pacote_combo_material enable row level security;
alter table template_orcamento enable row level security;
alter table template_orcamento_selecao enable row level security;

-- Leitura publica (anon pode ler combos ativos).
create policy pacote_combo_read_all on pacote_combo for select using (true);
create policy pacote_combo_material_read_all on pacote_combo_material for select using (true);
create policy template_orcamento_read_all on template_orcamento for select using (true);
create policy template_orcamento_selecao_read_all on template_orcamento_selecao for select using (true);

-- Escrita apenas admin (mesmo padrao de material/produto_opcao).
create policy pacote_combo_admin_write on pacote_combo
  for all to authenticated
  using (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'));

create policy pacote_combo_material_admin_write on pacote_combo_material
  for all to authenticated
  using (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'));

create policy template_orcamento_admin_write on template_orcamento
  for all to authenticated
  using (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'));

create policy template_orcamento_selecao_admin_write on template_orcamento_selecao
  for all to authenticated
  using (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from usuario_interno where id = auth.uid() and role = 'admin'));
```

- [ ] **Step 2: Aplicar e verificar**

```bash
cd erp-metalfort
make migrate
```

Expected: `supabase db reset` roda sem erro; mensagem final "Local database is ready.".

- [ ] **Step 3: Verificar que as tabelas existem**

```bash
npx supabase db execute --stdin <<< "select table_name from information_schema.tables where table_schema='public' and table_name like 'pacote_combo%' or table_name like 'template_orcamento%' order by table_name;"
```

Expected: 4 linhas — `pacote_combo`, `pacote_combo_material`, `template_orcamento`, `template_orcamento_selecao`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/006_combos.sql
git commit -m "feat(db): migration 006 - tabelas de combos e templates"
```

---

## Task 2: Seed — SKUs novos para combos

**Files:**
- Modify: `supabase/seed.sql` (inserção de novos materiais antes das seções existentes de onda 2).

- [ ] **Step 1: Adicionar bloco de SKUs novos em `supabase/seed.sql`**

Localizar a primeira linha `-- Addons` (próximo ao fim da seção de materiais de onda 1, antes de `-- PRODUTOS`). Antes de `-- PRODUTOS`, adicionar:

```sql
 -- Onda 3: SKUs adicionais para combos
 ('MT-FCH-011','Placa Infibra cimentícia 10x1200x2400mm (2,88m²)','fechamento','pc',198.00),
 ('MT-DRW-007','Lã de rocha 50x1200x12500mm densa (15m²)','fechamento','rl',289.00),
 ('MT-DRW-008','Placa gesso RU 12,5x1200x1800mm resistente umidade (2,16m²)','fechamento','pc',58.00),
 ('MT-FOR-005','Placa forro perfurada acústica 600x600mm (0,36m²)','fechamento','pc',42.00),
 ('MT-PIS-004','Contrapiso seco Knauf 18mm (m²)','acabamento','m2',78.00),
 ('MT-PIS-005','Contrapiso cimentício pré-misturado (m²)','acabamento','m2',45.00),
 ('MT-VID-001','Vidro laminado 6mm (m²)','esquadria','m2',185.00),
 ('MT-VID-002','Vidro duplo 6+6mm com câmara (m²)','esquadria','m2',420.00),
 ('MT-VID-003','Vidro temperado 8mm (m²)','esquadria','m2',310.00),
 ('MT-COB-003','Laje seca drywall completa kit (m²)','fechamento','m2',220.00),
```

A linha imediatamente acima dessa insercao (atualmente `('MT-ADD-003'...'m',1200.00);`) precisa ter a virgula final ao invés do ponto-e-virgula. Ajustar:

```sql
 ('MT-ADD-003','Balcão fixo em steelframe + MDF (por metro linear)','equipamento','m',1200.00),
```

E o ponto-e-virgula vai no final da última linha nova:

```sql
 ('MT-COB-003','Laje seca drywall completa kit (m²)','fechamento','m2',220.00);
```

- [ ] **Step 2: Aplicar e verificar**

```bash
make migrate
npx supabase db execute --stdin <<< "select count(*) from material where sku in ('MT-FCH-011','MT-DRW-007','MT-DRW-008','MT-FOR-005','MT-PIS-004','MT-PIS-005','MT-VID-001','MT-VID-002','MT-VID-003','MT-COB-003');"
```

Expected: `10`.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): adiciona 10 SKUs novos para combos de onda 3"
```

---

## Task 3: Seed — remover regras combo-governadas de `produto_bom_regra`

As regras BOM atualmente hardcoded em seed para `MT-FCH-001` (Glasroc), `MT-COB-001` (Telha TP40), `MT-COB-002` (Acessórios telha) e `MT-PIS-001` (Vinílico) passam a viver em `pacote_combo_material`. Removê-las da seed evita duplicação.

**Files:**
- Modify: `supabase/seed.sql`.

- [ ] **Step 1: Remover blocos de inserção das regras combo-governadas**

Localizar e DELETAR os quatro blocos `with p as (...) insert into produto_bom_regra ...` que inserem:
- `MT-FCH-001` (ordem 5, ‘core’,‘fechamento’) — bloco entre `-- BOM regras — Farmácia...` e o próximo insert.
- `MT-COB-001` (ordem 6, ‘core’,‘fechamento’).
- `MT-COB-002` (ordem 7, ‘core’,‘fechamento’).
- `MT-PIS-001` (ordem 8, ‘core’,‘acabamento’).

Após remoção, renumerar `ordem` dos inserts restantes para ficarem sequenciais (ordens 1-4 estrutura permanecem, depois 5 porta ext, 6 janela maxim-ar, 7 kit hidráulico, 8 porta WC, 9 kit elétrico, 10 mão de obra, 11 split, 12 comunicação visual, 13 frete).

- [ ] **Step 2: Verificar que a cópia para `metalfort-shop` ainda funciona (copia produto_bom_regra de home para shop)**

O bloco `insert into produto_bom_regra (...) select (select id from produto where slug='metalfort-shop'), ...` copia de `home` para `shop`. Essa cópia pegará 13 regras em vez das 17 anteriores. Está correto.

- [ ] **Step 3: Aplicar e verificar**

```bash
make migrate
npx supabase db execute --stdin <<< "select count(*) from produto_bom_regra where produto_id = (select id from produto where slug='metalfort-home');"
```

Expected: `13`.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "refactor(db): remove regras combo-governadas de produto_bom_regra"
```

---

## Task 4: Seed — combos de `fechamento_ext`

Objetivo: inserir 4 combos de `fechamento_ext` (Standard, Térmico, Acústico, Premium) e suas linhas em `pacote_combo_material`.

**Files:**
- Modify: `supabase/seed.sql` (nova seção ao fim).

- [ ] **Step 1: Adicionar seção de combos ao fim de `supabase/seed.sql`**

Apensar ao final do arquivo:

```sql
-- ===== Onda 3: combos por categoria =====

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
```

- [ ] **Step 2: Aplicar e verificar**

```bash
make migrate
npx supabase db execute --stdin <<< "select slug, (select count(*) from pacote_combo_material pcm where pcm.pacote_combo_id = pc.id) as qtd from pacote_combo pc where categoria='fechamento_ext' order by ordem;"
```

Expected (4 linhas):
- `fechamento-standard` → 9 materiais
- `fechamento-termico` → 10 materiais
- `fechamento-acustico` → 9 materiais
- `fechamento-premium` → 12 materiais

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed de 4 combos de fechamento externo"
```

---

## Task 5: Seed — combos de cobertura, forro, divisória, divisória WC

**Files:**
- Modify: `supabase/seed.sql` (continuação da seção de combos).

- [ ] **Step 1: Apensar blocos de combos ao final de `supabase/seed.sql`**

```sql
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
```

- [ ] **Step 2: Aplicar e verificar**

```bash
make migrate
npx supabase db execute --stdin <<< "select categoria, count(*) from pacote_combo group by categoria order by categoria;"
```

Expected (até aqui):
- `cobertura` → 3
- `divisoria` → 2
- `divisoria_wc` → 1
- `fechamento_ext` → 4
- `forro` → 3

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed de combos de cobertura, forro, divisoria e divisoria_wc"
```

---

## Task 6: Seed — combos de piso, subpiso, vidro

**Files:**
- Modify: `supabase/seed.sql`.

- [ ] **Step 1: Apensar ao final de `supabase/seed.sql`**

```sql
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
```

- [ ] **Step 2: Aplicar e verificar total de combos**

```bash
make migrate
npx supabase db execute --stdin <<< "select categoria, count(*) from pacote_combo group by categoria order by categoria;"
```

Expected:
- `cobertura` → 3, `divisoria` → 2, `divisoria_wc` → 1, `fechamento_ext` → 4, `forro` → 3, `piso` → 3, `subpiso` → 2, `vidro` → 3. Total = 21.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed de combos de piso, subpiso e vidro"
```

---

## Task 7: Seed — templates Básico e Premium

**Files:**
- Modify: `supabase/seed.sql`.

- [ ] **Step 1: Apensar ao final de `supabase/seed.sql`**

```sql
-- Templates (seleções salvas de combos por categoria)
insert into template_orcamento (slug, nome, ordem) values
 ('basico', 'Básico', 1),
 ('premium', 'Premium', 2);

with t as (select id from template_orcamento where slug='basico')
insert into template_orcamento_selecao (template_id, categoria, pacote_combo_id)
select t.id, s.categoria, (select id from pacote_combo where slug=s.slug)
from t, (values
  ('fechamento_ext', 'fechamento-standard'),
  ('cobertura',      'cobertura-standard'),
  ('forro',          'forro-standard'),
  ('divisoria',      'divisoria-simples'),
  ('piso',           'piso-vinilico'),
  ('subpiso',        'subpiso-seco'),
  ('vidro',          'vidro-simples')
) as s(categoria, slug);

with t as (select id from template_orcamento where slug='premium')
insert into template_orcamento_selecao (template_id, categoria, pacote_combo_id)
select t.id, s.categoria, (select id from pacote_combo where slug=s.slug)
from t, (values
  ('fechamento_ext', 'fechamento-premium'),
  ('cobertura',      'cobertura-termica'),
  ('forro',          'forro-acustico'),
  ('divisoria',      'divisoria-acustica'),
  ('piso',           'piso-porcelanato'),
  ('subpiso',        'subpiso-seco'),
  ('vidro',          'vidro-duplo')
) as s(categoria, slug);
```

- [ ] **Step 2: Aplicar e verificar**

```bash
make migrate
npx supabase db execute --stdin <<< "select t.slug, count(s.*) from template_orcamento t join template_orcamento_selecao s on s.template_id = t.id group by t.slug;"
```

Expected: 2 linhas, cada uma com `7`.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed de templates basico e premium"
```

---

## Task 8: Novas variáveis em `derive()`

**Files:**
- Modify: `backend/app/services/variables.py`
- Modify: `backend/tests/test_variables.py`

- [ ] **Step 1: Escrever teste falho em `backend/tests/test_variables.py`**

Adicionar ao final do arquivo:

```python
def test_derive_exposes_area_parede_wc_and_nao_wc():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 2,
        "pe_direito_m": 2.7,
        "comp_paredes_int_m": 6.0,  # parede interna total 6 m
        "tem_wc": True,
    }
    v = derive(config)
    # parede wc: duas paredes verticais de 2.0m x pe_direito (assume 1/3 do comp_int)
    # bruta = 2 * 2.0 * 2.7 = 10.8, menos porta WC = 10.8 - 2*1.47 = 7.86
    assert v["area_parede_wc_m2"] > 0
    # parede nao-wc: o restante
    assert v["area_parede_interna_nao_wc_m2"] > 0
    assert v["area_parede_wc_m2"] + v["area_parede_interna_nao_wc_m2"] == pytest.approx(
        v["area_parede_interna_m2"], abs=0.01
    )


def test_derive_exposes_area_caixilhos():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "esquadrias_extras": {
            "portas": 0,
            "caixilhos": [
                {"tipo": "janela", "largura_m": 1.2, "altura_m": 1.0, "qtd": 2},
                {"tipo": "porta_vidro", "largura_m": 0.9, "altura_m": 2.1, "qtd": 1},
            ],
        },
    }
    v = derive(config)
    # 2 * 1.2 * 1.0 + 1 * 0.9 * 2.1 = 2.4 + 1.89 = 4.29
    assert v["area_caixilhos_m2"] == pytest.approx(4.29)


def test_derive_wc_false_gives_zero_wc_area():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 2,
        "pe_direito_m": 2.7,
        "comp_paredes_int_m": 6.0,
        "tem_wc": False,
    }
    v = derive(config)
    assert v["area_parede_wc_m2"] == 0.0
    assert v["area_parede_interna_nao_wc_m2"] == pytest.approx(v["area_parede_interna_m2"])
```

Adicionar import no topo do arquivo se faltar:

```python
import pytest
from app.services.variables import derive
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
cd backend && uv run pytest tests/test_variables.py -v -k "area_parede_wc or area_parede_interna_nao_wc or area_caixilhos"
```

Expected: FAIL — `KeyError: 'area_parede_wc_m2'` (ou similar).

- [ ] **Step 3: Implementar em `backend/app/services/variables.py`**

Substituir o bloco final do return da função `derive` para incluir os 3 campos novos. Modificar o arquivo inteiro para ficar:

```python
from __future__ import annotations

_SIZES = {
    "3x3": (3, 3),
    "3x6": (3, 6),
    "3x9": (3, 9),
}

_PORTA_AREAS = {
    "60x210": 0.60 * 2.10,
    "70x210": 0.70 * 2.10,
    "80x210": 0.80 * 2.10,
    "90x210": 0.90 * 2.10,
}
PORTA_ENTRADA_M2 = _PORTA_AREAS["90x210"]
PORTA_WC_M2 = _PORTA_AREAS["70x210"]

# Fração do comprimento total de parede interna que pertence ao WC quando tem_wc=True.
# Valor heurístico; se admin ajustar futuramente vira campo da configuração.
_WC_WALL_FRACTION = 1.0 / 3.0


def _porta_area(size: str) -> float:
    return _PORTA_AREAS.get(size, _PORTA_AREAS["80x210"])


def derive(config: dict) -> dict:
    tamanho = config["tamanho_modulo"]
    larg, comp = _SIZES[tamanho]
    qtd = int(config["qtd_modulos"])
    pe = float(config["pe_direito_m"])

    area_planta = larg * comp * qtd
    area_cobertura = area_planta

    comp_ext = config.get("comp_paredes_ext_m")
    comp_int = config.get("comp_paredes_int_m")

    perimetro = float(comp_ext) if comp_ext is not None else (2 * (comp * qtd) + 2 * larg)
    comp_parede_interna = float(comp_int) if comp_int is not None else ((qtd - 1) * larg)

    esq = config.get("esquadrias_extras") or {}
    portas_extras = int(esq.get("portas", 0))
    tamanhos_portas = list(esq.get("tamanhos_portas") or [])
    while len(tamanhos_portas) < portas_extras:
        tamanhos_portas.append("80x210")
    tamanhos_portas = tamanhos_portas[:portas_extras]

    area_portas_extras = sum(_porta_area(s) for s in tamanhos_portas)
    area_portas_ext = PORTA_ENTRADA_M2 + area_portas_extras

    caixilhos = list(esq.get("caixilhos") or [])
    area_caixilhos = 0.0
    num_janelas = 0
    num_portas_vidro = 0
    for c in caixilhos:
        area_caixilhos += float(c.get("largura_m", 0)) * float(c.get("altura_m", 0)) * int(c.get("qtd", 0))
        if c.get("tipo") == "janela":
            num_janelas += int(c.get("qtd", 0))
        elif c.get("tipo") == "porta_vidro":
            num_portas_vidro += int(c.get("qtd", 0))

    area_aberturas_ext = area_portas_ext + area_caixilhos

    area_fechamento_ext_bruta = perimetro * pe
    area_fechamento_ext = max(0.0, area_fechamento_ext_bruta - area_aberturas_ext)

    tem_wc = bool(config.get("tem_wc", False))
    area_porta_wc = PORTA_WC_M2 if tem_wc else 0.0
    area_parede_interna_bruta = comp_parede_interna * pe * 2
    area_parede_interna = max(0.0, area_parede_interna_bruta - 2 * area_porta_wc)

    # WC ocupa fração _WC_WALL_FRACTION do comprimento interno quando ativo.
    comp_parede_wc = comp_parede_interna * _WC_WALL_FRACTION if tem_wc else 0.0
    area_parede_wc_bruta = comp_parede_wc * pe * 2
    area_parede_wc = max(0.0, area_parede_wc_bruta - 2 * area_porta_wc)
    area_parede_interna_nao_wc = max(0.0, area_parede_interna - area_parede_wc)

    num_portas_ext = 1 + portas_extras

    return {
        "area_planta_m2": area_planta,
        "perimetro_externo_m": perimetro,
        "area_fechamento_ext_bruta_m2": round(area_fechamento_ext_bruta, 6),
        "area_fechamento_ext_m2": round(area_fechamento_ext, 6),
        "area_aberturas_ext_m2": round(area_aberturas_ext, 6),
        "area_cobertura_m2": area_cobertura,
        "comp_parede_interna_m": comp_parede_interna,
        "area_parede_interna_bruta_m2": round(area_parede_interna_bruta, 6),
        "area_parede_interna_m2": round(area_parede_interna, 6),
        "area_parede_wc_m2": round(area_parede_wc, 6),
        "area_parede_interna_nao_wc_m2": round(area_parede_interna_nao_wc, 6),
        "area_caixilhos_m2": round(area_caixilhos, 6),
        "num_portas_ext": num_portas_ext,
        "num_janelas": num_janelas,
        "num_portas_vidro": num_portas_vidro,
        "tem_wc": tem_wc,
        "num_splits": int(config.get("num_splits", 0)),
    }
```

- [ ] **Step 4: Rodar e verificar sucesso**

```bash
cd backend && uv run pytest tests/test_variables.py -v
```

Expected: todos os testes passam (incluindo os existentes).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/variables.py backend/tests/test_variables.py
git commit -m "feat(backend): derive expoe area_parede_wc, nao_wc e caixilhos"
```

---

## Task 9: Atualizar pydantic `Configuracao`

**Files:**
- Modify: `backend/app/models/quote.py`

- [ ] **Step 1: Adicionar `combos` e `template_aplicado` ao `Configuracao`**

Substituir a classe `Configuracao` no arquivo `backend/app/models/quote.py` por:

```python
class Configuracao(BaseModel):
    tamanho_modulo: Literal["3x3", "3x6", "3x9"]
    qtd_modulos: int = Field(ge=1, le=3)
    pe_direito_m: float = Field(ge=2.4, le=3.5)
    acabamento_ext: Literal["textura", "pintura", "cimenticia"] | None = "textura"
    cor_ext: str | None = None

    # LEGADO (onda 1): pre-onda 3. Mantido opcional para retrocompatibilidade.
    # O adapter `normalize_configuracao` traduz para `combos` antes do calculo.
    pacote_acabamento: Literal["padrao", "premium", "personalizado"] | None = None
    itens_personalizados: list[ItemPersonalizado] = Field(default_factory=list)

    # ONDA 3: slug do template aplicado na origem (so UI).
    template_aplicado: Literal["basico", "premium", "personalizado"] | None = None
    # ONDA 3: combo selecionado por categoria; keys: fechamento_ext, cobertura,
    # forro, divisoria, divisoria_wc, piso, subpiso, vidro.
    combos: dict[str, str] = Field(default_factory=dict)

    esquadrias_extras: EsquadriasExtras = EsquadriasExtras(portas=0)
    piso: Literal["vinilico", "ceramico", "porcelanato"] | None = "vinilico"
    piso_cor: str | None = None
    tem_wc: bool = False
    wc_itens: WcItens = WcItens()
    num_splits: int = Field(ge=0, le=6, default=0)
    comp_paredes_ext_m: float | None = Field(default=None, ge=0)
    comp_paredes_int_m: float | None = Field(default=None, ge=0)
```

- [ ] **Step 2: Rodar suite de testes (não deve quebrar)**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: todos os testes existentes continuam passando.

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/quote.py
git commit -m "feat(backend): Configuracao aceita combos e template_aplicado"
```

---

## Task 10: Adapter `normalize_configuracao`

**Files:**
- Create: `backend/app/services/configuracao_normalizer.py`
- Create: `backend/tests/test_configuracao_normalizer.py`

- [ ] **Step 1: Escrever teste falho**

Criar `backend/tests/test_configuracao_normalizer.py`:

```python
"""Tests for legacy -> novo configuracao adapter."""
from app.services.configuracao_normalizer import normalize_configuracao


# Sample template_selections returned by repository.get_template_by_slug (mock shape).
BASICO_SELECOES = {
    "fechamento_ext": "fechamento-standard",
    "cobertura": "cobertura-standard",
    "forro": "forro-standard",
    "divisoria": "divisoria-simples",
    "piso": "piso-vinilico",
    "subpiso": "subpiso-seco",
    "vidro": "vidro-simples",
}
PREMIUM_SELECOES = {
    "fechamento_ext": "fechamento-premium",
    "cobertura": "cobertura-termica",
    "forro": "forro-acustico",
    "divisoria": "divisoria-acustica",
    "piso": "piso-porcelanato",
    "subpiso": "subpiso-seco",
    "vidro": "vidro-duplo",
}
TEMPLATES_BY_SLUG = {"basico": BASICO_SELECOES, "premium": PREMIUM_SELECOES}


def test_normalize_legacy_pacote_padrao_maps_to_basico():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "pacote_acabamento": "padrao",
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"] == BASICO_SELECOES
    assert result["template_aplicado"] == "basico"


def test_normalize_legacy_pacote_premium_maps_to_premium():
    config = {
        "tamanho_modulo": "3x9",
        "qtd_modulos": 1,
        "pe_direito_m": 3.0,
        "pacote_acabamento": "premium",
        "tem_wc": True,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"] == PREMIUM_SELECOES
    assert result["template_aplicado"] == "premium"
    # divisoria_wc auto-aplica quando tem_wc
    assert result["combos"].get("divisoria_wc") == "divisoria-umida"


def test_normalize_legacy_pacote_personalizado_uses_basico_defaults():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "pacote_acabamento": "personalizado",
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"] == BASICO_SELECOES
    assert result["template_aplicado"] == "personalizado"


def test_normalize_new_shape_passes_through():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "combos": {"fechamento_ext": "fechamento-acustico", "cobertura": "cobertura-standard"},
        "template_aplicado": "personalizado",
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"]["fechamento_ext"] == "fechamento-acustico"
    assert result["template_aplicado"] == "personalizado"


def test_normalize_wc_true_injects_divisoria_wc():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "combos": {"fechamento_ext": "fechamento-standard"},
        "tem_wc": True,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert result["combos"]["divisoria_wc"] == "divisoria-umida"


def test_normalize_wc_false_drops_divisoria_wc():
    config = {
        "tamanho_modulo": "3x6",
        "qtd_modulos": 1,
        "pe_direito_m": 2.7,
        "combos": {
            "fechamento_ext": "fechamento-standard",
            "divisoria_wc": "divisoria-umida",
        },
        "tem_wc": False,
    }
    result = normalize_configuracao(config, templates=TEMPLATES_BY_SLUG)
    assert "divisoria_wc" not in result["combos"]
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
cd backend && uv run pytest tests/test_configuracao_normalizer.py -v
```

Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `backend/app/services/configuracao_normalizer.py`**

```python
"""Traduz Configuracao de forma legada (pacote_acabamento) para a nova (combos).

Idempotente: se a config ja tem `combos` populado, retorna como veio; apenas injeta
`divisoria_wc` conforme `tem_wc`.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

# Slug fixo do combo do WC (auto-aplicado quando tem_wc=True).
WC_COMBO_SLUG = "divisoria-umida"
WC_CATEGORIA = "divisoria_wc"


def _apply_wc_rule(combos: dict[str, str], tem_wc: bool) -> dict[str, str]:
    """Garante que divisoria_wc esteja presente <=> tem_wc."""
    out = dict(combos)
    if tem_wc:
        out[WC_CATEGORIA] = WC_COMBO_SLUG
    else:
        out.pop(WC_CATEGORIA, None)
    return out


def normalize_configuracao(
    config: dict[str, Any],
    *,
    templates: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """Retorna uma configuracao com `combos` e `template_aplicado` preenchidos.

    - Se `combos` ja existe e e nao-vazio, pass-through (apenas aplica WC rule).
    - Caso contrario, traduz `pacote_acabamento` (legado):
        padrao        -> template basico
        premium       -> template premium
        personalizado -> template basico (defaults)
    - Se nem `combos` nem `pacote_acabamento` estao definidos, assume basico.

    `templates` e um dict {slug: {categoria: combo_slug}}.
    """
    out = deepcopy(config)
    tem_wc = bool(out.get("tem_wc", False))

    combos = dict(out.get("combos") or {})

    if combos:
        out["combos"] = _apply_wc_rule(combos, tem_wc)
        if "template_aplicado" not in out or out.get("template_aplicado") is None:
            out["template_aplicado"] = "personalizado"
        return out

    legacy = out.get("pacote_acabamento")
    if legacy == "premium" and "premium" in templates:
        base_template = "premium"
        template_aplicado = "premium"
    elif legacy == "personalizado":
        base_template = "basico"
        template_aplicado = "personalizado"
    else:
        base_template = "basico"
        template_aplicado = "basico"

    out["combos"] = _apply_wc_rule(dict(templates[base_template]), tem_wc)
    out["template_aplicado"] = template_aplicado
    return out
```

- [ ] **Step 4: Rodar e verificar sucesso**

```bash
cd backend && uv run pytest tests/test_configuracao_normalizer.py -v
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/configuracao_normalizer.py backend/tests/test_configuracao_normalizer.py
git commit -m "feat(backend): adapter normalize_configuracao traduz legado para combos"
```

---

## Task 11: Helpers de repositório para combos e templates

**Files:**
- Modify: `backend/app/lib/repository.py`

- [ ] **Step 1: Adicionar helpers ao fim de `backend/app/lib/repository.py`**

```python
def list_combos() -> list[dict[str, Any]]:
    """Retorna todos os combos ativos com lista de (material, formula) por combo."""
    sb = get_admin_client()
    combos = (
        sb.table("pacote_combo")
        .select("*")
        .eq("ativo", True)
        .order("categoria")
        .order("ordem")
        .execute()
        .data
        or []
    )
    if not combos:
        return []
    combo_ids = [c["id"] for c in combos]
    mats = (
        sb.table("pacote_combo_material")
        .select("*, material(*)")
        .in_("pacote_combo_id", combo_ids)
        .order("ordem")
        .execute()
        .data
        or []
    )
    by_combo: dict[str, list[dict[str, Any]]] = {}
    for m in mats:
        by_combo.setdefault(m["pacote_combo_id"], []).append(m)
    for c in combos:
        c["materiais"] = by_combo.get(c["id"], [])
    return combos


def get_combos_by_slugs(slugs: list[str]) -> dict[str, dict[str, Any]]:
    """Retorna {slug: combo_com_materiais} para a lista de slugs informada."""
    if not slugs:
        return {}
    sb = get_admin_client()
    combos = (
        sb.table("pacote_combo")
        .select("*")
        .in_("slug", slugs)
        .eq("ativo", True)
        .execute()
        .data
        or []
    )
    if not combos:
        return {}
    combo_ids = [c["id"] for c in combos]
    mats = (
        sb.table("pacote_combo_material")
        .select("*, material(*)")
        .in_("pacote_combo_id", combo_ids)
        .order("ordem")
        .execute()
        .data
        or []
    )
    by_combo: dict[str, list[dict[str, Any]]] = {}
    for m in mats:
        by_combo.setdefault(m["pacote_combo_id"], []).append(m)
    return {c["slug"]: {**c, "materiais": by_combo.get(c["id"], [])} for c in combos}


def list_templates() -> list[dict[str, Any]]:
    """Retorna templates com selecoes {categoria: combo_slug}."""
    sb = get_admin_client()
    templates = (
        sb.table("template_orcamento").select("*").order("ordem").execute().data or []
    )
    if not templates:
        return []
    template_ids = [t["id"] for t in templates]
    selecoes = (
        sb.table("template_orcamento_selecao")
        .select("*, pacote_combo(slug)")
        .in_("template_id", template_ids)
        .execute()
        .data
        or []
    )
    by_template: dict[str, dict[str, str]] = {}
    for s in selecoes:
        by_template.setdefault(s["template_id"], {})[s["categoria"]] = s["pacote_combo"]["slug"]
    for t in templates:
        t["selecoes"] = by_template.get(t["id"], {})
    return templates


def get_templates_by_slug() -> dict[str, dict[str, str]]:
    """Retorna {template_slug: {categoria: combo_slug}} para uso do adapter."""
    return {t["slug"]: t["selecoes"] for t in list_templates()}
```

- [ ] **Step 2: Smoke test manual (rapido, nao automatizado)**

```bash
cd backend && uv run python -c "
from app.lib import repository
print('combos:', len(repository.list_combos()))
print('templates:', list(repository.get_templates_by_slug().keys()))
"
```

Expected: `combos: 21`, `templates: ['basico', 'premium']`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/lib/repository.py
git commit -m "feat(backend): helpers de repositorio para combos e templates"
```

---

## Task 12: Serviço `combo_service.calcular_itens_bom`

Converte os combos selecionados + materiais do combo em regras BOM sintéticas compatíveis com `bom_engine.evaluate`.

**Files:**
- Create: `backend/app/services/combo_service.py`
- Create: `backend/tests/test_combo_service.py`

- [ ] **Step 1: Escrever teste falho**

Criar `backend/tests/test_combo_service.py`:

```python
"""Tests for combo_service — converte combos selecionados em regras BOM sinteticas."""
from app.services.combo_service import calcular_itens_bom


def _combo(slug: str, categoria: str, materiais: list[dict]) -> dict:
    return {
        "id": slug,
        "slug": slug,
        "categoria": categoria,
        "nome": slug,
        "materiais": materiais,
    }


def _combo_material(material_id: str, sku: str, preco: float, formula: dict, ordem: int = 0) -> dict:
    return {
        "material_id": material_id,
        "material": {
            "id": material_id,
            "sku": sku,
            "nome": sku,
            "unidade": "m2",
            "preco_unitario": preco,
        },
        "formula_json": formula,
        "ordem": ordem,
    }


def test_calcular_itens_bom_returns_empty_for_no_selections():
    assert calcular_itens_bom({}, combos_by_slug={}) == []


def test_calcular_itens_bom_converts_single_combo_to_bom_rules():
    combo = _combo("fechamento-standard", "fechamento_ext", [
        _combo_material("m1", "MT-FCH-001", 219.9,
                         {"op": "var", "of": "area_fechamento_ext_m2"}, 1),
    ])
    selections = {"fechamento_ext": "fechamento-standard"}
    rules = calcular_itens_bom(selections, combos_by_slug={"fechamento-standard": combo})

    assert len(rules) == 1
    r = rules[0]
    assert r["material_id"] == "m1"
    assert r["tier"] == "core"
    assert r["categoria"] == "fechamento_ext"
    assert r["combo_slug"] == "fechamento-standard"
    assert r["formula_json"] == {"op": "var", "of": "area_fechamento_ext_m2"}


def test_calcular_itens_bom_respects_ordem():
    combo = _combo("c1", "cobertura", [
        _combo_material("m2", "MT-COB-002", 50.0, 1, ordem=2),
        _combo_material("m1", "MT-COB-001", 110.0, 1, ordem=1),
    ])
    rules = calcular_itens_bom({"cobertura": "c1"}, combos_by_slug={"c1": combo})
    assert [r["ordem"] for r in rules] == [1, 2]  # combo_service preserva ordem das materiais


def test_calcular_itens_bom_skips_combos_not_in_map():
    selections = {"fechamento_ext": "fechamento-inexistente"}
    rules = calcular_itens_bom(selections, combos_by_slug={})
    assert rules == []


def test_calcular_itens_bom_multiple_combos():
    combo_a = _combo("a", "fechamento_ext", [_combo_material("m1", "X", 10.0, 1)])
    combo_b = _combo("b", "cobertura", [_combo_material("m2", "Y", 20.0, 1)])
    selections = {"fechamento_ext": "a", "cobertura": "b"}
    rules = calcular_itens_bom(selections, combos_by_slug={"a": combo_a, "b": combo_b})
    assert len(rules) == 2
    cats = {r["categoria"] for r in rules}
    assert cats == {"fechamento_ext", "cobertura"}
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
cd backend && uv run pytest tests/test_combo_service.py -v
```

Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `backend/app/services/combo_service.py`**

```python
"""Converte selecoes de combos em regras BOM sinteticas consumiveis por bom_engine."""
from __future__ import annotations

from typing import Any


def calcular_itens_bom(
    selections: dict[str, str],
    *,
    combos_by_slug: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Dado {categoria: combo_slug} e mapa de slugs -> combo completo (com materiais),
    retorna lista de regras BOM sinteticas compativeis com quote_calculator.calculate.

    Cada regra carrega:
        material_id, material (dict), formula_json, tier ('core'), categoria (da categoria
        do combo), ordem (da material no combo, ofuscada por categoria).
    """
    rules: list[dict[str, Any]] = []
    # ordem global: cada categoria ganha um bloco de 100 posicoes para nao colidir.
    for cat_idx, (categoria, slug) in enumerate(selections.items()):
        combo = combos_by_slug.get(slug)
        if not combo:
            continue
        base_ordem = (cat_idx + 1) * 100
        for m in combo.get("materiais", []):
            rules.append({
                "material_id": m["material_id"],
                "material": m["material"],
                "formula_json": m["formula_json"],
                "tier": "core",
                "categoria": categoria,
                "combo_slug": combo["slug"],
                "ordem": base_ordem + int(m.get("ordem", 0)),
            })
    return rules
```

- [ ] **Step 4: Rodar e verificar sucesso**

```bash
cd backend && uv run pytest tests/test_combo_service.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/combo_service.py backend/tests/test_combo_service.py
git commit -m "feat(backend): combo_service converte combos selecionados em regras BOM"
```

---

## Task 13: União de BOM geometria + combos em `quote_calculator`

`calculate()` passa a aceitar `combos_bom` como lista adicional de regras (gerada por `combo_service.calcular_itens_bom`), unindo com as regras de `produto_bom_regra`.

**Files:**
- Modify: `backend/app/services/quote_calculator.py`
- Modify: `backend/tests/test_quote_calculator.py`

- [ ] **Step 1: Escrever teste falho**

Apensar ao final de `backend/tests/test_quote_calculator.py`:

```python
def test_calculate_unions_geometry_bom_with_combos_bom():
    geometry_bom = [
        {
            "material_id": "m1",
            "material": _material("m1", "Perfil LSF", "MT-LSF-001", "kg", 14.0),
            "formula_json": {"op": "mul", "of": [{"op": "var", "of": "area_planta_m2"}, 30]},
            "tier": "core",
            "categoria": "estrutura",
            "ordem": 1,
        },
    ]
    combos_bom = [
        {
            "material_id": "m2",
            "material": _material("m2", "Glasroc-X", "MT-FCH-001", "pc", 219.90),
            "formula_json": {"op": "ceil", "of": {"op": "div", "of": [
                {"op": "var", "of": "area_fechamento_ext_m2"}, 2.88,
            ]}},
            "tier": "core",
            "categoria": "fechamento_ext",
            "combo_slug": "fechamento-standard",
            "ordem": 101,
        },
    ]
    config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "esquadrias_extras": {"portas": 0, "janelas": 0},
        "tem_wc": False, "num_splits": 0,
    }
    result = calculate(
        geometry_bom, config, tier="core", gerenciamento_pct=8.0, combos_bom=combos_bom,
    )
    assert len(result["itens"]) == 2
    skus = {i["descricao"] for i in result["itens"]}
    assert "Perfil LSF" in skus
    assert "Glasroc-X" in skus
    # primeiro item e da geometria (ordem=1), segundo do combo (ordem=101)
    assert result["itens"][0]["descricao"] == "Perfil LSF"
    assert result["itens"][1]["descricao"] == "Glasroc-X"


def test_calculate_without_combos_bom_stays_backward_compatible():
    bom = [
        {
            "material_id": "m1",
            "material": _material("m1", "Perfil LSF", "MT-LSF-001", "kg", 14.0),
            "formula_json": {"op": "mul", "of": [{"op": "var", "of": "area_planta_m2"}, 30]},
            "tier": "core",
            "categoria": "estrutura",
            "ordem": 1,
        },
    ]
    config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "esquadrias_extras": {"portas": 0, "janelas": 0},
        "tem_wc": False, "num_splits": 0,
    }
    result = calculate(bom, config, tier="core", gerenciamento_pct=8.0)
    assert len(result["itens"]) == 1
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
cd backend && uv run pytest tests/test_quote_calculator.py::test_calculate_unions_geometry_bom_with_combos_bom -v
```

Expected: FAIL — `calculate() got an unexpected keyword argument 'combos_bom'`.

- [ ] **Step 3: Modificar `backend/app/services/quote_calculator.py`**

```python
from __future__ import annotations

from typing import Any

from app.services.bom_engine import evaluate
from app.services.variables import derive


def calculate(
    bom: list[dict[str, Any]],
    config: dict[str, Any],
    *,
    tier: str,
    gerenciamento_pct: float,
    combos_bom: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Itera regras BOM (geometria) + regras combo (sinteticas) e gera orcamento.

    `combos_bom` e opcional; se fornecido, e uniao com `bom`. As regras combo
    carregam um campo extra `combo_slug` que e preservado em cada item gerado.
    """
    vars = derive(config)
    all_rules = list(bom)
    if combos_bom:
        all_rules.extend(combos_bom)

    # ordenacao estavel: ordem crescente; ties quebram pela categoria (alfabetico).
    all_rules.sort(key=lambda r: (int(r.get("ordem", 0)), str(r.get("categoria", ""))))

    itens: list[dict[str, Any]] = []
    subtotal = 0.0

    for regra in all_rules:
        if tier == "core" and regra["tier"] != "core":
            continue

        qty_raw = evaluate(regra["formula_json"], vars)
        qty = float(qty_raw) if isinstance(qty_raw, (int, float)) else 0.0
        if qty <= 0:
            continue

        material = regra["material"]
        preco = float(material["preco_unitario"])
        sub = round(qty * preco, 2)
        subtotal += sub

        item: dict[str, Any] = {
            "material_id": regra["material_id"],
            "descricao": material["nome"],
            "unidade": material["unidade"],
            "quantidade": round(qty, 3),
            "preco_unitario": preco,
            "subtotal": sub,
            "tier": regra["tier"],
            "categoria": regra["categoria"],
            "ordem": regra["ordem"],
        }
        if regra.get("combo_slug"):
            item["combo_slug"] = regra["combo_slug"]
        itens.append(item)

    subtotal = round(subtotal, 2)
    total = round(subtotal * (1 + gerenciamento_pct / 100), 2)

    return {
        "itens": itens,
        "variaveis": vars,
        "subtotal": subtotal,
        "gerenciamento_pct": gerenciamento_pct,
        "total": total,
    }
```

- [ ] **Step 4: Rodar suite completa**

```bash
cd backend && uv run pytest tests/test_quote_calculator.py -v
```

Expected: todos os testes passam (2 novos + existentes).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/quote_calculator.py backend/tests/test_quote_calculator.py
git commit -m "feat(backend): calculate aceita combos_bom e faz uniao com geometria"
```

---

## Task 14: Router `/api/combos` e `/api/templates`

**Files:**
- Create: `backend/app/routers/combos.py`
- Modify: `backend/app/main.py` (registrar router)

- [ ] **Step 1: Criar `backend/app/routers/combos.py`**

```python
"""Endpoints publicos de leitura: combos e templates."""
from __future__ import annotations

from fastapi import APIRouter

from app.lib import repository

router = APIRouter(prefix="/api", tags=["combos"])


@router.get("/combos")
def list_combos():
    """Lista todos os combos ativos, agrupados por categoria.

    Retorno: lista de combos com seus materiais (material + formula_json).
    Cliente usa pra montar cards e calcular Delta-vs-Standard localmente.
    """
    return repository.list_combos()


@router.get("/templates")
def list_templates():
    """Lista templates (basico, premium) com selecoes {categoria: combo_slug}."""
    return repository.list_templates()
```

- [ ] **Step 2: Registrar em `backend/app/main.py`**

Localizar a seção onde outros routers são incluídos (ex: `app.include_router(quote.router)`) e adicionar:

```python
from app.routers import combos as combos_router
app.include_router(combos_router.router)
```

- [ ] **Step 3: Smoke test manual**

Com o backend rodando (`make dev` em outro terminal):

```bash
curl -s http://localhost:8000/api/combos | python -m json.tool | head -40
curl -s http://localhost:8000/api/templates | python -m json.tool
```

Expected: `/api/combos` retorna array com 21 combos, cada um com array `materiais`. `/api/templates` retorna 2 templates com mapeamento `selecoes`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/combos.py backend/app/main.py
git commit -m "feat(backend): endpoints GET /api/combos e GET /api/templates"
```

---

## Task 15: Integrar `normalize_configuracao` e combos nos endpoints de quote

**Files:**
- Modify: `backend/app/routers/quote.py`
- Modify: `backend/app/routers/public_quote.py`

- [ ] **Step 1: Atualizar `backend/app/routers/quote.py`**

Substituir as funções `internal_calculate` e `create_internal` para aplicar o normalizer + combo_service. O arquivo inteiro fica:

```python
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.lib import repository
from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, SubmitRequest
from app.services.combo_service import calcular_itens_bom
from app.services.configuracao_normalizer import normalize_configuracao
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/quote", tags=["quote"])


def _build_combos_bom(combos_selections: dict[str, str]) -> list[dict]:
    if not combos_selections:
        return []
    slugs = list(combos_selections.values())
    combos_by_slug = repository.get_combos_by_slugs(slugs)
    return calcular_itens_bom(combos_selections, combos_by_slug=combos_by_slug)


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    res = sb.table("orcamento").select("*").order("created_at", desc=True).execute()
    return res.data or []


@router.post("/calculate")
def internal_calculate(
    req: CalculateRequest,
    tier: str = "full",
    user=Depends(require_role("admin", "vendedor")),
):
    if tier not in ("core", "full"):
        raise HTTPException(400, "tier inválido")
    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    bom = repository.list_bom_regras(req.produto_id)
    combos_bom = _build_combos_bom(config.get("combos") or {})
    return calculate(
        bom, config, tier=tier, gerenciamento_pct=8.0, combos_bom=combos_bom,
    )


@router.post("")
def create_internal(
    req: SubmitRequest,
    enviar_email: bool = True,
    user=Depends(require_role("admin", "vendedor")),
):
    from app.services.quote_finalize import finalize

    sb = get_admin_client()
    p = sb.table("produto").select("*").eq("id", req.produto_id).limit(1).execute().data
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    produto = p[0]

    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    bom = repository.list_bom_regras(req.produto_id)
    combos_bom = _build_combos_bom(config.get("combos") or {})
    quote = calculate(bom, config, tier="full", gerenciamento_pct=8.0, combos_bom=combos_bom)

    year = datetime.utcnow().year
    payload = {
        "_year": year,
        "cliente_nome": req.cliente_nome, "cliente_email": req.cliente_email,
        "cliente_telefone": req.cliente_telefone, "produto_id": req.produto_id,
        "finalidade": req.finalidade, "configuracao_json": config,
        "tipo": "interno", "tier_aplicado": "full",
        "valor_subtotal": quote["subtotal"],
        "valor_gerenciamento_pct": quote["gerenciamento_pct"],
        "valor_total": quote["total"],
        "status": "enviado" if enviar_email else "rascunho",
        "criado_por": user["id"],
    }
    orc = repository.insert_orcamento(payload)
    repository.insert_orcamento_itens(orc["id"], [
        {k: v for k, v in it.items() if k in {
            "material_id", "descricao", "unidade", "quantidade", "preco_unitario",
            "subtotal", "tier", "categoria", "ordem",
        }} for it in quote["itens"]
    ])

    if enviar_email:
        pdf_url = finalize(
            orcamento=orc, produto=produto, itens=quote["itens"], config=config,
            cliente_nome=req.cliente_nome, cliente_email=req.cliente_email,
            finalidade=req.finalidade,
        )
        orc["pdf_url"] = pdf_url

    return orc


@router.patch("/{orcamento_id}")
def patch_orcamento(
    orcamento_id: str, body: dict,
    user=Depends(require_role("admin", "vendedor")),
):
    allowed = {"status", "cliente_nome", "cliente_email", "cliente_telefone", "finalidade"}
    patch = {k: v for k, v in body.items() if k in allowed}
    if not patch:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()
    sb.table("orcamento").update(patch).eq("id", orcamento_id).execute()
    return sb.table("orcamento").select("*").eq("id", orcamento_id).limit(1).execute().data[0]
```

- [ ] **Step 2: Atualizar `backend/app/routers/public_quote.py`**

Aplicar o mesmo padrão nas funções `public_calculate` e `public_submit`:

```python
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.lib import repository
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, QuoteResponse, SubmitRequest
from app.services import storage
from app.services.combo_service import calcular_itens_bom
from app.services.configuracao_normalizer import normalize_configuracao
from app.services.email_sender import send_cliente_email, send_metalfort_notification
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


def _build_combos_bom(combos_selections: dict[str, str]) -> list[dict]:
    if not combos_selections:
        return []
    slugs = list(combos_selections.values())
    combos_by_slug = repository.get_combos_by_slugs(slugs)
    return calcular_itens_bom(combos_selections, combos_by_slug=combos_by_slug)


@router.get("/produtos")
def list_produtos():
    return repository.list_produtos_ativos()


@router.get("/materiais")
def list_materiais():
    return repository.list_materiais_ativos()


@router.get("/produto/{slug}")
def get_produto(slug: str):
    produto = repository.get_produto_by_slug(slug)
    if not produto:
        raise HTTPException(404, "Produto não encontrado")
    produto["opcoes"] = repository.list_opcoes(produto["id"])
    return produto


def _append_personalizados(bom: list[dict], config: dict) -> list[dict]:
    itens = config.get("itens_personalizados") or []
    if not itens:
        return bom
    materiais = repository.get_materiais_by_ids([it["material_id"] for it in itens])
    extras = []
    for i, it in enumerate(itens):
        mat = materiais.get(it["material_id"])
        if not mat:
            continue
        extras.append({
            "material_id": it["material_id"],
            "material": mat,
            "formula_json": float(it["qtd"]),
            "tier": "core",
            "categoria": "personalizado",
            "ordem": 10000 + i,
        })
    return bom + extras


@router.post("/quote/calculate", response_model=QuoteResponse)
@limiter.limit("10/minute")
def public_calculate(request: Request, req: CalculateRequest):
    bom = repository.list_bom_regras(req.produto_id)
    if not bom:
        raise HTTPException(404, "Produto sem BOM cadastrada")
    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    combos_bom = _build_combos_bom(config.get("combos") or {})
    return calculate(
        _append_personalizados(bom, config), config,
        tier="core", gerenciamento_pct=8.0, combos_bom=combos_bom,
    )


@router.post("/quote/submit")
@limiter.limit("5/minute")
def public_submit(request: Request, req: SubmitRequest):
    from app.services.quote_finalize import finalize

    sb = get_admin_client()
    p = sb.table("produto").select("*").eq("id", req.produto_id).limit(1).execute().data
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    produto = p[0]

    bom = repository.list_bom_regras(req.produto_id)
    templates = repository.get_templates_by_slug()
    config = normalize_configuracao(req.configuracao.model_dump(), templates=templates)
    combos_bom = _build_combos_bom(config.get("combos") or {})
    quote = calculate(
        _append_personalizados(bom, config), config,
        tier="core", gerenciamento_pct=8.0, combos_bom=combos_bom,
    )

    year = datetime.utcnow().year
    payload = {
        "_year": year,
        "cliente_nome": req.cliente_nome,
        "cliente_email": req.cliente_email,
        "cliente_telefone": req.cliente_telefone,
        "produto_id": produto["id"],
        "finalidade": req.finalidade,
        "configuracao_json": config,
        "tipo": "publico",
        "tier_aplicado": "core",
        "valor_subtotal": quote["subtotal"],
        "valor_gerenciamento_pct": quote["gerenciamento_pct"],
        "valor_total": quote["total"],
        "status": "enviado",
    }
    orcamento = repository.insert_orcamento(payload)
    repository.insert_orcamento_itens(orcamento["id"], [
        {k: v for k, v in it.items() if k in {
            "material_id", "descricao", "unidade", "quantidade", "preco_unitario",
            "subtotal", "tier", "categoria", "ordem",
        }} for it in quote["itens"]
    ])

    pdf_url = finalize(
        orcamento=orcamento, produto=produto, itens=quote["itens"], config=config,
        cliente_nome=req.cliente_nome, cliente_email=req.cliente_email,
        finalidade=req.finalidade,
    )
    return {"numero": orcamento["numero"], "pdf_url": pdf_url}
```

- [ ] **Step 3: Rodar suite completa**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: todos passam.

- [ ] **Step 4: Smoke test manual — backend rodando via `make dev`**

Terminal 1: `cd erp-metalfort && make dev` (já deve estar rodando).

Terminal 2 — primeiro capturar o produto_id:

```bash
PROD=$(curl -s http://localhost:8000/api/public/produtos | python -c 'import json,sys; d=json.load(sys.stdin); print([p["id"] for p in d if p["slug"]=="metalfort-home"][0])')
echo "produto_id=$PROD"
```

Depois, teste com shape legado:

```bash
curl -s -X POST http://localhost:8000/api/public/quote/calculate \
  -H 'Content-Type: application/json' \
  -d "{
    \"produto_id\": \"$PROD\",
    \"configuracao\": {
      \"tamanho_modulo\": \"3x6\", \"qtd_modulos\": 1, \"pe_direito_m\": 2.7,
      \"pacote_acabamento\": \"padrao\", \"tem_wc\": true,
      \"esquadrias_extras\": {\"portas\": 0, \"caixilhos\": []}
    }
  }" | python -m json.tool | head -30
```

Expected: resposta JSON com `itens`, `subtotal`, `total`. Itens incluem materiais vindos dos combos (ex: `MT-FCH-001 Placa Glasroc-X`, `MT-DRW-008 Placa gesso RU` do WC).

Segundo teste — request na forma nova (`combos` em vez de `pacote_acabamento`):

```bash
curl -s -X POST http://localhost:8000/api/public/quote/calculate \
  -H 'Content-Type: application/json' \
  -d "{
    \"produto_id\": \"$PROD\",
    \"configuracao\": {
      \"tamanho_modulo\": \"3x6\", \"qtd_modulos\": 1, \"pe_direito_m\": 2.7,
      \"combos\": {
        \"fechamento_ext\": \"fechamento-premium\",
        \"cobertura\": \"cobertura-termica\",
        \"forro\": \"forro-acustico\",
        \"divisoria\": \"divisoria-acustica\",
        \"piso\": \"piso-porcelanato\",
        \"subpiso\": \"subpiso-seco\",
        \"vidro\": \"vidro-duplo\"
      },
      \"tem_wc\": false,
      \"esquadrias_extras\": {\"portas\": 0, \"caixilhos\": []}
    }
  }" | python -m json.tool | head -30
```

Expected: `total` maior que o primeiro (premium puxa mais SKUs e mais caros). Itens trazem `combo_slug` nas linhas com categoria combo.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/quote.py backend/app/routers/public_quote.py
git commit -m "feat(backend): endpoints de quote aplicam normalize + uniao com combos"
```

---

## Task 16: Teste de integração gated por `RUN_INTEGRATION=1`

**Files:**
- Create: `backend/tests/test_combos_api.py`

- [ ] **Step 1: Criar teste de integração**

```python
"""Integration tests — requerem backend rodando via `make dev`.

Gated por RUN_INTEGRATION=1. Usa produto metalfort-home existente em seed.
"""
import os

import httpx
import pytest

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INTEGRATION") != "1",
    reason="Integration test (needs make dev running; set RUN_INTEGRATION=1)",
)


@pytest.fixture(scope="module")
def produto_id() -> str:
    res = httpx.get(f"{BACKEND_URL}/api/public/produtos")
    res.raise_for_status()
    prods = res.json()
    home = next(p for p in prods if p["slug"] == "metalfort-home")
    return home["id"]


def test_combos_endpoint_lists_21():
    res = httpx.get(f"{BACKEND_URL}/api/combos")
    res.raise_for_status()
    combos = res.json()
    assert len(combos) == 21
    cats = {c["categoria"] for c in combos}
    assert cats == {
        "fechamento_ext", "cobertura", "forro", "divisoria", "divisoria_wc",
        "piso", "subpiso", "vidro",
    }


def test_templates_endpoint_lists_basico_premium():
    res = httpx.get(f"{BACKEND_URL}/api/templates")
    res.raise_for_status()
    templates = res.json()
    slugs = {t["slug"] for t in templates}
    assert slugs == {"basico", "premium"}
    basico = next(t for t in templates if t["slug"] == "basico")
    assert basico["selecoes"]["fechamento_ext"] == "fechamento-standard"


def test_calculate_basico_vs_premium_totals(produto_id: str):
    base_config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "tem_wc": False,
        "esquadrias_extras": {"portas": 0, "caixilhos": []},
    }
    basico = {**base_config, "pacote_acabamento": "padrao"}
    premium = {**base_config, "pacote_acabamento": "premium"}

    r1 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": basico})
    r2 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": premium})
    r1.raise_for_status(); r2.raise_for_status()
    q1, q2 = r1.json(), r2.json()

    assert q2["total"] > q1["total"], f"Premium deveria custar mais (q1={q1['total']}, q2={q2['total']})"
    # combos aplicados estao refletidos nos itens
    slugs_q2 = {i.get("combo_slug") for i in q2["itens"] if i.get("combo_slug")}
    assert "fechamento-premium" in slugs_q2


def test_calculate_new_shape_vs_legacy_produce_identical_totals(produto_id: str):
    """Mesmo resultado via pacote_acabamento='padrao' (legado) ou combos=basico (novo)."""
    base = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "tem_wc": False,
        "esquadrias_extras": {"portas": 0, "caixilhos": []},
    }
    legacy = {**base, "pacote_acabamento": "padrao"}
    novo = {**base, "combos": {
        "fechamento_ext": "fechamento-standard",
        "cobertura": "cobertura-standard",
        "forro": "forro-standard",
        "divisoria": "divisoria-simples",
        "piso": "piso-vinilico",
        "subpiso": "subpiso-seco",
        "vidro": "vidro-simples",
    }}
    r1 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": legacy})
    r2 = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                    json={"produto_id": produto_id, "configuracao": novo})
    r1.raise_for_status(); r2.raise_for_status()
    assert r1.json()["total"] == r2.json()["total"]


def test_calculate_wc_injects_divisoria_umida(produto_id: str):
    config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 2, "pe_direito_m": 2.7,
        "tem_wc": True, "pacote_acabamento": "padrao",
        "comp_paredes_int_m": 6.0,
        "esquadrias_extras": {"portas": 0, "caixilhos": []},
    }
    r = httpx.post(f"{BACKEND_URL}/api/public/quote/calculate",
                   json={"produto_id": produto_id, "configuracao": config})
    r.raise_for_status()
    itens = r.json()["itens"]
    combo_slugs = {i.get("combo_slug") for i in itens if i.get("combo_slug")}
    assert "divisoria-umida" in combo_slugs
```

- [ ] **Step 2: Rodar o teste com integration flag**

Com `make dev` rodando em outro terminal:

```bash
cd backend && RUN_INTEGRATION=1 uv run pytest tests/test_combos_api.py -v
```

Expected: 5 testes pass.

- [ ] **Step 3: Sanity final — suite completa (sem integration flag)**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: todos passam (os de integração são skipped).

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_combos_api.py
git commit -m "test(backend): integracao end-to-end de combos e templates via API"
```

---

## Resumo das entregas do Plano 1

Após as 16 tasks, o sistema tem:

- 4 tabelas novas (`pacote_combo`, `pacote_combo_material`, `template_orcamento`, `template_orcamento_selecao`) + seed de 21 combos + 2 templates.
- Novo `derive()` expondo `area_parede_wc_m2`, `area_parede_interna_nao_wc_m2`, `area_caixilhos_m2`.
- `Configuracao` pydantic com `combos` e `template_aplicado`, retendo `pacote_acabamento` como legado opcional.
- Adapter `normalize_configuracao` traduzindo entrada legada → nova.
- Serviço `combo_service.calcular_itens_bom` produzindo regras BOM sintéticas.
- `quote_calculator.calculate` aceitando `combos_bom` e unindo com geometria.
- Endpoints `GET /api/combos` e `GET /api/templates` para o frontend consumir.
- `/api/public/quote/calculate` e `/api/quote/calculate` retrocompatíveis com o shape legado via normalizer.
- Suite de testes unit + integração verificando o fluxo completo.

**O site público (`/`) continua funcionando sem mudança de UI** — envia `pacote_acabamento` como antes e recebe BOM agora mais detalhada (combos explodidos).

**Plano 2 (frontend `StepConfigurator`)** será escrito após merge desta fundação e validação manual via curl/UI atual.
