# ERP Metalfort — Onda 2 (Controle de Estoque)

**Data:** 2026-04-19
**Status:** Design aprovado — aguardando review do usuário antes do plano de implementação.
**Escopo:** Segunda onda do ERP Metalfort. Controle de matéria-prima focado em visibilidade de saldo, compras e análise de fabricação.
**Depende de:** Onda 1 (MVP de Orçamento) — `material`, `produto`, `produto_bom_regra`, `orcamento`, `orcamento_item`, `usuario_interno`.

## 1. Contexto

A onda 1 entregou o motor de orçamento (público + interno, BOM paramétrica, PDF, email). Com orçamentos começando a virar fabricação real, a dor imediata é operacional:

> "Chegamos no galpão para fabricar e descobrimos na hora que faltou parafuso, placa ou perfil."

A onda 2 resolve essa dor. **Não** resolve controle financeiro por obra (custo real vs. orçado), **não** resolve rastreabilidade completa e **não** implementa obras ainda — essas capacidades ficam para a onda 3.

## 2. Objetivo

Dar à equipe admin da Metalfort respostas rápidas para três perguntas:

1. **"Quanto tenho de cada material hoje?"** — saldo atual por SKU.
2. **"O que está baixo e preciso repor?"** — alerta por material com `estoque_minimo` definido.
3. **"Para fabricar esse orçamento, o que falta comprar?"** — análise comparando BOM congelada × saldo atual.

Tudo isso registrando entradas (compras) e saídas com histórico auditável, para quando a onda 3 (obras) quiser cruzar consumo real com orçamento.

## 3. Escopo desta onda

**Dentro:**
- Cadastro de fornecedor (tabela mínima: nome, CNPJ, contato).
- Lançamento de 4 tipos de movimento de estoque: compra (E1), ajuste positivo (E2), saída para obra (S1), ajuste negativo (S2).
- Saldo atual por material, calculado como soma do ledger (`estoque_movimento`).
- `estoque_minimo` por material (editável no CRUD existente) com alerta "abaixo do mínimo".
- Análise de fabricação: dado um `orcamento`, mostra necessário × saldo × falta linha a linha.
- Área admin `/admin/estoque` com sub-abas: Saldo · Movimentos · Fornecedores · Fabricação.
- Card resumo no dashboard `/admin` (contagem de materiais abaixo do mínimo).
- Botão "Análise de fabricação" direto do detalhe do orçamento.

**Fora:**
- Múltiplos locais de estoque (galpões, caminhões, obras em andamento). Modelamos um galpão único.
- Modelo de `obra` real — saída para obra é texto livre + link opcional ao orçamento.
- Recebimento parcial de pedidos de compra. Cada compra = um movimento único.
- Conversão de unidades (caixa ↔ peça). Se precisar, cadastra dois materiais.
- Custo médio ponderado ou "último preço" sobrescrevendo `material.preco_unitario` automaticamente.
- Inventário físico como rotina formal (contagem massiva, congelamento). Divergência → ajuste manual item a item.
- Vendedor ou público vendo estoque. Tudo admin-only.
- Importação de notas fiscais (XML).
- Reserva automática de material quando orçamento é aprovado.
- Controle financeiro por obra (custo real vs. orçado) — onda 3+.

## 4. Decisões de produto

| Decisão | Escolha | Razão |
|---|---|---|
| Dor principal | Visibilidade de saldo ("quanto tenho") | Problema operacional concreto, alta frequência |
| Quantos locais de estoque | Um só (galpão central) | Reflete a realidade hoje; evita complexidade prematura |
| Tipos de movimento | compra · ajuste+ · saída p/ obra · ajuste− | Cobre o essencial sem depender da onda 3 |
| Alerta de baixa | Mínimo fixo por material (editável) | Simples, útil dia 1, não depende de histórico |
| Análise de fabricação | A partir de orçamento existente (`orcamento_item`) | Reusa BOM congelada; caminho natural venda → fabricação |
| Fornecedor | Tabela mínima (nome, CNPJ, contato) | Permite histórico de compras sem virar multi-supplier |
| Unidade | Uma por material (sem conversão) | Mantém consistência com a onda 1 |
| Preço de compra | Registra no movimento; `material.preco_unitario` só muda manual | Histórico preservado sem efeito colateral em orçamentos |
| Permissão | Admin only | Estoque é dado sensível (custo, fornecedor, saldo) |
| Saída S1 destino | `orcamento_id` opcional + `destino` texto livre | Amarra quando há orçamento; permite saída avulsa |
| UI | `/admin/estoque` com sub-abas | Área dedicada, navegação previsível |
| Arquitetura de saldo | Ledger puro (`estoque_movimento`) + view `estoque_saldo_v` | Uma fonte de verdade, auditoria nativa, sem risco de dessincronia |

