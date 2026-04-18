# ERP Metalfort — Onda 1 (MVP de Orçamento)

**Data:** 2026-04-18
**Status:** Design aprovado — aguardando review do usuário antes do plano de implementação.
**Escopo:** Primeira onda do ERP Metalfort. Orçamento modular público + interno, sem estoque nem obras.

## 1. Contexto de negócio

A Metalfort é uma empresa de steelframe em São Paulo, em transição de obras tailor-made (casas customizadas) para construções modulares padronizadas (farmácias, lojas de conveniência e outros estabelecimentos comerciais). Os módulos básicos têm três tamanhos: **3×3, 3×6 e 3×9 metros**.

O ERP tem três capacidades planejadas:
1. **Orçamento** de módulos (foco desta onda)
2. **Controle de matéria-prima / estoque** (onda 2)
3. **Acompanhamento de obras** com consumo de material (onda 3)

Esta onda entrega a capacidade **1** completa — tanto no lado público (cliente configura o próprio orçamento no site) quanto no interno (equipe Metalfort cria orçamento com visibilidade de custo/margem e addons Tier C).

## 2. Escopo desta onda

**Dentro:**
- Catálogo de produtos modulares híbrido: templates pré-configurados com customização leve
- Configurador público com 9 alavancas, preço calculado em tempo real (Tier B apenas)
- Submissão pública gera PDF e dispara email para cliente + Metalfort
- Painel interno com login (Supabase Auth) para admin e vendedor
- Painel interno vê e manipula a BOM completa (Tier C, custo, margem)
- CRUD de produtos, materiais e regras paramétricas da BOM
- Motor de cálculo paramétrico com fórmulas estruturadas em JSON (sem `eval`)
- Sugestão automática de pé direito por tipo de módulo
- Dev local completo via Supabase CLI antes de qualquer deploy cloud

**Fora:**
- Estoque/saldos/movimentações (onda 2)
- Acompanhamento de obras e consumo real (onda 3)
- Editor visual de layout/planta (onda 4)
- Multi-supplier pricing com comparação (uma tabela única de preço por material)
- Impostos (ICMS, ISS, Simples Nacional) — trabalhamos com preço base; gerenciamento % é um único multiplicador
- Alvará / ART — cliente resolve por fora
- Integração com WhatsApp / CRM externo

## 3. Decisões de produto

| Decisão | Escolha | Razão |
|---|---|---|
| Quem usa o configurador | Público **e** interno | Lead capture + fechamento assistido |
| Unidade do orçamento | Híbrido: produto-template com customização leve | Padronização comercial com saída para exceções |
| Escopo da BOM | Tier C (full) internamente · Tier B (core) publicamente | Público vê preço fechado; interno negocia addons |
| Nível de customização | 9 alavancas | Cobre ~80% dos casos sem virar editor de planta |
| Fatia do MVP | Onda 1 = orçamento completo; estoque/obras em ondas 2/3 | Valor no ar em ~4-6 semanas; fundação compartilhada |
| Stack | Supabase (DB+auth+storage) + FastAPI (lógica) + React/Vercel + Railway | Aproveita FastAPI; Supabase grátis no MVP; lock-in baixo |
| Dev first | Tudo local via Supabase CLI antes do cloud | Validar integração antes de gastar com deploy |

### 3.1 As 9 alavancas de customização

1. **Tamanho do módulo** — 3×3 · 3×6 · 3×9
2. **Quantidade de módulos** — 1 a 3 (ex: 2× 3×6 em linha)
3. **Pé direito** — sugerido por tipo, sobrescrevível em [2,40 ; 3,50] m com passo de 10 cm
4. **Cor externa** — 3-4 opções pré-definidas
5. **Pacote de acabamento** — padrão · premium (afeta 2-3 linhas da BOM)
6. **Esquadrias extras** — quantidade adicional de portas e janelas
7. **Piso** — vinílico · cerâmico · porcelanato
8. **WC interno** — sim/não (kit hidráulico)
9. **Ar-condicionado** — número de splits (visível só no painel interno / Tier C)

