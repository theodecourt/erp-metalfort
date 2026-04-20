# Configurador em etapas (painel admin)

**Data:** 2026-04-20
**Escopo:** painel interno (`/admin/orcamento/novo`). Site público permanece intocado nesta onda.
**Objetivo:** substituir o configurador plano por um fluxo em etapas que exponha as decisões construtivas reais (fechamento, cobertura, forro, divisória, piso, vidros), cada uma com "combos" pré-montados, e introduzir templates (Básico / Premium) como seleções salvas reutilizáveis.

## Motivação

O `Configurator` atual lista 10 decisões planas, mistura dimensões com acabamento, e esconde as escolhas estruturais mais relevantes (tipo de placa de fechamento, camadas de isolante, tipo de cobertura, forro) atrás de regras BOM fixas. O admin não consegue, hoje, cotar variantes construtivas que o cliente pede. O lever único `pacote_acabamento = padrão | premium | personalizado` é ambíguo e não reflete que, na prática, cada categoria tem sua própria faixa de qualidade.

## Taxonomia de etapas

O `StepConfigurator` apresenta dez etapas, na ordem construtiva real:

1. **Estrutura & geometria** — tamanho do módulo, qtd, pé-direito, perímetro externo, comprimento de parede interna. Sem combo.
2. **Fechamento de parede externa** — combos: Standard · Térmico · Acústico · Premium.
3. **Cobertura** — combos: Standard (TP40 30 mm) · Térmica (TP40 50 mm) · Laje seca drywall.
4. **Forro interno** — combos: Standard (gesso liso) · Acústico (lã + placa perfurada) · Sem forro.
5. **Divisórias internas** — combos: Simples · Acústica. Quando a etapa 8 (WC) está ativa, a categoria auxiliar `divisoria_wc` é preenchida automaticamente com o combo fixo `divisoria-umida` (placa RU resistente à umidade), separado da categoria `divisoria` principal.
6. **Piso e subpiso** — combos de piso: Vinílico · Cerâmico · Porcelanato. Subpiso: Contrapiso seco · Contrapiso úmido.
7. **Esquadrias** — portas (qtd + tamanho), caixilhos (janelas, portas de vidro); combo de vidro: Simples · Duplo · Temperado.
8. **WC interno** — checkbox + escolha de louças.
9. **Acabamento de superfície & cor** — acabamento externo (textura / pintura / cimentícia lisa) + cor, acabamento interno (pintura + cor), cor do piso.
10. **Extras & instalações** — splits de AC, comunicação visual, iluminação comercial, balcão, escape hatch de "material avulso".

### Templates

O topo da página oferece três botões de template:

| Template | Parede | Cobertura | Forro | Divisória | Piso | Vidros | Acabamento |
|---|---|---|---|---|---|---|---|
| **Básico** (default) | Standard | Standard | Standard | Simples | Vinílico | Simples | Textura branca |
| **Premium** | Premium | Térmica | Acústico | Acústica | Porcelanato | Duplo | Cimentícia |
| **Personalizado** | (admin escolhe cada categoria) | | | | | | |

Templates **Básico** e **Premium** são seleções salvas de combos — são linhas em `template_orcamento` com as respectivas selecoes em `template_orcamento_selecao`. Aplicar um deles escreve os `combos` correspondentes na configuração e marca `template_aplicado`. A partir daí, admin pode sobrescrever qualquer categoria individualmente; a configuração deixa de ser "Básico puro" e vira "Básico + customizações".

**Personalizado** não é uma linha no banco — é um estado da UI. Clicar em "Personalizado" limpa `combos` (vazio), marca `template_aplicado = 'personalizado'`, e admin precisa escolher cada categoria manualmente. Botão "Criar orçamento" só habilita quando todas as 7 categorias principais têm combo selecionado.

## Modelo de dados

Migration nova: `supabase/migrations/006_combos.sql`.

### Tabelas novas

```sql
create table pacote_combo (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  categoria text not null check (categoria in (
    'fechamento_ext', 'cobertura', 'forro', 'divisoria', 'divisoria_wc',
    'piso', 'subpiso', 'vidro'
  )),
  nome text not null,
  descricao text,
  ordem int not null default 0,
  ativo bool not null default true,
  created_at timestamptz not null default now()
);

create table pacote_combo_material (
  pacote_combo_id uuid not null references pacote_combo(id) on delete cascade,
  material_id uuid not null references material(id),
  formula_json jsonb not null,
  ordem int not null default 0,
  primary key (pacote_combo_id, material_id)
);

create table template_orcamento (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  ordem int not null default 0
);

create table template_orcamento_selecao (
  template_id uuid not null references template_orcamento(id) on delete cascade,
  categoria text not null,
  pacote_combo_id uuid not null references pacote_combo(id),
  primary key (template_id, categoria)
);
```