## 5. Arquitetura

### 5.1 Plataformas

Sem mudança de stack. Reusa o que a onda 1 estabeleceu:

- **Frontend (Vercel):** novas rotas `/admin/estoque/*`, componentes em `src/components/Estoque/`.
- **Backend (FastAPI em Railway):** novo router `routers/estoque.py`, novo serviço `services/estoque.py`. Reusa `lib/auth.py` e `lib/supabase.py`.
- **Supabase:** nova migration `005_estoque.sql`. Nova view, duas tabelas novas, um campo novo em `material`.

### 5.2 Ledger puro vs. saldo materializado

Escolhemos **ledger puro**: saldo é *sempre* derivado de `estoque_movimento`, via view SQL.

Vantagens:
- Uma única fonte de verdade — sem risco de saldo e movimento divergirem.
- Histórico completo de graça. Auditoria = ler o ledger.
- Correção de erro = lançar movimento reverso (nunca apaga).

Custo:
- Consulta de saldo faz agregação. Para dezenas a centenas de movimentos/mês esperados, custo irrisório com índice `(material_id, created_at)`.
- Se o volume disparar (milhares+), promove a view para `materialized view` com refresh pós-insert — sem mudança na API.

### 5.3 Integração com a onda 1

Ponto único de contato na UI: botão "Análise de fabricação" no detalhe do orçamento (`/admin/orcamento/:id`) abre `/admin/estoque/fabricacao/:orcamento_id`.

Backend: serviço `analise_fabricacao(orcamento_id)` lê `orcamento_item` (BOM congelada da onda 1) e cruza com saldo atual. Sem cálculo paramétrico novo — reusa o snapshot.

## 6. Modelo de dados

### 6.1 Alteração em `material`

```sql
alter table material
  add column estoque_minimo numeric(12,3) not null default 0;
```

`estoque_minimo = 0` (default) → material não é monitorado para alerta. Admin ativa monitoramento colocando um número.

### 6.2 Tabela `fornecedor`

```
id             uuid pk
nome           text not null
cnpj           text nullable unique    -- nullable: MEI / PF não tem
contato_nome   text nullable
contato_email  text nullable
contato_fone   text nullable
observacao     text nullable
ativo          boolean default true
created_at     timestamptz
updated_at     timestamptz
```

Índice: `(nome)` para busca textual.

### 6.3 Enum `estoque_movimento_tipo`

```sql
create type estoque_movimento_tipo as enum (
  'compra',          -- E1: entrada por NF
  'ajuste_positivo', -- E2: achei a mais
  'saida_obra',      -- S1: saiu para obra (amarrado a orçamento ou texto livre)
  'ajuste_negativo'  -- S2: perda, furto, correção de inventário
);
```

### 6.4 Tabela `estoque_movimento` (ledger append-only)

```
id              uuid pk
material_id     uuid fk material not null
tipo            estoque_movimento_tipo not null
quantidade      numeric(12,3) not null check (quantidade > 0)
                -- sempre positiva; sinal vem do tipo
preco_unitario  numeric(12,2) nullable
                -- obrigatório quando tipo='compra'; null caso contrário
fornecedor_id   uuid fk fornecedor nullable
                -- obrigatório quando tipo='compra'; null caso contrário
orcamento_id    uuid fk orcamento nullable
                -- só permitido quando tipo='saida_obra'
destino         text nullable
                -- obrigatório quando tipo='saida_obra' (texto livre:
                -- "Farmácia Tatuí", "manutenção", "amostra")
nota_fiscal     text nullable     -- número da NF na compra
observacao      text nullable     -- obrigatória em ajustes (justificativa)
criado_por      uuid fk auth.users not null
created_at      timestamptz not null default now()
```