Além das 9 alavancas, o orçamento captura **finalidade de uso** (campo independente, informativo — não afeta a BOM). Valores: `casa · farmacia · loja · conveniencia · escritorio · quiosque · outro`. Ajuda a equipe Metalfort a qualificar leads e organizar o catálogo.

### 3.2 Tier B vs Tier C

- **Todo produto tem uma BOM full.** Cada item é marcado como `core` (Tier B) ou `addon` (Tier C).
- **Público:** enxerga só `core`. Preço fechado.
- **Interno:** enxerga todos os itens; pode ligar/desligar addons caso a caso. Quando converte um lead público em orçamento interno, parte do estado `core` e adiciona os addons negociados.

### 3.3 Addons típicos

AC (splits) · comunicação visual · transporte+guindaste · iluminação comercial especial · balcões fixos.

## 4. Arquitetura

Três plataformas com responsabilidades separadas:

```
┌──────────────┐    ┌──────────────┐    ┌───────────────┐
│  VERCEL      │    │  RAILWAY     │    │  SUPABASE     │
│  Frontend    │───▶│  FastAPI     │───▶│  Postgres     │
│  React/TS    │    │  Business    │    │  Auth         │
│              │    │  logic       │    │  Storage      │
└──────┬───────┘    └──────────────┘    └───────▲───────┘
       │                                        │
       └────────────────────────────────────────┘
         leitura direta de catálogo (supabase-js + RLS)
```

### 4.1 Responsabilidades

- **Frontend (Vercel):** UI, rotas públicas e internas, preview de preço em tempo real (parser TS das fórmulas), chamadas para FastAPI em escrita/cálculo oficial, chamadas diretas ao Supabase para leituras protegidas por RLS.
- **Backend (FastAPI em Railway):** motor paramétrico (source of truth do cálculo), geração de PDF (WeasyPrint), envio de email (Resend SDK), validação de JWT do Supabase nos endpoints internos, rate-limit em endpoints públicos.
- **Supabase:** Postgres com RLS, Auth (magic link ou senha), Storage para PDFs gerados.

### 4.2 Sequência — orçamento público

1. Cliente abre `/orcamento/farmacia-3x6` → frontend busca produto + opções no Supabase via supabase-js (RLS permite leitura pública).
2. Cliente ajusta as 9 alavancas → frontend calcula preview com parser TS e chama `POST /api/public/quote/calculate` no FastAPI como fonte da verdade.
3. Cliente preenche nome/email/telefone → `POST /api/public/quote/submit`.
4. FastAPI grava `orcamento` + `orcamento_item` no Supabase, gera PDF via WeasyPrint, sobe para Supabase Storage, envia email pro cliente + pro Metalfort via Resend, devolve URL assinada do PDF.
5. Frontend navega para `/obrigado` com link do PDF.

### 4.3 Sequência — orçamento interno

Igual à pública, mas:
- Autenticação obrigatória (JWT no header).
- Endpoint `POST /api/quote/calculate` permite parâmetro `tier=full` → inclui addons.
- Usuário pode editar linha a linha e sobrescrever quantidades.
- `orcamento.criado_por = auth.user.id`, `tipo = 'interno'`.

## 5. Estrutura do monorepo