RLS: admin-only (mesma policy de `material`, `produto_opcao`).

### `formula_json`

Reutiliza o DSL existente de `produto_bom_regra.formula_json` (ops `var`, `mul`, `div`, `ceil`, `if`, `gt`, `waste`). Variáveis disponíveis: as mesmas que `derive()` produz hoje (`area_planta_m2`, `area_fechamento_ext_m2`, `area_cobertura_m2`, `comp_parede_interna_m`, etc.). Novas variáveis a adicionar em `derive()` para alimentar os combos:

- `area_parede_wc_m2` — área de parede interna do WC (usada pelo combo `divisoria-umida`).
- `area_parede_interna_nao_wc_m2` — área de parede interna excluindo WC (usada pelos combos de `divisoria`).
- `area_caixilhos_m2` — soma da área de todos os caixilhos (usada pelos combos de `vidro`).

### Seed de combos e templates

Novo arquivo: `supabase/migrations/006_combos_seed.sql`. Define:

- 4 combos de `fechamento_ext`
- 3 combos de `cobertura`
- 3 combos de `forro`
- 2 combos de `divisoria` (Simples, Acústica) + 1 combo de `divisoria_wc` (Úmida)
- 3 combos de `piso`
- 2 combos de `subpiso`
- 3 combos de `vidro`
- 2 templates (`basico`, `premium`) com suas 7 seleções cada

Cada `pacote_combo_material` aponta para um SKU já existente em `material` (criado pela seed de onda 1) e define sua fórmula. Quando um SKU faltar para um combo novo (ex: lã de rocha densa distinta da lã de vidro atual), a migration adiciona o SKU no seed de `material` antes de referenciá-lo.

### Mudança em `Configuracao`

O `Configuracao` (TypeScript + `configuracao_json` no banco) perde:

- `pacote_acabamento` (enum `'padrao' | 'premium' | 'personalizado'`)

Ganha:

- `template_aplicado?: string` — slug do template que originou a configuração (`'basico'` / `'premium'` / `'personalizado'`); usado só para UI (mostrar botão "Voltar ao template").
- `combos: { [categoria]: string }` — slug do combo escolhido por categoria. Ex:
  ```json
  {
    "fechamento_ext": "fechamento-premium",
    "cobertura": "cobertura-termica",
    "forro": "forro-acustico",
    "divisoria": "divisoria-acustica",
    "piso": "piso-porcelanato",
    "subpiso": "subpiso-seco",
    "vidro": "vidro-duplo"
  }
  ```

Mantém: `itens_personalizados` (como escape hatch admin-only na etapa 10).

### Cálculo de BOM

O endpoint `/api/quote/calculate` passa a iterar **dois conjuntos** de regras:

1. **Regras de geometria** — `produto_bom_regra` reduzida para o que depende só de dimensões/qtd: perfis LSF, parafusos estruturais, banda acústica, parabolt, mão de obra (m²), kit elétrico fixo, porta externa, janelas (via caixilhos), porta WC, kit hidráulico WC, frete, addons (splits, comunicação visual, iluminação, balcão). A migration move as regras de fechamento, cobertura, drywall/divisória, forro e piso para fora de `produto_bom_regra` (agora vivem em `pacote_combo_material`).
2. **Regras de combo** — para cada `(categoria, slug)` em `configuracao.combos`, carrega as linhas de `pacote_combo_material` do combo e avalia cada fórmula com as mesmas variáveis de `derive()`.

A união é a BOM do orçamento, **congelada** em `orcamento.itens_json` no momento da criação (comportamento atual preservado).

### Compatibilidade com orçamentos existentes

- **Orçamentos com status ≠ `rascunho`** — não abrem no novo `StepConfigurator`; continuam sendo renderizados por `AdminOrcamentoDetail` com os itens já congelados. Sem mudança.
- **Rascunhos no formato antigo** (`configuracao_json` com `pacote_acabamento`) — adapter no backend (`quote.service.normalize_configuracao`) traduz na leitura:
  - `pacote_acabamento = 'padrao'` → `combos` do template `basico`, `template_aplicado = 'basico'`.
  - `pacote_acabamento = 'premium'` → `combos` do template `premium`, `template_aplicado = 'premium'`.
  - `pacote_acabamento = 'personalizado'` → `combos` do template `basico`, `template_aplicado = 'personalizado'`. `itens_personalizados` preservado.
