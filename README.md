# ERP Metalfort

MVP de orçamento de construções modulares em steelframe.

Veja `docs/superpowers/specs/2026-04-18-erp-metalfort-onda1-design.md` para a visão completa.

## Pré-requisitos
- Docker Desktop
- Node 20+
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- Supabase CLI: `npm i -g supabase` (ou usar `npx supabase`)

## Desenvolvimento local
```bash
make dev
```
Sobe Supabase local (Docker), FastAPI e frontend em paralelo.

Serviços expostos:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Supabase Studio: http://localhost:54323