```
erp-metalfort/
├── frontend/                    # Vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── public/          # /, /orcamento/:slug, /obrigado, /produto/:slug
│   │   │   └── admin/           # /admin/* (login-gated)
│   │   ├── components/          # 1 componente por arquivo
│   │   │   ├── Configurator/    # as 9 alavancas
│   │   │   ├── PriceBox/
│   │   │   ├── ProductCard/
│   │   │   ├── BomTable/
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── supabase.ts      # client supabase-js
│   │   │   ├── api.ts           # fetch wrapper FastAPI
│   │   │   └── formula.ts       # parser TS (espelho do Python)
│   │   ├── App.tsx              # só router — chama pages
│   │   └── main.tsx             # entry point (Vite)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Railway
│   ├── app/
│   │   ├── main.py              # FastAPI app, monta routers, configura CORS
│   │   ├── routers/             # 1 arquivo por domínio
│   │   │   ├── public_quote.py  # /api/public/*
│   │   │   ├── quote.py         # /api/quote/*
│   │   │   ├── product.py       # /api/produto/*
│   │   │   ├── material.py     # /api/material/*
│   │   │   └── admin.py         # /api/admin/*
│   │   ├── services/            # lógica de negócio
│   │   │   ├── bom_engine.py    # avalia formula_json
│   │   │   ├── quote_calculator.py
│   │   │   ├── pdf_generator.py # WeasyPrint
│   │   │   └── email_sender.py  # Resend
│   │   ├── models/              # Pydantic schemas
│   │   │   ├── formula.py       # schema recursivo da árvore JSON
│   │   │   ├── quote.py
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── supabase.py      # admin client (service role)
│   │   │   └── auth.py          # validação JWT
│   │   ├── templates/           # HTML dos emails + PDF
│   │   └── config.py            # pydantic-settings
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/            # mesmas fixtures do frontend
│   ├── pyproject.toml
│   └── Dockerfile
│
├── database/                    # versionado no git
│   ├── migrations/
│   │   ├── 001_schema.sql       # tabelas core
│   │   └── 002_rls.sql          # policies
│   ├── seed/
│   │   ├── 01_materiais.sql
│   │   ├── 02_produtos.sql
│   │   ├── 03_bom_regras.sql
│   │   └── 04_usuario_dev.sql
│   └── tests/
│       └── formula-fixtures.json # compartilhado entre backend e frontend
│
├── supabase/                    # config do Supabase CLI
│   └── config.toml
│
├── docs/superpowers/specs/      # design docs
│
├── docker-compose.yml           # (opcional) amarrar dev local
├── Makefile                     # targets: dev, test, migrate, seed
└── README.md
```

Regra do projeto: **um componente/serviço = um arquivo.** O arquivo principal (`App.tsx`, `main.py`) apenas monta rotas / orquestra — lógica nunca vive aí.

## 6. Modelo de dados

### 6.1 Tabelas da onda 1

**`material`**
```
id               uuid pk
sku              text unique
nome             text not null
categoria        enum (estrutura, fechamento, instalacoes, acabamento, esquadria, equipamento, servico)
unidade          enum (kg, m, m2, pc, cx, und, h, bd, rl, sc, ml, ct)
preco_unitario   numeric(12,2) not null
ativo            bool default true
created_at       timestamptz
updated_at       timestamptz
```

**`produto`**
```
id                     uuid pk
slug                   text unique not null
nome                   text not null
tipo_base              enum (3x3, 3x6, 3x9)
finalidade             enum (casa, farmacia, loja, conveniencia, escritorio, quiosque, outro)
pe_direito_sugerido_m  numeric(3,2) not null
descricao              text
imagem_url             text
ativo                  bool default true
created_at             timestamptz
updated_at             timestamptz
```

**`produto_opcao`** — as alavancas que o produto expõe (nem todos os produtos expõem todas as 9).
```
id                     uuid pk
produto_id             uuid fk produto
tipo                   enum (tamanho_modulo, qtd_modulos, pe_direito, cor, pacote_acabamento, esquadria, piso, wc, ac)
label                  text
valores_possiveis_json jsonb  -- ex: ["3x3","3x6","3x9"] ou {"min":2.40,"max":3.50,"step":0.10}
default_json           jsonb
ordem                  int
```

**`produto_bom_regra`** — liga produto → material via fórmula.
```
id            uuid pk
produto_id    uuid fk produto
material_id   uuid fk material
formula_json  jsonb not null   -- árvore estruturada, ver seção 7
tier          enum (core, addon) default 'core'
categoria     enum (estrutura, fechamento, instalacoes, acabamento, esquadria, equipamento, servico)
ordem         int
```