- Admin pode optar por "começar do zero" (botão existente).

## UI e interação

### Componente `StepConfigurator`

Arquivo: `frontend/src/components/StepConfigurator/StepConfigurator.tsx`. Usado exclusivamente por `AdminOrcamentoNew`. O `Configurator` atual **não é alterado** (continua servindo o site público `/`).

### Layout

Grid três colunas no desktop (≥1024 px):

```
┌──────────────┬───────────────────────────────────┬──────────────┐
│ ÍNDICE       │ CONTEÚDO (scroll)                 │ PREÇO        │
│ (sticky)     │                                   │ (sticky)     │
└──────────────┴───────────────────────────────────┴──────────────┘
```

- **Coluna esquerda (`StepSidebar`)** — 10 itens, cada um com número + nome curto + marcador `●` (preenchido) ou `○` (vazio). Clique rola até a seção. Highlight automático conforme scroll via `IntersectionObserver`.
- **Coluna central** — 10 seções roláveis em sequência, cada uma com header grande (`## N. Nome da etapa`) e conteúdo.
- **Coluna direita (`PriceBoxV2`)** — reusa `PriceBox` atual, adiciona badge "calculando…" durante debounce e lista colapsável dos itens.

### Header com template picker

Acima do grid: nome do produto + três botões **Básico · Premium · Personalizado**. Clicar em Básico ou Premium:

- Se houver **customizações manuais** sobre o template anterior (diferença entre `combos` atuais e os do template), mostra modal: *"Isso vai sobrescrever X seleções que você fez. Continuar?"*
- Aplica os `combos` do template e marca `template_aplicado`.

Botão **"↺ Voltar ao template"** aparece no header do template picker apenas quando `combos` atuais diferem dos do `template_aplicado`. Clicar restaura os combos originais, preservando `Estrutura` e `Extras`.

### Combo card (`ComboCard`)

Dentro de cada etapa categórica (2–6), grid de cards:

```
┌────────────────────────────────────┐
│ ●  Premium                         │
│                                    │
│ Cimentícia Infibra + Glasroc-X     │
│ dupla + lã rocha 100mm             │
│                                    │
│ R$ 328/m² parede                   │
│ +R$ 12.450 vs Standard             │
└────────────────────────────────────┘
```

- Título (nome do combo) + descrição curta (1 linha).
- **Preço unitário** estimado (R$/m², R$/un — depende da categoria).
- **Δ vs Standard** — diferença no total do orçamento atual em relação a ter selecionado o combo default daquela categoria. Calculado no frontend a partir do BOM retornado pelo `/api/quote/calculate`, ou via endpoint auxiliar `/api/quote/compare?base_combo=...&alt_combo=...` (definido em implementação).
- Selecionado = borda amarela + `●`; outros = `○` cinza.
- Grid: 3–4 cards por linha no desktop, 1 por linha no mobile.

### Etapas sem combo

- **Etapa 1 (Estrutura)** — inputs numéricos atuais reaproveitados. Tamanho do módulo (botão `3x3 / 3x6 / 3x9`), qtd módulos, pé-direito, paredes ext/int em metros lineares, validação de perímetro esperado (lógica de `perimetrosEsperados` preservada).
- **Etapa 7 (Esquadrias)** — qtd de portas extras + tamanhos, lista de caixilhos (janela / porta de vidro), mesmos campos de hoje. Combo de vidro afeta preço via `pacote_combo_material` para `caixilhos.area_total_m2`.
- **Etapa 8 (WC)** — checkbox "Incluir WC" + sub-checkboxes de louças. Quando ativo, a categoria `divisoria_wc` na configuração é automaticamente preenchida com o slug `divisoria-umida` (placa RU na parede interna do WC); quando inativo, `divisoria_wc` é removido da configuração.
- **Etapa 9 (Acabamento de superfície)** — paletas `ACABAMENTO_EXT_CORES` e `PISO_CORES` reusadas. Combo de acabamento externo (textura/pintura/cimentícia lisa) + cor; acabamento interno (pintura) + cor; cor do piso.
- **Etapa 10 (Extras)** — splits (numérico), comunicação visual (toggle), iluminação (toggle + pontos), balcão (toggle + metros). Botão **"+ Adicionar material avulso"** reusa `PersonalizadoPicker` para `itens_personalizados`.

### Validações e estado "completo"