**Sem coluna `updated_at`.** Registros não são editáveis.

Índices:
- `(material_id, created_at desc)` — para saldo e histórico por material.
- `(tipo, created_at desc)` — para filtros por tipo.
- `(orcamento_id)` — para "o que saiu para este orçamento".
- `(fornecedor_id, created_at desc)` — para histórico por fornecedor.

CHECKs de integridade (reforçam a validação Pydantic no DB):

```sql
alter table estoque_movimento add constraint mov_compra_precisa_preco check (
  tipo <> 'compra' or (preco_unitario is not null and fornecedor_id is not null)
);
alter table estoque_movimento add constraint mov_saida_precisa_destino check (
  tipo <> 'saida_obra' or destino is not null
);
alter table estoque_movimento add constraint mov_ajuste_precisa_motivo check (
  tipo not in ('ajuste_positivo','ajuste_negativo') or observacao is not null
);
alter table estoque_movimento add constraint mov_sem_fornecedor_fora_compra check (
  tipo = 'compra' or fornecedor_id is null
);
alter table estoque_movimento add constraint mov_sem_orcamento_fora_saida check (
  tipo = 'saida_obra' or orcamento_id is null
);
alter table estoque_movimento add constraint mov_preco_fora_compra_null check (
  tipo = 'compra' or preco_unitario is null
);
```

### 6.5 View `estoque_saldo_v`

```sql
create view estoque_saldo_v as
select
  m.id as material_id,
  coalesce(sum(
    case mv.tipo
      when 'compra'            then  mv.quantidade
      when 'ajuste_positivo'   then  mv.quantidade
      when 'saida_obra'        then -mv.quantidade
      when 'ajuste_negativo'   then -mv.quantidade
    end
  ), 0) as saldo
from material m
left join estoque_movimento mv on mv.material_id = m.id
group by m.id;
```

Retorna saldo de **todos** os materiais, incluindo os com saldo zero ou negativo. Saldo negativo é permitido e indica divergência operacional — aparece como alerta na UI.

### 6.6 Row-Level Security

Tabelas novas: admin-only. Ledger imutável: sem policy de UPDATE/DELETE (bloqueio por padrão).

```sql
alter table fornecedor        enable row level security;
alter table estoque_movimento enable row level security;

create policy "fornecedor_admin_all" on fornecedor for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "estoque_movimento_admin_read" on estoque_movimento for select
  using (current_role_internal() = 'admin');
create policy "estoque_movimento_admin_insert" on estoque_movimento for insert
  with check (current_role_internal() = 'admin');
-- sem UPDATE/DELETE → negado por padrão (ledger imutável)
```

A view `estoque_saldo_v` é sempre lida do backend com service role. Frontend não consulta diretamente.

## 7. API backend

Todos os endpoints exigem JWT válido + `role='admin'` (reusa `Depends(require_role('admin'))` da onda 1).

### 7.1 Fornecedor

```
GET    /api/fornecedor              lista (query: ativo?, q=busca por nome)
POST   /api/fornecedor              cria
PATCH  /api/fornecedor/:id          edita
DELETE /api/fornecedor/:id          soft delete (seta ativo=false)
```

Não há hard delete. Se o fornecedor já foi usado em `estoque_movimento`, a FK preserva o histórico; o soft delete apenas tira o fornecedor das listagens padrão.

### 7.2 Movimento

```
GET  /api/estoque/movimento         lista com filtros
POST /api/estoque/movimento         cria (validação por tipo, ver 7.4)
GET  /api/estoque/movimento/:id     detalhe
```

Filtros do GET: `material_id`, `tipo`, `fornecedor_id`, `orcamento_id`, `data_inicio`, `data_fim`, paginação (`limit`, `offset`).

**Sem PATCH/DELETE** — ledger é append-only. Corrigir = lançar movimento reverso.

### 7.3 Saldo

```
GET /api/estoque/saldo              saldo de todos os materiais
                                    ?abaixo_minimo=true filtra
                                    ?q=busca por sku/nome
GET /api/estoque/saldo/:material_id saldo + últimos N movimentos do material
```

Response de `GET /api/estoque/saldo`:

```json
[
  {
    "material_id": "uuid",
    "sku": "PLC-GLX-125",
    "nome": "Placa Glasroc-X 12,5",
    "categoria": "fechamento",
    "unidade": "pc",
    "saldo": 23.000,
    "estoque_minimo": 40.000,
    "abaixo_minimo": true,
    "preco_unitario": 85.00
  }
]
```

Regra de `abaixo_minimo`: só vale `true` quando `estoque_minimo > 0 AND saldo < estoque_minimo`. Materiais com `estoque_minimo = 0` (não monitorados) nunca aparecem como abaixo do mínimo, mesmo com saldo zero. O filtro `?abaixo_minimo=true` e o card do dashboard seguem a mesma regra.

### 7.4 Análise de fabricação

```
GET /api/estoque/fabricacao/:orcamento_id
```

Pega `orcamento_item` (BOM congelada), compara com saldo atual, devolve linha a linha + totais:

```json
{
  "orcamento_id": "uuid",
  "orcamento_numero": "ORC-2026-0012",
  "cliente_nome": "Farmácia Tatuí",
  "produto_nome": "Farmácia Express 3×6",
  "itens": [
    {
      "material_id": "uuid",
      "sku": "PLC-GLX-125",
      "nome": "Placa Glasroc-X 12,5",
      "unidade": "pc",
      "necessario": 28.000,
      "saldo_atual": 23.000,
      "falta": 5.000,
      "status": "faltante",
      "preco_unitario": 85.00,
      "custo_reposicao_linha": 425.00
    }
  ],
  "totais": {
    "itens_total": 18,
    "itens_faltantes": 4,
    "custo_reposicao": 1250.00
  }
}
```

`status`: `suficiente` quando `saldo_atual >= necessario`, `faltante` caso contrário. `custo_reposicao_linha = max(0, falta) × material.preco_unitario`.

### 7.5 Validação Pydantic (discriminated union)

```python
class MovimentoCompra(BaseModel):
    tipo: Literal['compra']
    material_id: UUID
    quantidade: Decimal  # > 0
    preco_unitario: Decimal
    fornecedor_id: UUID
    nota_fiscal: str | None = None
    observacao: str | None = None

class MovimentoSaidaObra(BaseModel):
    tipo: Literal['saida_obra']
    material_id: UUID
    quantidade: Decimal
    orcamento_id: UUID | None = None
    destino: str                     # obrigatório
    observacao: str | None = None

class MovimentoAjuste(BaseModel):
    tipo: Literal['ajuste_positivo','ajuste_negativo']
    material_id: UUID
    quantidade: Decimal
    observacao: str                  # obrigatório
```

`saida_obra` e `ajuste_negativo` **não bloqueiam saldo negativo** — registram e sinalizam. Bloquear travaria o admin em momentos de urgência.

### 7.6 Alteração em rotas de `material`

O PATCH/POST de material (onda 1) aceita agora o campo `estoque_minimo`. Nenhuma rota nova.

## 8. Frontend

### 8.1 Rotas

```
/admin/estoque                          redirect → /saldo
/admin/estoque/saldo                    tabela de saldo
/admin/estoque/movimentos               lista + filtros + botão "novo"
/admin/estoque/fornecedores             CRUD
/admin/estoque/fabricacao               picker de orçamento
/admin/estoque/fabricacao/:orcamento_id análise
```

Sub-nav horizontal dentro de `/admin/estoque/*` (4 abas).

### 8.2 Componentes (`frontend/src/components/Estoque/`)

Um arquivo por componente (regra do projeto):

- `EstoqueNav.tsx` — sub-nav das 4 abas.
- `SaldoTable.tsx` — tabela de saldo com badge "abaixo do mínimo", ordenação por coluna, filtro textual + toggle "só baixo".
- `MovimentoList.tsx` — tabela de movimentos com ícone por tipo.
- `MovimentoFiltros.tsx` — barra de filtros.
- `MovimentoForm.tsx` — modal/drawer que troca de shape pelo `tipo` (discriminated union espelha Pydantic). Em `saida_obra`, quando o admin seleciona um `orcamento_id`, o campo `destino` é pré-preenchido com `"{orcamento.numero} – {cliente_nome}"` e segue editável.
- `FornecedorList.tsx` / `FornecedorForm.tsx`.
- `FabricacaoPicker.tsx` — combobox de orçamentos (default: `status in ('aprovado','enviado')`).
- `FabricacaoAnalise.tsx` — tabela necessário/saldo/falta com destaques visuais para linhas faltantes.