**`orcamento`**
```
id                     uuid pk
numero                 text unique       -- ex: ORC-2026-0001 (sequência amigável)
cliente_nome           text
cliente_email          text
cliente_telefone       text
produto_id             uuid fk produto
finalidade             enum (casa, farmacia, loja, conveniencia, escritorio, quiosque, outro)
                                         -- default herda de produto.finalidade, pode ser editado
configuracao_json      jsonb             -- snapshot das 9 alavancas
tipo                   enum (publico, interno)
tier_aplicado          enum (core, full) -- 'full' só se tipo=interno
valor_subtotal         numeric(12,2)
valor_gerenciamento_pct numeric(4,2) default 8.0
valor_total            numeric(12,2)
criado_por             uuid nullable (fk auth.users)
status                 enum (rascunho, enviado, aprovado, perdido)
pdf_url                text
created_at             timestamptz
updated_at             timestamptz
```

**`orcamento_item`** — snapshot imutável dos itens calculados (não muda se preço do material mudar depois).
```
id              uuid pk
orcamento_id    uuid fk orcamento on delete cascade
material_id     uuid fk material
descricao       text
unidade         text
quantidade      numeric(12,3)
preco_unitario  numeric(12,2)
subtotal        numeric(14,2)
tier            enum (core, addon)
categoria       text
ordem           int
```

**`usuario_interno`** — perfil estendendo `auth.users` do Supabase.
```
id         uuid pk (= auth.users.id)
nome       text
role       enum (admin, vendedor) default 'vendedor'
ativo      bool default true
created_at timestamptz
```

### 6.2 Tabelas preparadas para ondas 2-3 (não criadas agora)

- `estoque_saldo (material_id pk, quantidade, unidade)` — onda 2
- `estoque_movimento (id, material_id, tipo, quantidade, orcamento_id?, obra_id?, created_at)` — onda 2
- `obra (id, orcamento_id, status, data_inicio, data_fim, endereco)` — onda 3
- `obra_consumo (id, obra_id, material_id, quantidade, data)` — onda 3

### 6.3 Row-Level Security (RLS)

- `produto`, `produto_opcao`, `material`: **public read** (catálogo aberto), write só `role='admin'`.
- `produto_bom_regra`: read só autenticado (preço por material é sensível); write só admin.
- `orcamento`: **insert público** permitido (lead capture com campos obrigatórios validados); select limitado a admin/vendedor + o próprio criador quando aplicável.
- `orcamento_item`: sem acesso direto do frontend — só via API backend usando service role.
- `usuario_interno`: cada usuário lê o próprio registro; admin lê e edita todos.

## 7. Motor paramétrico

### 7.1 Variáveis derivadas a partir da configuração

| Variável | Fórmula | Notas |
|---|---|---|
| `area_planta_m2` | `tamanho.larg × tamanho.comp × qtd_modulos` | |
| `perimetro_externo_m` | depende do arranjo (linha, L, etc.) | MVP: só linha |
| `area_fechamento_ext_m2` | `perimetro_externo_m × pe_direito_m` | |
| `area_cobertura_m2` | **`= area_planta_m2`** (drenagem pelos pilares, sem beiral) | |
| `comp_parede_interna_m` | `(qtd_modulos - 1) × tamanho.larg` | só divisórias entre módulos |
| `area_parede_interna_m2` | `comp_parede_interna_m × pe_direito_m × 2` | 2 faces |
| `num_portas_ext` | 1 fixa + alavanca `esquadrias_extras.portas` | |
| `num_janelas` | alavanca `esquadrias_extras.janelas` | |
| `tem_wc` | alavanca booleana | |
| `num_splits` | alavanca (tier addon) | |

### 7.2 Gramática de `formula_json`

Árvore JSON com operadores limitados (sem `eval`). Parser idêntico em Python e TypeScript.

**Operadores:**
- `{"op":"var", "of":"<nome>"}` — referência a variável derivada
- Literais: números, booleanos
- Aritmética: `add`, `sub`, `mul`, `div` com lista `"of": [...]`
- Arredondamento: `ceil`, `floor`, `round` aplicados a `"of"`
- Condicional: `{"op":"if", "cond": <expr>, "then": <expr>, "else": <expr>}`
- Comparação: `eq`, `gt`, `gte`, `lt`, `lte`
- Modificador opcional em qualquer nó: `"waste": <numero>` (multiplica o resultado por `1 + waste`)

