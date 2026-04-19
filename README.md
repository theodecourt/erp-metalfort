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

## Próximas ondas (não incluídas neste MVP)
- Onda 2 — controle de estoque (saldos + movimentações)
- Onda 3 — acompanhamento de obras (consumo real por projeto)
- Onda 4 — editor visual de layout interno