### 8.3 Páginas (`frontend/src/pages/admin/`)

Novas:
- `AdminEstoqueLayout.tsx` — shell com `<EstoqueNav/>` + `<Outlet/>`.
- `AdminEstoqueSaldo.tsx`
- `AdminEstoqueMovimentos.tsx`
- `AdminEstoqueFornecedores.tsx`
- `AdminEstoqueFabricacaoPicker.tsx`
- `AdminEstoqueFabricacao.tsx`

### 8.4 Mudanças em páginas existentes

- `AdminDashboard.tsx`: dois cards novos na parte superior — "X materiais abaixo do mínimo" (link p/ saldo?abaixo_minimo) e "Últimos movimentos" (link p/ lista).
- `AdminOrcamentoDetail.tsx`: botão "Análise de fabricação" → `/admin/estoque/fabricacao/:orcamento_id`.
- `AdminMateriais.tsx`: formulário de material ganha campo `estoque_minimo`.
- `AdminLayout.tsx`: adiciona "Estoque" ao menu principal.

### 8.5 Fetching

Segue o padrão da onda 1 via `lib/api.ts`. Sem `supabase-js` direto para dados de estoque (sensíveis — passam sempre por backend).

### 8.6 Identidade visual

Sem mudança. Mesma paleta, mesmos tokens, mesmo `--mf-bg-light` na área admin. Badges de status reusam tokens existentes (`--mf-warning` para "abaixo do mínimo", `--mf-danger` para saldo negativo, `--mf-success` para "suficiente").

## 9. Dev local e migration

Não muda pré-requisitos nem comandos. A onda 2 adiciona um arquivo:

```
supabase/migrations/005_estoque.sql
```

Ordem interna do arquivo:

1. `alter table material add column estoque_minimo`.
2. `create type estoque_movimento_tipo`.
3. `create table fornecedor` + trigger `updated_at` + índice `(nome)`.
4. `create table estoque_movimento` + índices + CHECKs.
5. `create view estoque_saldo_v`.
6. `enable row level security` em `fornecedor` e `estoque_movimento` + policies.

`make migrate` reaplica tudo. `make seed` reaplica seed com dados de estoque de exemplo.

## 10. Seed

Arquivo `supabase/seed.sql` recebe acréscimos (sem remover nada da onda 1):

- **3 fornecedores** fictícios: Casa do Construtor, Metalúrgica Santos, Aço Forte.
- **`estoque_minimo`** preenchido em ~10 materiais representativos: placa Glasroc-X, perfil LSF, parafuso metal/metal, placa gesso, telha TP40 PIR, LVT, kit WC, kit elétrico, splitter AC, manta asfáltica.
- **~15 movimentos de exemplo:**
  - 8-10 compras antigas (criando saldo inicial variado: alguns acima, outros abaixo do mínimo).
  - 2 ajustes (um + e um −).
  - 2 saídas com `orcamento_id` apontando para orçamento seed da onda 1 (se existir) ou texto livre.

Garante que a UI tem dados realistas desde o primeiro `make seed`.

## 11. Testes

### 11.1 Backend (pytest)

**Unit — `services/estoque.py`:**
- `calcular_saldo(material_id)` com sequências de movimentos: compra só, compra + saída, ajustes, saldo sem movimentos, saldo negativo.
- `analise_fabricacao(orcamento_id)`: BOM × saldo zero, BOM × saldo suficiente, BOM × saldo parcial, orçamento inexistente (404).
- Validação Pydantic: rejeita compra sem preço ou fornecedor, saída sem destino, ajuste sem observação. Aceita saída com `orcamento_id` e com texto livre.

**Integração — endpoints:**
- `POST /api/estoque/movimento` cada tipo → 201 + saldo atualizado.
- `GET /api/estoque/saldo` com e sem `abaixo_minimo`.
- `GET /api/estoque/fabricacao/:id` retorna linhas faltantes quando saldo < BOM.
- CRUD `/api/fornecedor`.
- Role-gating: vendedor e anônimo recebem 403/401 em todas as rotas novas.
- CHECKs do banco exercitados pelo menos uma vez cada.