**Exemplos:**

Placa Glasroc-X (placa = 2,88 m², 7% de perda):
```json
{"op":"ceil", "of": {"op":"div", "of":[{"op":"var","of":"area_fechamento_ext_m2"}, 2.88]}, "waste": 0.07}
```

Perfil LSF (30 kg por m² de planta):
```json
{"op":"mul", "of":[{"op":"var","of":"area_planta_m2"}, 30]}
```

Split AC (addon — só aparece se `num_splits > 0`):
```json
{"op":"if",
 "cond": {"op":"gt", "of":[{"op":"var","of":"num_splits"}, 0]},
 "then": {"op":"var","of":"num_splits"},
 "else": 0}
```

### 7.3 Validação e segurança

- Schema Pydantic recursivo valida toda `formula_json` antes de salvar.
- Operações proibidas (exec, import, fora da gramática) simplesmente não passam no schema.
- Parser é determinístico: mesma configuração + mesma BOM = mesmo total.
- Parser TS (frontend) e Python (backend) compartilham fixtures JSON em `database/tests/formula-fixtures.json` — CI falha se divergirem.

### 7.4 Snapshot de configuração

`orcamento.configuracao_json` guarda as 9 alavancas escolhidas; `orcamento_item` guarda o resultado já calculado. Isso garante:
- Orçamentos antigos não mudam quando preços mudam.
- Recomputação (audit) é possível rodando `configuracao_json` contra a BOM atual.

### 7.5 Pé direito automatizado

Sugestão por `produto.tipo_base`:

| Tipo base | Pé direito sugerido | Justificativa |
|---|---|---|
| 3×3 | **2,40 m** | placa Glasroc-X inteira de 2400 mm, sem emenda horizontal |
| 3×6 | **2,70 m** | padrão comercial (farmácia, loja pequena), permite forro/sanca de ~30 cm |
| 3×9 | **3,00 m** | comercial maior; placa inteira de 3000 mm, visual mais imponente |

Cliente pode sobrescrever em `[2,40 ; 3,50]` m com passo de 10 cm. Valores fora da faixa exigem emenda horizontal (custo extra) — bloqueado no público, permitido só interno.

## 8. Rotas frontend

### 8.1 Públicas (sem login)

```
/                           landing + lista de produtos
/produto/:slug              galeria + specs + "Faça seu orçamento"
/orcamento/:slug            configurador (9 alavancas, preço ao vivo)
/obrigado                   confirmação + link PDF
```

### 8.2 Internas (protegidas por middleware JWT)

```
/admin/login                Supabase Auth UI
/admin                      dashboard (KPIs + leads recentes)
/admin/orcamentos           lista + filtros (público/interno/status)
/admin/orcamento/new        criar orçamento interno
/admin/orcamento/:id        editar + ver PDF + mudar status
/admin/produtos             CRUD catálogo
/admin/produtos/:id         editor do produto (BOM, opções, fórmulas)
/admin/materiais            CRUD matérias primas
/admin/usuarios             (admin only) convidar vendedor, mudar role
```

Componente central `<Configurator/>` é reutilizado entre `/orcamento/:slug` (público, Tier B) e `/admin/orcamento/:id` (interno, Tier C + custo/margem), parametrizado por props.

## 9. API backend

### 9.1 Endpoints públicos (sem auth, rate-limit 10 req/min/IP)

```
GET  /api/public/produtos              lista produtos ativos (Tier B)
GET  /api/public/produto/:slug         detalhe + opções + BOM core preview
POST /api/public/quote/calculate       {produto_id, configuracao} → itens + total (core)
POST /api/public/quote/submit          cria orcamento (tipo=publico), gera PDF, dispara email
```

### 9.2 Endpoints internos (JWT + `role in (admin, vendedor)`)

