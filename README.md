# ERP Metalfort

MVP de orçamento de construções modulares em steelframe. Onda 1 do ERP.

Entrega um site público onde um cliente monta seu orçamento e recebe um PDF,
e um painel interno (login) onde a equipe Metalfort cria/aprova orçamentos com addons e gerencia catálogo.

Veja `docs/superpowers/specs/2026-04-18-erp-metalfort-onda1-design.md` para o design completo.

## Pré-requisitos
- Docker Desktop
- Node 20+
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- Supabase CLI: `npm i -g supabase` (ou usar `npx supabase`)
- macOS: `brew install pango` (WeasyPrint precisa de Pango/Cairo nativos)

## Dev local

```bash
# 1. Preparar envs (primeira vez)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Subir tudo
make dev
```

Serviços:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Supabase Studio: http://localhost:54323

Primeira vez: rode `make migrate` para aplicar schema + seed.

### Login admin de dev
Email: `admin@metalfort.tech` — senha: `metalfort2026!`

## Comandos úteis

```bash
make dev          # sobe supabase + backend + frontend
make migrate      # supabase db reset (aplica migrations + seed)
make test         # unit tests (backend + frontend)
make supabase-stop
```

## Estrutura

```
frontend/    # React + Vite + Tailwind (Vercel)
backend/     # FastAPI + uv (Railway)
supabase/    # migrations/ + seed.sql (Supabase CLI)
database/tests/  # fixtures compartilhadas por Py/TS
docs/        # specs + plans
```

## Onda 2 — Controle de Estoque

Adicionada em 2026-04. Admin-only. Design: `docs/superpowers/specs/2026-04-19-erp-metalfort-onda2-design.md`.

### Capacidades

- CRUD de **fornecedor** (`/admin/estoque/fornecedores`).
- Lançamento de 4 tipos de **movimento** (`/admin/estoque/movimentos`):
  - `compra` (exige preço e fornecedor).
  - `saida_obra` (exige destino; aceita `orcamento_id` para amarrar à venda).
  - `ajuste_positivo` / `ajuste_negativo` (exigem justificativa).
- **Saldo** calculado via view SQL (`estoque_saldo_v`) a partir do ledger imutável `estoque_movimento`. Visualização em `/admin/estoque/saldo`.
- Alerta **"abaixo do mínimo"** por material (campo `material.estoque_minimo`; 0 desativa o alerta).
- **Análise de fabricação** (`/admin/estoque/fabricacao/:orcamento_id`): compara BOM congelada do orçamento (onda 1) com saldo atual, aponta o que falta e o custo de reposição.
- Botão "Análise de fabricação" direto do detalhe do orçamento.
- Dashboard ganha dois cards: contagem de materiais abaixo do mínimo + últimos 5 movimentos.

### Fluxo rápido

```bash
make dev
# no browser:
#  1) /admin/login (admin@metalfort.tech / metalfort2026!)
#  2) /admin/estoque/saldo → ver saldo; filtrar "só abaixo do mínimo"
#  3) /admin/estoque/movimentos → "Novo movimento" → Compra → atualiza saldo
#  4) /admin/orcamento/:id → "Análise de fabricação" → vê o que precisa comprar
```

### Arquitetura

- **DB:** `supabase/migrations/005_estoque.sql` (tabelas, enum, view, CHECKs, RLS admin-only).
- **Backend:** `app/models/estoque.py`, `app/services/estoque.py`, `app/routers/estoque.py`, `app/routers/fornecedor.py`.
- **Frontend:** `src/components/Estoque/*`, `src/pages/admin/AdminEstoque*.tsx`, `src/lib/estoque.ts`.

### Testes de integração (opcionais)

Os testes HTTP contra Supabase + uvicorn são gated por `RUN_INTEGRATION=1`:

```bash
make dev   # em um terminal
RUN_INTEGRATION=1 \
  SUPABASE_URL=http://127.0.0.1:54321 \
  SUPABASE_ANON_KEY=$(grep SUPABASE_PUBLISHABLE_KEY backend/.env | cut -d= -f2 | tr -d ' ') \
  (cd backend && uv run pytest tests/test_estoque_api.py -v)
```

## Próximas ondas

- Onda 3 — acompanhamento de obras (consumo real por projeto)
- Onda 4 — editor visual de layout interno