- Etapa Estrutura é a única com campos obrigatórios (todos min > 0, perímetro ≥ mínimo para qtd ≥ 2).
- Todas as outras têm combo default aplicado via template → sempre "completas" quando o template é aplicado.
- Botão **"Criar orçamento"** (no form de dados do cliente, fora do `StepConfigurator`) só habilita quando Estrutura está preenchida e `combos` está completo — todas as 7 categorias principais (`fechamento_ext`, `cobertura`, `forro`, `divisoria`, `piso`, `subpiso`, `vidro`) têm seleção. `divisoria_wc` é derivado do WC, não é contado.

### Mobile (<1024 px)

- Índice colapsa em barra horizontal scrollável no topo.
- Preço vira footer sticky (subtotal + total + botão "ver itens").
- Combo cards: 1 por linha.

## Fluxo admin end-to-end

1. `/admin/orcamento/novo` → admin escolhe Produto (Home / Shop) → carrega `StepConfigurator` com template Básico pré-aplicado.
2. Admin preenche **Estrutura**.
3. Scrolla e ajusta combos onde quer divergir do template.
4. Preço atualiza em tempo real (debounce 300 ms sobre mudanças em `configuracao`).
5. Pode trocar template (modal de confirmação), ou usar "Voltar ao template" para reverter customizações.
6. Preenche dados do cliente (`AdminOrcamentoNew` form atual, sem mudança).
7. "Criar e enviar" ou "Criar rascunho" → backend persiste `configuracao_json.combos` + BOM congelada.

## Fora de escopo

- **Site público (`/`)** — `Configurator` atual fica intocado, recebendo e enviando `pacote_acabamento` legado. Tratado em onda futura.
- **CRUD admin de combos e templates** — seedado via migration; edição requer deploy. Admin CRUD vem em onda futura.
- **Preços por fornecedor em tempo real** — continua usando `material.preco_unitario` estático.
- **i18n** — segue só em português.
- **Edição pós-emissão** — orçamentos com status ≠ `rascunho` seguem imutáveis.

## Testes

### Backend (pytest)

- **Unit `pacote_combo.service.calcular_itens(combo_id, vars)`** — um teste por combo seedado: dado um `vars` conhecido, retorna lista de `(material_id, qtd)` esperada.
- **Unit `quote.service.calcular_quote`** — com `configuracao.combos = {fechamento_ext: 'fechamento-premium', ...}`, BOM = união correta de regras de geometria + regras de combo.
- **Unit `quote.service.normalize_configuracao`** — configuração legada com `pacote_acabamento = 'premium'` é traduzida para `combos` do template `premium`.
- **Integration (`RUN_INTEGRATION=1`)** — criar orçamento via admin API com template Básico e com template Premium → BOMs divergem só nos SKUs dos combos.

### Frontend (`@testing-library/react` + vitest)

- **`StepConfigurator`** com produto mock: trocar template → `combos` mudam → `/api/quote/calculate` é chamado com novo body.
- **`StepConfigurator`**: selecionar combo manualmente → `template_aplicado` mantém, mas botão "↺ Voltar ao template" aparece.
- **`StepConfigurator`**: clicar "↺ Voltar ao template" → combos restauram, Estrutura preservada.
- **`ComboCard`** mostra R$/unidade e Δ vs Standard corretos dado um preço mockado.
- **`StepSidebar`** marca etapa como `●` quando tem seleção, `○` quando não.

## Rollout

1. Migration `006_combos.sql` + seed → admin abre `/admin/orcamento/novo` e já vê UI nova.
2. Rascunhos antigos são traduzidos na leitura (adapter), sem migração destrutiva.
3. Site público continua funcionando igual (usa `Configurator` legado, que continua lendo/escrevendo `pacote_acabamento`).
4. Onda seguinte: (a) migrar site público para o novo modelo, ou (b) adicionar admin CRUD de combos.

## Critérios de aceite

- Admin cria orçamento interno combinando qualquer permutação de 4 × 3 × 3 × 3 × 3 × 2 × 3 combos (≈ 2.000 combinações) + customizações de acabamento/extras, sem tocar em código.
- Trocar template reseta combos e mostra modal de confirmação se houver customizações.
- "Voltar ao template" restaura as seleções originais sem perder dados de Estrutura e Extras.
- BOM do orçamento congela a união correta de regras de geometria + regras de combo.
- Rascunhos legados (`pacote_acabamento` antigo) abrem corretamente, traduzidos para o novo modelo.
- Site público (`/`) continua funcionando inalterado.