```
GET    /api/quote                     lista todos orçamentos
POST   /api/quote/calculate           mesmo cálculo, aceita tier=full
POST   /api/quote                     criar orçamento interno
PATCH  /api/quote/:id                 editar config/status/linhas
POST   /api/quote/:id/pdf             regerar PDF
GET    /api/quote/:id/pdf-url         signed URL para download
DELETE /api/quote/:id                 soft delete (status=perdido)
```

### 9.3 Endpoints admin (`role='admin'`)

```
GET/POST/PATCH/DELETE  /api/produto
GET/POST/PATCH/DELETE  /api/produto/:id/bom-regra
GET/POST/PATCH/DELETE  /api/produto/:id/opcao
GET/POST/PATCH/DELETE  /api/material
POST                   /api/admin/usuario/invite
PATCH                  /api/admin/usuario/:id  (role, ativo)
```

### 9.4 Contratos-chave

**`POST /api/public/quote/calculate` request:**
```json
{
  "produto_id": "uuid",
  "configuracao": {
    "tamanho_modulo": "3x6",
    "qtd_modulos": 2,
    "pe_direito_m": 2.7,
    "cor_externa": "cinza",
    "pacote_acabamento": "padrao",
    "esquadrias_extras": {"portas": 0, "janelas": 1},
    "piso": "vinilico",
    "tem_wc": true
  }
}
```

**Response:**
```json
{
  "itens": [
    {"descricao": "Perfil LSF...", "qtd": 1080, "unidade": "kg",
     "preco_unit": 14.0, "subtotal": 15120.0, "tier": "core", "categoria": "estrutura"}
  ],
  "variaveis": {"area_planta_m2": 36, "area_fechamento_ext_m2": 81, "area_cobertura_m2": 36},
  "subtotal": 62340.50,
  "gerenciamento_pct": 8,
  "total": 67327.74
}
```

## 9.5 Identidade visual (design system mínimo)

Inspirado em **metalfort.tech**: preto como base, amarelo vivo como detalhe/destaque.

### Paleta (valores de partida — confirmar com site real na fase de UI)

| Token | Hex | Uso |
|---|---|---|
| `--mf-black` | `#0A0A0A` | background principal (header, cards escuros, CTA primário) |
| `--mf-black-soft` | `#1A1A1A` | background secundário, divisórias |
| `--mf-yellow` | `#FACC15` | accent — botões primários, highlights, preço em destaque, ícones ativos |
| `--mf-yellow-hover` | `#EAB308` | hover do accent |
| `--mf-text-primary` | `#FFFFFF` | texto sobre preto |
| `--mf-text-secondary` | `#A3A3A3` | labels, subtítulos, texto fraco sobre preto |
| `--mf-text-ink` | `#0A0A0A` | texto preto sobre fundo claro (relatórios, PDF) |
| `--mf-bg-light` | `#F5F5F5` | área administrativa (preto puro cansa em tela de gestão longa — fundo claro com accent amarelo) |
| `--mf-border` | `#2A2A2A` | bordas de cards sobre preto |
| `--mf-success` | `#22C55E` | status "aprovado" |
| `--mf-warning` | `#EAB308` | status "pendente" (reutiliza amarelo dessaturado) |
| `--mf-danger` | `#EF4444` | status "perdido", erros |

### Regras de uso

- **Área pública** (landing, configurador): dominantemente preta com amarelo pontual — casa com o estilo do site, sensação premium industrial.
- **Área administrativa**: fundo claro (`--mf-bg-light`) com header preto e accent amarelo. Operação longa em preto puro cansa os olhos.
- **Amarelo é detalhe**, nunca fundo grande — reserva para botões primários, indicadores de seleção, preço destacado, logo.
- **PDF** gerado: preto/branco com logo amarelo no cabeçalho (tinta de impressão amarela é cara e sensível — mantém só na tela/logo).

### Tipografia

Stack de sistema sem custo de fontes externas:
- **Headings:** `'Inter', system-ui, sans-serif` em peso 700/800.
- **Body:** `'Inter', system-ui, sans-serif` peso 400/500.
- **Números/preço:** `'Inter'` tabular com `font-feature-settings: 'tnum'` para alinhamento vertical em tabelas.