### 11.2 Frontend (vitest + Testing Library)

- `MovimentoForm.tsx` troca de shape por `tipo`; validação client-side casa com Pydantic.
- `SaldoTable.tsx` — badge "abaixo do mínimo" quando `saldo < estoque_minimo` e `estoque_minimo > 0`.
- `FabricacaoAnalise.tsx` — linha "faltante" quando `necessario > saldo_atual`.
- `EstoqueNav.tsx` — aba ativa sincroniza com rota.

### 11.3 e2e (Playwright, nightly)

- **Compra → saldo:** login admin → cadastra fornecedor → lança compra → saldo sobe pela quantidade comprada.
- **Análise de fabricação:** parte de orçamento seed aprovado → clica "Análise de fabricação" → vê linhas com `falta` calculada → confirma que material seed propositalmente zerado aparece como faltante.

### 11.4 Cobertura alvo

- `services/estoque.py`: ≥ 90%.
- Routers novos: ≥ 80%.
- Componentes `MovimentoForm`, `SaldoTable`, `FabricacaoAnalise`: caminho feliz + um edge case cada.

### 11.5 CI

Workflow existente pega automaticamente. Sem orquestração nova.

## 12. Riscos e premissas

**Riscos:**
- **Saldo negativo acumulado** se usuário esquece de lançar compras. Mitigação: destacar saldo negativo na UI (cor `--mf-danger`) + card no dashboard.
- **`material.preco_unitario` defasado** conforme fornecedores reajustam. Mitigação: na tabela de movimentos, coluna "último preço pago" ajuda admin a comparar e decidir quando atualizar manualmente.
- **Performance da view de saldo** com milhares de movimentos. Mitigação: índice `(material_id, created_at)`, e plano B de promover para `materialized view` sem mexer na API.

**Premissas:**
- Volume de movimentos: dezenas a centenas por mês. View comum dá conta.
- Admin é disciplinado o suficiente para lançar compras no recebimento (ou no dia seguinte). Sem isso, dados divergem da realidade — mas o sistema não pode resolver o que o usuário não insere.
- Unidade do material no cadastro corresponde à unidade real de uso e compra. Se divergir, cadastra-se material adicional.
- Orçamentos aprovados representam fabricação imediata ou iminente — a análise de fabricação tem utilidade prática a partir deles.

## 13. Definição de pronto

- [ ] Migration `005_estoque.sql` aplica limpa sobre o estado da onda 1 (`make migrate` sem erro).
- [ ] `material.estoque_minimo` editável no CRUD admin existente.
- [ ] CRUD de fornecedor completo em `/admin/estoque/fornecedores`.
- [ ] Lançamento dos 4 tipos de movimento com validação por tipo (Pydantic + CHECKs no banco).
- [ ] Ledger é append-only: nenhuma rota de update/delete em `estoque_movimento`.
- [ ] Saldo exposto via `/api/estoque/saldo` com filtro `abaixo_minimo`.
- [ ] Filtros em `/admin/estoque/movimentos` (material, tipo, fornecedor, orçamento, datas) funcionam.
- [ ] Card "materiais abaixo do mínimo" no `/admin` com contagem e link direto.
- [ ] Botão "Análise de fabricação" no detalhe do orçamento abre análise com `necessario / saldo / falta / custo_reposicao`.
- [ ] Saída com `orcamento_id` amarra ao orçamento; saída só com `destino` texto também funciona.
- [ ] RLS admin-only nas duas tabelas novas; vendedor e anônimo recebem 403/401.
- [ ] Seed inclui fornecedores, mínimos em ~10 materiais e ~15 movimentos iniciais.
- [ ] Testes backend (unit + integração) passam; cobertura `services/estoque.py` ≥ 90%.
- [ ] e2e nightly cobre "compra → saldo" e "análise de fabricação".
- [ ] `make dev` sobe o ambiente completo sem configuração extra.
- [ ] README atualizado: seção "Onda 2 — Estoque" com fluxos principais.