Se a identidade real do site usar font específica (ex: Montserrat, DM Sans), trocar só a família — resto do system-tokens não muda.

### Implementação

- **CSS variables** nas raízes `:root` (modo claro admin) e `:root.dark` (modo escuro público/marketing).
- **Tailwind** com cores extendidas no `tailwind.config.js` apontando para as variáveis.
- Nenhum componente usa cor hard-coded — sempre via token.

## 10. Autenticação e autorização

- **Supabase Auth** gerencia identidades internas (email+senha ou magic link).
- `usuario_interno` estende `auth.users` com `role` e `ativo`.
- **Frontend:** rotas `/admin/*` são protegidas por middleware que checa sessão Supabase; redireciona para `/admin/login` se ausente.
- **Backend FastAPI:** middleware `Depends(require_role(*roles))` decodifica JWT com `SUPABASE_JWT_SECRET`, extrai `sub` (user_id), consulta `usuario_interno.role`, valida `ativo=true`.
- **Público:** endpoints `/api/public/*` não exigem JWT mas têm rate-limit (slowapi) e validação estrita de payload (Pydantic).
- **RLS** é a segunda camada de defesa se algo vazar pelo frontend direto.

## 11. Dev local (pré-requisito para qualquer deploy cloud)

Pré-requisitos: Docker Desktop, Node 20+, Python 3.12, `uv`.

```bash
# 1. Supabase local (Postgres + Auth + Storage + Studio em Docker)
npx supabase init
npx supabase start
# expõe: API :54321 · DB :54322 · Studio http://localhost:54323

# 2. Aplicar migrations + seed
npx supabase db reset

# 3. Backend FastAPI
cd backend && uv sync && uv run uvicorn app.main:app --reload
# http://localhost:8000

# 4. Frontend
cd frontend && npm install && npm run dev
# http://localhost:5173
```

`Makefile` na raiz amarra tudo:
```
make dev        # sobe supabase + backend + frontend em paralelo
make test       # roda todos os testes
make migrate    # supabase db reset
make seed       # reaplica só o seed
```

### Variáveis de ambiente

`frontend/.env.local`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<fornecido pelo supabase start>
VITE_API_URL=http://localhost:8000
```

`backend/.env`:
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<fornecido pelo supabase start>
SUPABASE_JWT_SECRET=<fornecido pelo supabase start>
RESEND_API_KEY=  # vazio em dev → escreve emails em /tmp/sent
ALLOWED_ORIGINS=http://localhost:5173
```

## 12. Seed inicial

**Materiais** (~40 linhas cobrindo os dois produtos):
- Estrutura: perfil LSF Z275, parafuso metal/metal cx 1000, banda acústica, parabolt
- Fechamento: placa Glasroc-X 12,5×1200×2400, fita telada, parafuso ponta agulha, membrana hidrófuga, manta asfáltica, fita Tyvek, tela fibra de vidro, massa base coat, cantoneira PVC, perfil início
- Cobertura: telha TP40 PIR 30mm, acessórios telha
- Drywall: placa gesso 12,5, parafuso trombeta, lã de vidro Wallfelt, massa junta, guia R48, montante M48
- Forro: perfil F530, emenda, pendural, tabica
- Piso: LVT vinílico, cerâmico 60×60, porcelanato 60×60
- Instalações: kit hidráulico WC, kit elétrico 10 pontos, split 12k BTU
- Esquadrias: porta ext. 90×210 + kit, janela maxim-ar 100×60, porta WC 70×210
- Serviços: mão de obra LSF, frete+guindaste

**Produtos MVP** (2):
- **Farmácia Express 3×6** — core: shell + drywall + piso + esquadrias + WC; addons: AC, comunicação visual, iluminação comercial especial.
- **Loja Modular 3×9** — mesma estrutura, dimensões diferentes.

**Usuário admin de dev:** `admin@metalfort.tech` com senha conhecida (só em dev).

### Constantes de referência (editáveis no admin)

| Item | Valor seed |
|---|---|
| Perfil LSF | 30 kg / m² de planta |
| Waste placa Glasroc-X | 7 % |
| Parafuso metal/metal (cx 1000) | 1 cx / 30 m² de estrutura |
| Lã de vidro | área fechamento + forro (planta) |
| Mão de obra LSF | R$ 450 / m² |
| Gerenciamento | 8 % sobre subtotal |

Esses valores **não** derivam da casa de Americana (tailor-made, não modular). São valores razoáveis de mercado para steelframe modular padronizado — o admin edita quando tiver dados reais.

## 13. Testes

**Backend (pytest):**
- Unit do motor paramétrico — cobrir cada operador, cada alavanca, bordas. Alta cobertura (~90%+).
- Integração — endpoints `/quote/calculate`, `/quote/submit`, CRUD de produto/material com Postgres em Docker.
- Contrato — validar schema da `formula_json` com Pydantic (rejeita fórmula mal-formada).

**Frontend (Vitest + Testing Library):**
- Parser TS das fórmulas — mesmas fixtures do backend (`database/tests/formula-fixtures.json`). CI falha se divergirem.
- `<Configurator/>` — render Tier B vs Tier C, mudança de alavanca → preço atualiza, submit.
- Golden path e2e com Playwright: landing → configurar → submit → obrigado (nightly).

**CI GitHub Actions:**
- Unit + integração em todo PR.
- e2e no nightly.

## 14. Email

Dois emails no MVP, ambos disparados no `/api/public/quote/submit`:
- **Cliente:** confirmação com PDF anexo e resumo do orçamento.
- **Metalfort:** notificação de novo lead com link direto para `/admin/orcamento/:id`.

Templates em `backend/app/templates/*.html`. Em dev (`RESEND_API_KEY=""`), `email_sender.py` escreve os emails em `/tmp/sent/*.eml` em vez de enviar.

## 15. Deploy cloud (depois do dev local estabilizar)

Fora do escopo desta onda. Quando for a hora:
- **Frontend → Vercel** via `git push` (preview por branch).
- **Backend → Railway** com Dockerfile (deploy em `git push main`).
- **DB/Auth/Storage → Supabase Cloud** via `supabase db push` + `supabase link`.
- DNS: subdomínio tipo `orcamento.metalfort.tech` no Vercel, `api.metalfort.tech` no Railway.
- Custo estimado MVP: R$ 0–30 / mês.

## 16. Riscos e premissas

**Riscos:**
- **Fórmulas iniciais serão imprecisas** até calibrar com dados reais. Mitigação: admin edita fácil; snapshot preserva orçamentos antigos.
- **Divergência parser Python/TS.** Mitigação: fixtures compartilhadas em CI.
- **Arranjo não-linear de módulos** (L, U) fora do MVP — se aparecer cedo, vira escopo da próxima onda.

**Premissas:**
- Volume baixo no MVP (dezenas de orçamentos/mês) → Supabase free tier e Railway starter são suficientes.
- Cliente público aceita preço fechado sem negociação — quem quer negociar liga para o vendedor (fluxo interno).
- Todas regras cabem na gramática `formula_json` proposta.
- Construções são em linha (módulos alinhados lado a lado). Formas mais exóticas ficam para depois.

## 17. Definição de pronto desta onda

- [ ] Repositório inicializado (frontend, backend, database)
- [ ] Dev local sobe em 1 comando (`make dev`) com Supabase + backend + frontend
- [ ] Cliente público consegue configurar, submeter e receber PDF por email, tudo em ambiente local
- [ ] Admin interno consegue fazer login, ver leads, criar orçamento com addons, editar catálogo
- [ ] Parser paramétrico com 100% de paridade Python/TS (fixtures idênticas)
- [ ] 2 produtos no catálogo seed (Farmácia 3×6, Loja 3×9), ambos gerando orçamento end-to-end
- [ ] Cobertura de testes ≥ 80 % nas `services/` do backend
- [ ] Documentação mínima de como rodar o projeto (README)
