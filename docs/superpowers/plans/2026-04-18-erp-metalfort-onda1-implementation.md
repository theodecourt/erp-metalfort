# ERP Metalfort — Onda 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working local MVP where (1) a public visitor can configure a steelframe modular product through 9 alavancas and submit a lead that generates a PDF + email, and (2) an authenticated internal user can create/edit quotes with Tier C addons and manage the catalog.

**Architecture:** Monorepo with three boundaries — React/TS frontend (Vercel target), FastAPI backend (Railway target), and Supabase (Postgres + Auth + Storage). A parametric formula engine is the heart of the system, with **byte-identical implementations in Python and TypeScript** sharing JSON fixtures validated in CI. Dev runs 100% locally via Supabase CLI before any cloud deploy.

**Tech Stack:**
- Frontend: React 18 · Vite · TypeScript · Tailwind · supabase-js · React Router
- Backend: FastAPI · Pydantic v2 · uv · WeasyPrint · Resend SDK · PyJWT · slowapi
- DB/Auth/Storage: Supabase CLI (local Postgres 15 + GoTrue + Storage API)
- Tests: pytest · Vitest · Playwright
- CI: GitHub Actions

**Spec:** `docs/superpowers/specs/2026-04-18-erp-metalfort-onda1-design.md` (read it before starting).

---

## Phase 0 — Worktree & Branch Setup

### Task 0.1: Isolate work on a feature branch

**Files:** none (git plumbing only)

- [ ] **Step 1: Confirm on main with clean tree**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort
git status
git log --oneline -3
```
Expected: branch `main`, only commit `eca1e79 docs: initial design spec...`, no uncommitted files besides untracked `.superpowers/`.

- [ ] **Step 2: Create feature branch**

```bash
git checkout -b feat/onda1-mvp
```
Expected: `Switched to a new branch 'feat/onda1-mvp'`.

- [ ] **Step 3: Verify**

```bash
git branch --show-current
```
Expected: `feat/onda1-mvp`.

---

## Phase A — Foundation (scaffolding & dev loop)

### Task A.1: Create monorepo structure & `.gitignore`

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `frontend/`, `backend/`, `database/migrations/`, `database/seed/`, `database/tests/`, `supabase/` (directory markers)

- [ ] **Step 1: Create `.gitignore`**

Write `.gitignore`:
```
# Superpowers (brainstorm/plans artifacts that aren't the docs)
.superpowers/

# Node
node_modules/
dist/
build/
*.log
.vite/

# Python
__pycache__/
*.pyc
.venv/
venv/
.pytest_cache/
.mypy_cache/

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/

# Supabase local data
supabase/.branches/
supabase/.temp/

# Vercel / Railway local caches
.vercel/
.railway/

# PDFs generated in dev
/tmp/sent/
```

- [ ] **Step 2: Create `README.md`**

Write `README.md`:
```markdown
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
```

- [ ] **Step 3: Create empty directories with `.keep` markers**

```bash
mkdir -p frontend backend/app backend/tests database/migrations database/seed database/tests supabase
touch frontend/.keep backend/app/.keep backend/tests/.keep database/tests/.keep supabase/.keep
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore README.md frontend backend database supabase
git commit -m "chore: monorepo scaffolding (gitignore, readme, empty dirs)"
```

### Task A.2: Initialize Supabase CLI config

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Initialize**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort
npx supabase init --workdir .
```
Answer `N` to VSCode settings. This generates `supabase/config.toml`.

- [ ] **Step 2: Verify ports don't collide**

Open `supabase/config.toml`, confirm defaults:
- `[api] port = 54321`
- `[db] port = 54322`
- `[studio] port = 54323`
- `[inbucket] port = 54324`

Leave as-is.

- [ ] **Step 3: Boot once to confirm Docker works**

```bash
npx supabase start
```
Expected: prints `API URL`, `DB URL`, `Studio URL`, `anon key`, `service_role key`, `JWT secret`. **Save these to a scratch note** — the plan will reference them in `.env` files.

- [ ] **Step 4: Stop**

```bash
npx supabase stop
```

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "chore(supabase): initialize local CLI config"
```

### Task A.3: Scaffold FastAPI backend

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`
- Create: `backend/.python-version`

- [ ] **Step 1: Write `backend/.python-version`**

```
3.12
```

- [ ] **Step 2: Write `backend/pyproject.toml`**

```toml
[project]
name = "erp-metalfort-backend"
version = "0.1.0"
description = "FastAPI backend for ERP Metalfort"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic>=2.9",
    "pydantic-settings>=2.5",
    "httpx>=0.27",
    "supabase>=2.8",
    "pyjwt[crypto]>=2.9",
    "python-multipart>=0.0.12",
    "slowapi>=0.1.9",
    "weasyprint>=62",
    "resend>=2.4",
    "jinja2>=3.1",
]

[dependency-groups]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "pytest-cov>=5.0",
    "ruff>=0.6",
    "mypy>=1.11",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 3: Write `backend/app/__init__.py`**

```python
"""ERP Metalfort backend."""
```

- [ ] **Step 4: Write `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    resend_api_key: str = ""
    allowed_origins: str = "http://localhost:5173"
    metalfort_notification_email: str = "theo@metalfort.tech"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
```

- [ ] **Step 5: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="ERP Metalfort API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 6: Write `backend/.env.example`**

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=replace-with-supabase-start-output
SUPABASE_SERVICE_ROLE_KEY=replace-with-supabase-start-output
SUPABASE_JWT_SECRET=replace-with-supabase-start-output
RESEND_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173
METALFORT_NOTIFICATION_EMAIL=theo@metalfort.tech
```

- [ ] **Step 7: Install and boot**

```bash
cd backend
uv sync
cp .env.example .env
# Edit .env, paste the anon_key / service_role_key / jwt_secret from the supabase start output
uv run uvicorn app.main:app --reload --port 8000 &
sleep 2
curl http://localhost:8000/health
kill %1
```
Expected `curl` output: `{"status":"ok"}`.

- [ ] **Step 8: Commit**

```bash
cd ..
git add backend/
git commit -m "feat(backend): FastAPI skeleton with health check and settings"
```

### Task A.4: Scaffold React + Vite + Tailwind frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/.env.example`

- [ ] **Step 1: Init via Vite template**

```bash
cd frontend
npm create vite@latest . -- --template react-ts --yes
```

- [ ] **Step 2: Add dependencies**

```bash
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Write `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'mf-black': 'var(--mf-black)',
        'mf-black-soft': 'var(--mf-black-soft)',
        'mf-yellow': 'var(--mf-yellow)',
        'mf-yellow-hover': 'var(--mf-yellow-hover)',
        'mf-bg-light': 'var(--mf-bg-light)',
        'mf-border': 'var(--mf-border)',
        'mf-success': 'var(--mf-success)',
        'mf-warning': 'var(--mf-warning)',
        'mf-danger': 'var(--mf-danger)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Overwrite `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --mf-black: #0A0A0A;
  --mf-black-soft: #1A1A1A;
  --mf-yellow: #FACC15;
  --mf-yellow-hover: #EAB308;
  --mf-text-primary: #FFFFFF;
  --mf-text-secondary: #A3A3A3;
  --mf-text-ink: #0A0A0A;
  --mf-bg-light: #F5F5F5;
  --mf-border: #2A2A2A;
  --mf-success: #22C55E;
  --mf-warning: #EAB308;
  --mf-danger: #EF4444;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  font-feature-settings: 'tnum';
  background: var(--mf-bg-light);
  color: var(--mf-text-ink);
}
```

- [ ] **Step 5: Write `frontend/.env.example`**

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=replace-with-supabase-start-output
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 6: Replace `frontend/src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mf-black text-white">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          <span className="text-mf-yellow">Metalfort</span> ERP
        </h1>
        <p className="text-mf-text-secondary">Dev skeleton up.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Boot once to verify**

```bash
cp .env.example .env.local
npm run dev &
sleep 3
curl -s http://localhost:5173 | head -20
kill %1
```
Expected: HTML with `<div id="root">`.

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): Vite + React + Tailwind skeleton with design tokens"
```

### Task A.5: `Makefile` — single-command dev loop

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Write `Makefile`**

```makefile
.PHONY: dev dev-backend dev-frontend supabase-start supabase-stop migrate seed test clean

SHELL := /bin/bash

dev:
	@trap 'make supabase-stop' EXIT; \
	make supabase-start && \
	(cd backend && uv run uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

supabase-start:
	npx supabase start

supabase-stop:
	npx supabase stop

migrate:
	npx supabase db reset

seed: migrate

test:
	cd backend && uv run pytest
	cd frontend && npm test -- --run

clean:
	npx supabase stop --no-backup 2>/dev/null || true
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
```

- [ ] **Step 2: Smoke test**

```bash
make supabase-start
sleep 5
curl -s http://127.0.0.1:54321/rest/v1/ -H "apikey: $(grep ANON_KEY supabase/.temp/*.env 2>/dev/null | head -1 | cut -d= -f2)" | head -5 || echo "API reachable"
make supabase-stop
```
Expected: Supabase boots, API responds, stops cleanly.

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "chore: Makefile with make dev / make test / make migrate targets"
```

---

## Phase B — Database schema, RLS, seed

### Task B.1: Migration 001 — schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Write `supabase/migrations/001_schema.sql`**

```sql
-- Enums
create type material_categoria as enum (
  'estrutura','fechamento','instalacoes','acabamento','esquadria','equipamento','servico'
);
create type material_unidade as enum (
  'kg','m','m2','pc','cx','und','h','bd','rl','sc','ml','ct'
);
create type produto_tipo_base as enum ('3x3','3x6','3x9');
create type produto_finalidade as enum (
  'casa','farmacia','loja','conveniencia','escritorio','quiosque','outro'
);
create type produto_opcao_tipo as enum (
  'tamanho_modulo','qtd_modulos','pe_direito','cor',
  'pacote_acabamento','esquadria','piso','wc','ac'
);
create type bom_tier as enum ('core','addon');
create type orcamento_tipo as enum ('publico','interno');
create type orcamento_tier as enum ('core','full');
create type orcamento_status as enum ('rascunho','enviado','aprovado','perdido');
create type usuario_role as enum ('admin','vendedor');

-- Helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- material
create table material (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nome text not null,
  categoria material_categoria not null,
  unidade material_unidade not null,
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger material_updated_at before update on material
  for each row execute function set_updated_at();

-- produto
create table produto (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  tipo_base produto_tipo_base not null,
  finalidade produto_finalidade not null default 'outro',
  pe_direito_sugerido_m numeric(3,2) not null,
  descricao text,
  imagem_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger produto_updated_at before update on produto
  for each row execute function set_updated_at();

-- produto_opcao
create table produto_opcao (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto(id) on delete cascade,
  tipo produto_opcao_tipo not null,
  label text not null,
  valores_possiveis_json jsonb not null,
  default_json jsonb not null,
  ordem int not null default 0,
  unique (produto_id, tipo)
);

-- produto_bom_regra
create table produto_bom_regra (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto(id) on delete cascade,
  material_id uuid not null references material(id),
  formula_json jsonb not null,
  tier bom_tier not null default 'core',
  categoria material_categoria not null,
  ordem int not null default 0
);

-- usuario_interno
create table usuario_interno (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role usuario_role not null default 'vendedor',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- orcamento
create sequence orcamento_numero_seq;
create table orcamento (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_nome text not null,
  cliente_email text not null,
  cliente_telefone text,
  produto_id uuid not null references produto(id),
  finalidade produto_finalidade not null,
  configuracao_json jsonb not null,
  tipo orcamento_tipo not null,
  tier_aplicado orcamento_tier not null default 'core',
  valor_subtotal numeric(12,2) not null,
  valor_gerenciamento_pct numeric(4,2) not null default 8.0,
  valor_total numeric(12,2) not null,
  criado_por uuid references auth.users(id) on delete set null,
  status orcamento_status not null default 'rascunho',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orcamento_updated_at before update on orcamento
  for each row execute function set_updated_at();

-- orcamento_item (snapshot)
create table orcamento_item (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamento(id) on delete cascade,
  material_id uuid not null references material(id),
  descricao text not null,
  unidade text not null,
  quantidade numeric(12,3) not null,
  preco_unitario numeric(12,2) not null,
  subtotal numeric(14,2) not null,
  tier bom_tier not null,
  categoria text not null,
  ordem int not null default 0
);

create index idx_orcamento_status on orcamento(status);
create index idx_orcamento_tipo on orcamento(tipo);
create index idx_orcamento_created_at on orcamento(created_at desc);
create index idx_orcamento_item_orcamento on orcamento_item(orcamento_id);
create index idx_produto_bom_regra_produto on produto_bom_regra(produto_id);
```

- [ ] **Step 2: Apply**

```bash
make migrate
```
Expected: migration 001 applied. If `make migrate` fails because Supabase isn't running, run `make supabase-start` first.

- [ ] **Step 3: Verify tables exist**

```bash
npx supabase db dump --schema public --data-only=false | grep -E "^CREATE TABLE" | wc -l
```
Expected: `7` (material, produto, produto_opcao, produto_bom_regra, usuario_interno, orcamento, orcamento_item).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat(db): migration 001 — core schema (material, produto, bom, orcamento)"
```

### Task B.2: Migration 002 — Row-Level Security

**Files:**
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Write `supabase/migrations/002_rls.sql`**

```sql
-- Enable RLS on all tables
alter table material enable row level security;
alter table produto enable row level security;
alter table produto_opcao enable row level security;
alter table produto_bom_regra enable row level security;
alter table orcamento enable row level security;
alter table orcamento_item enable row level security;
alter table usuario_interno enable row level security;

-- Helper: returns role of current user (null if not logged in)
create or replace function current_role_internal() returns usuario_role
language sql stable as $$
  select role from usuario_interno where id = auth.uid() and ativo = true
$$;

-- material: public read, admin write
create policy "material_public_read" on material for select using (true);
create policy "material_admin_write" on material for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- produto: public read, admin write
create policy "produto_public_read" on produto for select using (true);
create policy "produto_admin_write" on produto for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- produto_opcao: public read, admin write
create policy "produto_opcao_public_read" on produto_opcao for select using (true);
create policy "produto_opcao_admin_write" on produto_opcao for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- produto_bom_regra: authenticated read only (price sensitivity), admin write
create policy "produto_bom_regra_auth_read" on produto_bom_regra for select
  using (auth.role() = 'authenticated');
create policy "produto_bom_regra_admin_write" on produto_bom_regra for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

-- orcamento:
-- - anon can insert (lead capture) with restricted columns enforced by API
-- - authenticated vendedor/admin read all
-- - no public select
create policy "orcamento_public_insert" on orcamento for insert
  with check (tipo = 'publico');
create policy "orcamento_internal_read" on orcamento for select
  using (current_role_internal() in ('admin','vendedor'));
create policy "orcamento_internal_write" on orcamento for update
  using (current_role_internal() in ('admin','vendedor'))
  with check (current_role_internal() in ('admin','vendedor'));
create policy "orcamento_admin_delete" on orcamento for delete
  using (current_role_internal() = 'admin');

-- orcamento_item: no direct client access; server uses service role
-- (policies deny all by default after enabling RLS)

-- usuario_interno: self-read, admin all
create policy "usuario_interno_self_read" on usuario_interno for select
  using (id = auth.uid());
create policy "usuario_interno_admin_all" on usuario_interno for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');
```

- [ ] **Step 2: Apply**

```bash
make migrate
```
Expected: both migrations applied cleanly.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_rls.sql
git commit -m "feat(db): migration 002 — row-level security policies"
```

### Task B.3: Seed materials (40 rows)

**Files:**
- Create: `supabase/seed.sql` (Supabase CLI auto-loads this on `db reset`)

- [ ] **Step 1: Write `supabase/seed.sql` (materials section)**

```sql
-- MATERIAIS (estrutura, fechamento, cobertura, drywall, forro, piso, instalações, esquadrias, serviços)
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
```

- [ ] **Step 2: Apply**

```bash
make migrate
```
Expected: 40 materials inserted.

- [ ] **Step 3: Verify via Studio**

Open http://localhost:54323 → table `material` → confirm 40 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed 40 materials across all categories"
```

### Task B.4: Seed 2 produtos + opções + BOM regras

**Files:**
- Modify: `supabase/seed.sql` (append)

- [ ] **Step 1: Append produtos section to `supabase/seed.sql`**

```sql
-- PRODUTOS
insert into produto (slug, nome, tipo_base, finalidade, pe_direito_sugerido_m, descricao) values
 ('farmacia-express-3x6','Farmácia Express 3×6','3x6','farmacia',2.70,
  'Módulo padronizado para farmácia de rua. 18m² úteis, turn-key comercial.'),
 ('loja-modular-3x9','Loja Modular 3×9','3x9','loja',3.00,
  'Módulo para loja de conveniência ou showroom pequeno. 27m² úteis.');

-- OPCOES (tamanho, qtd, pe_direito, cor, pacote, esquadria, piso, wc, ac)
-- Farmácia Express 3x6
insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'tamanho_modulo','Tamanho do módulo'::text,
  '["3x3","3x6","3x9"]'::jsonb,'"3x6"'::jsonb,1
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'qtd_modulos','Quantidade de módulos',
  '{"min":1,"max":3}'::jsonb,'1'::jsonb,2
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'pe_direito','Pé direito (m)',
  '{"min":2.40,"max":3.50,"step":0.10}'::jsonb,'2.70'::jsonb,3
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'cor','Cor externa',
  '["branco","cinza","preto","grafite"]'::jsonb,'"cinza"'::jsonb,4
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'pacote_acabamento','Pacote de acabamento',
  '["padrao","premium"]'::jsonb,'"padrao"'::jsonb,5
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'esquadria','Esquadrias extras',
  '{"portas":{"min":0,"max":2},"janelas":{"min":0,"max":4}}'::jsonb,
  '{"portas":0,"janelas":2}'::jsonb,6
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'piso','Piso',
  '["vinilico","ceramico","porcelanato"]'::jsonb,'"vinilico"'::jsonb,7
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'wc','WC interno',
  '[true,false]'::jsonb,'true'::jsonb,8
from produto where slug='farmacia-express-3x6';

insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select id,'ac','Splits de ar-condicionado',
  '{"min":0,"max":4}'::jsonb,'1'::jsonb,9
from produto where slug='farmacia-express-3x6';

-- (Loja Modular 3x9 reutiliza as mesmas 9 alavancas com defaults próprios)
insert into produto_opcao (produto_id, tipo, label, valores_possiveis_json, default_json, ordem)
select p.id, o.tipo, o.label, o.valores_possiveis_json,
  case o.tipo
    when 'tamanho_modulo' then '"3x9"'::jsonb
    when 'pe_direito' then '3.00'::jsonb
    when 'esquadria' then '{"portas":0,"janelas":3}'::jsonb
    when 'ac' then '2'::jsonb
    else o.default_json
  end as default_json,
  o.ordem
from produto p
cross join produto_opcao o
where p.slug='loja-modular-3x9'
  and o.produto_id = (select id from produto where slug='farmacia-express-3x6');
```

- [ ] **Step 2: Append produto_bom_regra section — Farmácia 3×6**

Append to `supabase/seed.sql`:

```sql
-- BOM regras — Farmácia Express 3x6 (Tier core + addons)
with p as (select id as pid from produto where slug='farmacia-express-3x6'),
 m as (select sku, id as mid from material)
-- ESTRUTURA (core)
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select mid from m where sku='MT-LSF-001'),
  '{"op":"mul","of":[{"op":"var","of":"area_planta_m2"},30]}'::jsonb,
  'core','estrutura',1 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-002'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_planta_m2"},30]}}'::jsonb,
  'core','estrutura',2 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-003'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"perimetro_externo_m"},10]}}'::jsonb,
  'core','estrutura',3 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-LSF-004'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"perimetro_externo_m"},3]}}'::jsonb,
  'core','estrutura',4 from p;
-- FECHAMENTO EXTERNO (core) — placa Glasroc-X com 7% waste
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-FCH-001'),
  '{"op":"ceil","of":{"op":"div","of":[{"op":"var","of":"area_fechamento_ext_m2"},2.88]},"waste":0.07}'::jsonb,
  'core','fechamento',5 from p;
-- COBERTURA (core) — área = planta
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-COB-001'),
  '{"op":"var","of":"area_cobertura_m2"}'::jsonb,
  'core','fechamento',6 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-COB-002'),
  '{"op":"var","of":"area_cobertura_m2"}'::jsonb,
  'core','fechamento',7 from p;
-- PISO (core) — área da planta
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-PIS-001'),
  '{"op":"var","of":"area_planta_m2"}'::jsonb,
  'core','acabamento',8 from p;
-- ESQUADRIAS (core) — porta ext fixa + extras
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ESQ-001'),
  '{"op":"var","of":"num_portas_ext"}'::jsonb,
  'core','esquadria',9 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ESQ-002'),
  '{"op":"var","of":"num_janelas"}'::jsonb,
  'core','esquadria',10 from p;
-- WC (core, condicional)
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-INS-001'),
  '{"op":"if","cond":{"op":"var","of":"tem_wc"},"then":1,"else":0}'::jsonb,
  'core','instalacoes',11 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ESQ-003'),
  '{"op":"if","cond":{"op":"var","of":"tem_wc"},"then":1,"else":0}'::jsonb,
  'core','esquadria',12 from p;
-- ELETRICA (core)
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-INS-002'),1::jsonb,
  'core','instalacoes',13 from p;
-- SERVIÇOS (core)
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-SVC-001'),
  '{"op":"var","of":"area_planta_m2"}'::jsonb,
  'core','servico',14 from p;
-- ADDONS
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-INS-003'),
  '{"op":"if","cond":{"op":"gt","of":[{"op":"var","of":"num_splits"},0]},"then":{"op":"var","of":"num_splits"},"else":0}'::jsonb,
  'addon','equipamento',15 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-ADD-001'),1::jsonb,
  'addon','servico',16 from p;
with p as (select id as pid from produto where slug='farmacia-express-3x6')
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select pid,(select id from material where sku='MT-SVC-002'),1::jsonb,
  'addon','servico',17 from p;

-- BOM regras — Loja Modular 3x9: copia as mesmas regras do produto farmácia
insert into produto_bom_regra (produto_id, material_id, formula_json, tier, categoria, ordem)
select (select id from produto where slug='loja-modular-3x9'),
  material_id, formula_json, tier, categoria, ordem
from produto_bom_regra
where produto_id = (select id from produto where slug='farmacia-express-3x6');
```

- [ ] **Step 3: Re-run migrate**

```bash
make migrate
```
Expected: 2 produtos, 18 produto_opcao, 34 produto_bom_regra rows.

- [ ] **Step 4: Verify counts**

```bash
npx supabase db execute --stdin <<'SQL'
select 'produto' as t, count(*) from produto
union all select 'produto_opcao', count(*) from produto_opcao
union all select 'produto_bom_regra', count(*) from produto_bom_regra;
SQL
```
Expected: `produto=2`, `produto_opcao=18`, `produto_bom_regra=34`.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed 2 products with 9 options each and 17 BOM rules"
```

### Task B.5: Seed dev admin user

**Files:**
- Create: `supabase/dev-seed-user.sql`

- [ ] **Step 1: Write `supabase/dev-seed-user.sql`**

```sql
-- Dev-only: create admin user. Never run in production.
-- Password: metalfort2026!
do $$
declare
  admin_uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
  values (
    admin_uid,
    'admin@metalfort.tech',
    crypt('metalfort2026!', gen_salt('bf')),
    now(),
    '{"nome":"Admin Dev"}'::jsonb,
    'authenticated',
    'authenticated'
  ) on conflict (email) do nothing;

  insert into usuario_interno (id, nome, role, ativo)
  select id, 'Admin Dev', 'admin', true from auth.users where email='admin@metalfort.tech'
  on conflict (id) do nothing;
end $$;
```

- [ ] **Step 2: Append an `\i` call to `supabase/seed.sql`**

Append at the bottom of `supabase/seed.sql`:
```sql
\i dev-seed-user.sql
```

- [ ] **Step 3: Re-run migrate**

```bash
make migrate
```
Expected: admin user exists.

- [ ] **Step 4: Verify login works**

```bash
curl -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $(grep ANON supabase/.temp/*.env 2>/dev/null | cut -d= -f2 | head -1)" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@metalfort.tech","password":"metalfort2026!"}'
```
Expected: JSON with `access_token` field.

- [ ] **Step 5: Commit**

```bash
git add supabase/dev-seed-user.sql supabase/seed.sql
git commit -m "feat(db): seed dev admin user (admin@metalfort.tech)"
```

---

## Phase C — Formula Engine (shared core, TDD)

### Task C.1: Shared fixtures file

**Files:**
- Create: `database/tests/formula-fixtures.json`

- [ ] **Step 1: Write `database/tests/formula-fixtures.json`**

```json
{
  "cases": [
    {
      "name": "literal_number",
      "formula": 42,
      "vars": {},
      "expect": 42
    },
    {
      "name": "var_lookup",
      "formula": {"op": "var", "of": "x"},
      "vars": {"x": 10},
      "expect": 10
    },
    {
      "name": "add",
      "formula": {"op": "add", "of": [1, 2, 3]},
      "vars": {},
      "expect": 6
    },
    {
      "name": "sub",
      "formula": {"op": "sub", "of": [10, 3, 1]},
      "vars": {},
      "expect": 6
    },
    {
      "name": "mul",
      "formula": {"op": "mul", "of": [{"op": "var", "of": "area"}, 30]},
      "vars": {"area": 18},
      "expect": 540
    },
    {
      "name": "div",
      "formula": {"op": "div", "of": [81, 2.88]},
      "vars": {},
      "expect": 28.125
    },
    {
      "name": "ceil",
      "formula": {"op": "ceil", "of": {"op": "div", "of": [81, 2.88]}},
      "vars": {},
      "expect": 29
    },
    {
      "name": "ceil_with_waste",
      "formula": {"op": "ceil", "of": {"op": "div", "of": [81, 2.88]}, "waste": 0.07},
      "vars": {},
      "expect": 31.03
    },
    {
      "name": "floor",
      "formula": {"op": "floor", "of": 3.9},
      "vars": {},
      "expect": 3
    },
    {
      "name": "round_half_up",
      "formula": {"op": "round", "of": 2.5},
      "vars": {},
      "expect": 3
    },
    {
      "name": "if_true",
      "formula": {"op": "if", "cond": true, "then": 1, "else": 0},
      "vars": {},
      "expect": 1
    },
    {
      "name": "if_var",
      "formula": {"op": "if", "cond": {"op": "var", "of": "tem_wc"}, "then": 1, "else": 0},
      "vars": {"tem_wc": true},
      "expect": 1
    },
    {
      "name": "gt_true",
      "formula": {"op": "gt", "of": [5, 3]},
      "vars": {},
      "expect": true
    },
    {
      "name": "gt_false",
      "formula": {"op": "gt", "of": [3, 5]},
      "vars": {},
      "expect": false
    },
    {
      "name": "split_addon",
      "formula": {"op": "if", "cond": {"op": "gt", "of": [{"op": "var", "of": "num_splits"}, 0]}, "then": {"op": "var", "of": "num_splits"}, "else": 0},
      "vars": {"num_splits": 2},
      "expect": 2
    },
    {
      "name": "split_addon_zero",
      "formula": {"op": "if", "cond": {"op": "gt", "of": [{"op": "var", "of": "num_splits"}, 0]}, "then": {"op": "var", "of": "num_splits"}, "else": 0},
      "vars": {"num_splits": 0},
      "expect": 0
    },
    {
      "name": "glasroc_36m2_planta",
      "formula": {"op": "ceil", "of": {"op": "div", "of": [{"op": "var", "of": "area_fechamento_ext_m2"}, 2.88]}, "waste": 0.07},
      "vars": {"area_fechamento_ext_m2": 81},
      "expect": 31.03
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add database/tests/formula-fixtures.json
git commit -m "test: shared formula engine fixtures (17 cases)"
```

### Task C.2: Python formula engine — schema + evaluator (TDD)

**Files:**
- Create: `backend/app/models/formula.py`
- Create: `backend/app/services/bom_engine.py`
- Create: `backend/tests/test_bom_engine.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Write the failing test**

Write `backend/tests/__init__.py`:
```python
```

Write `backend/tests/test_bom_engine.py`:
```python
import json
from pathlib import Path

import pytest

from app.services.bom_engine import evaluate

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[2] / "database/tests/formula-fixtures.json").read_text()
)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda c: c["name"])
def test_formula_fixture(case):
    result = evaluate(case["formula"], case["vars"])
    expected = case["expect"]
    if isinstance(expected, float):
        assert result == pytest.approx(expected, rel=1e-9)
    else:
        assert result == expected
```

- [ ] **Step 2: Run — verify it fails**

```bash
cd backend && uv run pytest tests/test_bom_engine.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.services.bom_engine'`.

- [ ] **Step 3: Write the schema**

Create `backend/app/models/__init__.py` (empty) and `backend/app/models/formula.py`:

```python
from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

Scalar = int | float | bool | str

Expr = Annotated[
    Union[
        "VarExpr", "BinaryExpr", "UnaryExpr", "IfExpr", "Scalar"
    ],
    Field(discriminator=None),
]


class VarExpr(BaseModel):
    op: Literal["var"]
    of: str


class BinaryExpr(BaseModel):
    op: Literal["add", "sub", "mul", "div", "eq", "gt", "gte", "lt", "lte"]
    of: list["Expr"]
    waste: float | None = None


class UnaryExpr(BaseModel):
    op: Literal["ceil", "floor", "round"]
    of: "Expr"
    waste: float | None = None


class IfExpr(BaseModel):
    op: Literal["if"]
    cond: "Expr"
    then: "Expr"
    else_: "Expr" = Field(alias="else")
    waste: float | None = None

    model_config = {"populate_by_name": True}


VarExpr.model_rebuild()
BinaryExpr.model_rebuild()
UnaryExpr.model_rebuild()
IfExpr.model_rebuild()
```

- [ ] **Step 4: Write minimal evaluator**

Create `backend/app/services/__init__.py` (empty) and `backend/app/services/bom_engine.py`:

```python
from __future__ import annotations

import math
from typing import Any

Number = int | float


def _apply_waste(value: Number, waste: float | None) -> Number:
    if waste is None:
        return value
    return value * (1 + waste)


def evaluate(expr: Any, vars: dict[str, Any]) -> Any:
    if isinstance(expr, bool):
        return expr
    if isinstance(expr, (int, float)):
        return expr
    if isinstance(expr, str):
        return expr
    if not isinstance(expr, dict):
        raise ValueError(f"Invalid expression: {expr!r}")

    op = expr.get("op")
    waste = expr.get("waste")

    if op == "var":
        name = expr["of"]
        if name not in vars:
            raise KeyError(f"Unknown variable: {name}")
        return vars[name]

    if op in ("add", "sub", "mul", "div"):
        operands = [evaluate(x, vars) for x in expr["of"]]
        if op == "add":
            result: Number = sum(operands)
        elif op == "sub":
            result = operands[0]
            for x in operands[1:]:
                result -= x
        elif op == "mul":
            result = 1
            for x in operands:
                result *= x
        else:
            result = operands[0]
            for x in operands[1:]:
                result /= x
        return _apply_waste(result, waste)

    if op in ("eq", "gt", "gte", "lt", "lte"):
        a, b = [evaluate(x, vars) for x in expr["of"][:2]]
        return {
            "eq": a == b,
            "gt": a > b,
            "gte": a >= b,
            "lt": a < b,
            "lte": a <= b,
        }[op]

    if op == "ceil":
        return _apply_waste(math.ceil(evaluate(expr["of"], vars)), waste)
    if op == "floor":
        return _apply_waste(math.floor(evaluate(expr["of"], vars)), waste)
    if op == "round":
        val = evaluate(expr["of"], vars)
        # "half-up" semantics to match TS behavior
        return _apply_waste(math.floor(val + 0.5) if val >= 0 else -math.floor(-val + 0.5), waste)

    if op == "if":
        cond = evaluate(expr["cond"], vars)
        branch = expr["then"] if cond else expr.get("else", expr.get("else_"))
        return _apply_waste(evaluate(branch, vars), waste)

    raise ValueError(f"Unknown op: {op!r}")
```

- [ ] **Step 5: Run — verify it passes**

```bash
uv run pytest tests/test_bom_engine.py -v
```
Expected: all 17 cases PASS.

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/models/ backend/app/services/ backend/tests/
git commit -m "feat(backend): formula engine with Pydantic schema and shared fixtures"
```

### Task C.3: TypeScript formula engine — parser + evaluator

**Files:**
- Create: `frontend/src/lib/formula.ts`
- Create: `frontend/src/lib/formula.test.ts`
- Modify: `frontend/vitest.config.ts` (new)
- Modify: `frontend/package.json` (add test script + vitest)

- [ ] **Step 1: Add Vitest**

```bash
cd frontend
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Write `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 3: Update `frontend/package.json` scripts**

Ensure `scripts` contains `"test": "vitest"`.

- [ ] **Step 4: Write the failing test**

Write `frontend/src/lib/formula.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { evaluate } from './formula';

const fixtures = JSON.parse(
  readFileSync(
    join(__dirname, '../../../database/tests/formula-fixtures.json'),
    'utf-8'
  )
);

describe('formula engine (TS)', () => {
  for (const c of fixtures.cases) {
    test(c.name, () => {
      const actual = evaluate(c.formula, c.vars);
      if (typeof c.expect === 'number' && !Number.isInteger(c.expect)) {
        expect(actual).toBeCloseTo(c.expect as number, 9);
      } else {
        expect(actual).toStrictEqual(c.expect);
      }
    });
  }
});
```

- [ ] **Step 5: Run — verify it fails**

```bash
npm test -- --run
```
Expected: fail with `Cannot find module './formula'`.

- [ ] **Step 6: Write the evaluator**

Create `frontend/src/lib/formula.ts`:
```ts
export type Scalar = number | boolean | string;

export type Expr =
  | Scalar
  | { op: 'var'; of: string }
  | { op: 'add' | 'sub' | 'mul' | 'div' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte'; of: Expr[]; waste?: number }
  | { op: 'ceil' | 'floor' | 'round'; of: Expr; waste?: number }
  | { op: 'if'; cond: Expr; then: Expr; else: Expr; waste?: number };

function applyWaste(value: number, waste?: number): number {
  return waste == null ? value : value * (1 + waste);
}

export function evaluate(expr: Expr, vars: Record<string, any>): any {
  if (typeof expr === 'number' || typeof expr === 'boolean' || typeof expr === 'string') {
    return expr;
  }
  const e = expr as any;
  const op = e.op;
  const waste = e.waste as number | undefined;

  if (op === 'var') {
    if (!(e.of in vars)) throw new Error(`Unknown variable: ${e.of}`);
    return vars[e.of];
  }

  if (['add', 'sub', 'mul', 'div'].includes(op)) {
    const operands = (e.of as Expr[]).map(x => evaluate(x, vars) as number);
    let r: number;
    if (op === 'add') r = operands.reduce((a, b) => a + b, 0);
    else if (op === 'sub') r = operands.reduce((a, b, i) => i === 0 ? b : a - b, 0);
    else if (op === 'mul') r = operands.reduce((a, b) => a * b, 1);
    else r = operands.reduce((a, b, i) => i === 0 ? b : a / b, 0);
    return applyWaste(r, waste);
  }

  if (['eq', 'gt', 'gte', 'lt', 'lte'].includes(op)) {
    const [a, b] = (e.of as Expr[]).map(x => evaluate(x, vars));
    switch (op) {
      case 'eq': return a === b;
      case 'gt': return a > b;
      case 'gte': return a >= b;
      case 'lt': return a < b;
      case 'lte': return a <= b;
    }
  }

  if (op === 'ceil') return applyWaste(Math.ceil(evaluate(e.of, vars) as number), waste);
  if (op === 'floor') return applyWaste(Math.floor(evaluate(e.of, vars) as number), waste);
  if (op === 'round') {
    const v = evaluate(e.of, vars) as number;
    const rounded = v >= 0 ? Math.floor(v + 0.5) : -Math.floor(-v + 0.5);
    return applyWaste(rounded, waste);
  }

  if (op === 'if') {
    const c = evaluate(e.cond, vars);
    return applyWaste(evaluate(c ? e.then : e.else, vars), waste);
  }

  throw new Error(`Unknown op: ${op}`);
}
```

- [ ] **Step 7: Run — verify it passes**

```bash
npm test -- --run
```
Expected: all 17 cases PASS.

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/vitest.config.ts frontend/src/lib/ frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): TS formula engine sharing fixtures with Python"
```

### Task C.4: Variable-derivation helper

**Files:**
- Create: `backend/app/services/variables.py`
- Create: `backend/tests/test_variables.py`
- Create: `frontend/src/lib/variables.ts`
- Create: `frontend/src/lib/variables.test.ts`
- Create: `database/tests/variables-fixtures.json`

- [ ] **Step 1: Write `database/tests/variables-fixtures.json`**

```json
{
  "cases": [
    {
      "name": "single_3x6_pe270",
      "config": {"tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
                 "esquadrias_extras": {"portas": 0, "janelas": 2},
                 "tem_wc": true, "num_splits": 1},
      "expect": {
        "area_planta_m2": 18,
        "perimetro_externo_m": 18,
        "area_fechamento_ext_m2": 48.6,
        "area_cobertura_m2": 18,
        "comp_parede_interna_m": 0,
        "area_parede_interna_m2": 0,
        "num_portas_ext": 1,
        "num_janelas": 2,
        "tem_wc": true,
        "num_splits": 1
      }
    },
    {
      "name": "two_3x6_in_line_pe270",
      "config": {"tamanho_modulo": "3x6", "qtd_modulos": 2, "pe_direito_m": 2.7,
                 "esquadrias_extras": {"portas": 1, "janelas": 3},
                 "tem_wc": true, "num_splits": 2},
      "expect": {
        "area_planta_m2": 36,
        "perimetro_externo_m": 30,
        "area_fechamento_ext_m2": 81,
        "area_cobertura_m2": 36,
        "comp_parede_interna_m": 3,
        "area_parede_interna_m2": 16.2,
        "num_portas_ext": 2,
        "num_janelas": 3,
        "tem_wc": true,
        "num_splits": 2
      }
    },
    {
      "name": "single_3x9_pe300_no_wc",
      "config": {"tamanho_modulo": "3x9", "qtd_modulos": 1, "pe_direito_m": 3.0,
                 "esquadrias_extras": {"portas": 0, "janelas": 1},
                 "tem_wc": false, "num_splits": 0},
      "expect": {
        "area_planta_m2": 27,
        "perimetro_externo_m": 24,
        "area_fechamento_ext_m2": 72,
        "area_cobertura_m2": 27,
        "comp_parede_interna_m": 0,
        "area_parede_interna_m2": 0,
        "num_portas_ext": 1,
        "num_janelas": 1,
        "tem_wc": false,
        "num_splits": 0
      }
    }
  ]
}
```

- [ ] **Step 2: Write failing Python test**

`backend/tests/test_variables.py`:
```python
import json
from pathlib import Path

import pytest

from app.services.variables import derive

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[2] / "database/tests/variables-fixtures.json").read_text()
)


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda c: c["name"])
def test_derive(case):
    assert derive(case["config"]) == case["expect"]
```

- [ ] **Step 3: Run, verify fails**

```bash
cd backend && uv run pytest tests/test_variables.py -v
```
Expected: ModuleNotFoundError.

- [ ] **Step 4: Write `backend/app/services/variables.py`**

```python
from __future__ import annotations

_SIZES = {
    "3x3": (3, 3),
    "3x6": (3, 6),
    "3x9": (3, 9),
}


def derive(config: dict) -> dict:
    tamanho = config["tamanho_modulo"]
    larg, comp = _SIZES[tamanho]
    qtd = int(config["qtd_modulos"])
    pe = float(config["pe_direito_m"])

    # Modules placed in line, sharing the 3m wall between them.
    area_planta = larg * comp * qtd
    # Perímetro: 2×(comp×qtd) + 2×larg
    perimetro = 2 * (comp * qtd) + 2 * larg
    area_fechamento_ext = round(perimetro * pe, 6)
    area_cobertura = area_planta  # drenagem pelos pilares

    comp_parede_interna = (qtd - 1) * larg
    area_parede_interna = round(comp_parede_interna * pe * 2, 6)

    esq = config.get("esquadrias_extras", {"portas": 0, "janelas": 0})
    num_portas_ext = 1 + int(esq.get("portas", 0))
    num_janelas = int(esq.get("janelas", 0))

    return {
        "area_planta_m2": area_planta,
        "perimetro_externo_m": perimetro,
        "area_fechamento_ext_m2": area_fechamento_ext,
        "area_cobertura_m2": area_cobertura,
        "comp_parede_interna_m": comp_parede_interna,
        "area_parede_interna_m2": area_parede_interna,
        "num_portas_ext": num_portas_ext,
        "num_janelas": num_janelas,
        "tem_wc": bool(config.get("tem_wc", False)),
        "num_splits": int(config.get("num_splits", 0)),
    }
```

- [ ] **Step 5: Run, verify passes**

```bash
uv run pytest tests/test_variables.py -v
```
Expected: 3 cases pass.

- [ ] **Step 6: Write `frontend/src/lib/variables.ts`**

```ts
const SIZES: Record<string, [number, number]> = {
  '3x3': [3, 3],
  '3x6': [3, 6],
  '3x9': [3, 9],
};

export interface Configuracao {
  tamanho_modulo: '3x3' | '3x6' | '3x9';
  qtd_modulos: number;
  pe_direito_m: number;
  cor_externa?: string;
  pacote_acabamento?: 'padrao' | 'premium';
  esquadrias_extras?: { portas: number; janelas: number };
  piso?: 'vinilico' | 'ceramico' | 'porcelanato';
  tem_wc?: boolean;
  num_splits?: number;
}

export function derive(config: Configuracao): Record<string, number | boolean> {
  const [larg, comp] = SIZES[config.tamanho_modulo];
  const qtd = config.qtd_modulos;
  const pe = config.pe_direito_m;
  const area_planta = larg * comp * qtd;
  const perimetro = 2 * (comp * qtd) + 2 * larg;
  const area_fechamento_ext = +(perimetro * pe).toFixed(6);
  const area_cobertura = area_planta;
  const comp_parede_interna = (qtd - 1) * larg;
  const area_parede_interna = +(comp_parede_interna * pe * 2).toFixed(6);
  const esq = config.esquadrias_extras ?? { portas: 0, janelas: 0 };

  return {
    area_planta_m2: area_planta,
    perimetro_externo_m: perimetro,
    area_fechamento_ext_m2: area_fechamento_ext,
    area_cobertura_m2: area_cobertura,
    comp_parede_interna_m: comp_parede_interna,
    area_parede_interna_m2: area_parede_interna,
    num_portas_ext: 1 + (esq.portas ?? 0),
    num_janelas: esq.janelas ?? 0,
    tem_wc: !!config.tem_wc,
    num_splits: config.num_splits ?? 0,
  };
}
```

- [ ] **Step 7: Write `frontend/src/lib/variables.test.ts`**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { derive } from './variables';

const fixtures = JSON.parse(
  readFileSync(join(__dirname, '../../../database/tests/variables-fixtures.json'), 'utf-8')
);

describe('derive (TS)', () => {
  for (const c of fixtures.cases) {
    test(c.name, () => {
      expect(derive(c.config)).toStrictEqual(c.expect);
    });
  }
});
```

- [ ] **Step 8: Run both**

```bash
cd ../frontend && npm test -- --run
cd ../backend && uv run pytest -v
```
Expected: all green.

- [ ] **Step 9: Commit**

```bash
cd ..
git add database/tests/variables-fixtures.json backend/app/services/variables.py backend/tests/test_variables.py frontend/src/lib/variables.ts frontend/src/lib/variables.test.ts
git commit -m "feat: shared variable-derivation for configuration → vars (Py+TS)"
```

---

## Phase D — Quote Calculator + Public API

### Task D.1: Supabase client + repository layer

**Files:**
- Create: `backend/app/lib/__init__.py`
- Create: `backend/app/lib/supabase.py`
- Create: `backend/app/lib/repository.py`

- [ ] **Step 1: Write `backend/app/lib/__init__.py`**

```python
```

- [ ] **Step 2: Write `backend/app/lib/supabase.py`**

```python
from supabase import Client, create_client

from app.config import settings


def get_admin_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
```

- [ ] **Step 3: Write `backend/app/lib/repository.py`**

```python
from __future__ import annotations

from typing import Any

from app.lib.supabase import get_admin_client


def list_produtos_ativos() -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = sb.table("produto").select("*").eq("ativo", True).order("nome").execute()
    return res.data or []


def get_produto_by_slug(slug: str) -> dict[str, Any] | None:
    sb = get_admin_client()
    res = sb.table("produto").select("*").eq("slug", slug).eq("ativo", True).limit(1).execute()
    return (res.data or [None])[0]


def list_opcoes(produto_id: str) -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = sb.table("produto_opcao").select("*").eq("produto_id", produto_id).order("ordem").execute()
    return res.data or []


def list_bom_regras(produto_id: str) -> list[dict[str, Any]]:
    sb = get_admin_client()
    res = (
        sb.table("produto_bom_regra")
        .select("*, material(*)")
        .eq("produto_id", produto_id)
        .order("ordem")
        .execute()
    )
    return res.data or []


def insert_orcamento(payload: dict[str, Any]) -> dict[str, Any]:
    sb = get_admin_client()
    # Generate numero: ORC-<year>-<seq>
    year = payload.pop("_year")
    seq_res = sb.rpc("nextval", {"seqname": "orcamento_numero_seq"}).execute()
    seq = seq_res.data if isinstance(seq_res.data, int) else int(seq_res.data)
    payload["numero"] = f"ORC-{year}-{seq:04d}"
    res = sb.table("orcamento").insert(payload).execute()
    return res.data[0]


def insert_orcamento_itens(orcamento_id: str, itens: list[dict[str, Any]]) -> None:
    if not itens:
        return
    sb = get_admin_client()
    rows = [{**it, "orcamento_id": orcamento_id} for it in itens]
    sb.table("orcamento_item").insert(rows).execute()
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/lib/
git commit -m "feat(backend): supabase admin client + repository helpers"
```

### Task D.2: Quote calculator service (TDD)

**Files:**
- Create: `backend/app/services/quote_calculator.py`
- Create: `backend/tests/test_quote_calculator.py`

- [ ] **Step 1: Write failing test**

`backend/tests/test_quote_calculator.py`:
```python
import pytest

from app.services.quote_calculator import calculate


def _material(mid: str, nome: str, sku: str, unidade: str, preco: float) -> dict:
    return {"id": mid, "nome": nome, "sku": sku, "unidade": unidade, "preco_unitario": preco}


def test_calculate_basic_farmacia_3x6_core():
    bom = [
        {
            "material_id": "m1",
            "material": _material("m1", "Perfil LSF", "MT-LSF-001", "kg", 14.0),
            "formula_json": {"op": "mul", "of": [{"op": "var", "of": "area_planta_m2"}, 30]},
            "tier": "core",
            "categoria": "estrutura",
            "ordem": 1,
        },
        {
            "material_id": "m2",
            "material": _material("m2", "Split 12k", "MT-INS-003", "und", 2200.0),
            "formula_json": {
                "op": "if",
                "cond": {"op": "gt", "of": [{"op": "var", "of": "num_splits"}, 0]},
                "then": {"op": "var", "of": "num_splits"},
                "else": 0,
            },
            "tier": "addon",
            "categoria": "equipamento",
            "ordem": 2,
        },
    ]
    config = {
        "tamanho_modulo": "3x6", "qtd_modulos": 1, "pe_direito_m": 2.7,
        "esquadrias_extras": {"portas": 0, "janelas": 0},
        "tem_wc": False, "num_splits": 2,
    }

    result_core = calculate(bom, config, tier="core", gerenciamento_pct=8.0)
    assert len(result_core["itens"]) == 1
    assert result_core["itens"][0]["quantidade"] == 540
    assert result_core["itens"][0]["subtotal"] == pytest.approx(7560.0)
    assert result_core["subtotal"] == pytest.approx(7560.0)
    assert result_core["total"] == pytest.approx(7560.0 * 1.08)

    result_full = calculate(bom, config, tier="full", gerenciamento_pct=8.0)
    assert len(result_full["itens"]) == 2
    addon = [i for i in result_full["itens"] if i["tier"] == "addon"][0]
    assert addon["quantidade"] == 2
    assert addon["subtotal"] == pytest.approx(4400.0)
    assert result_full["subtotal"] == pytest.approx(7560.0 + 4400.0)


def test_calculate_skips_zero_quantities():
    bom = [
        {
            "material_id": "m1",
            "material": _material("m1", "Split", "X", "und", 100.0),
            "formula_json": {"op": "if",
                             "cond": {"op": "gt", "of": [{"op": "var", "of": "num_splits"}, 0]},
                             "then": {"op": "var", "of": "num_splits"}, "else": 0},
            "tier": "addon", "categoria": "equipamento", "ordem": 1,
        }
    ]
    config = {"tamanho_modulo": "3x3", "qtd_modulos": 1, "pe_direito_m": 2.4,
              "esquadrias_extras": {"portas": 0, "janelas": 0},
              "tem_wc": False, "num_splits": 0}
    out = calculate(bom, config, tier="full", gerenciamento_pct=8.0)
    assert out["itens"] == []
    assert out["subtotal"] == 0
```

- [ ] **Step 2: Run, verify fails**

```bash
cd backend && uv run pytest tests/test_quote_calculator.py -v
```

- [ ] **Step 3: Write `backend/app/services/quote_calculator.py`**

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
) -> dict[str, Any]:
    vars = derive(config)
    itens: list[dict[str, Any]] = []
    subtotal = 0.0

    for regra in bom:
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

        itens.append({
            "material_id": regra["material_id"],
            "descricao": material["nome"],
            "unidade": material["unidade"],
            "quantidade": round(qty, 3),
            "preco_unitario": preco,
            "subtotal": sub,
            "tier": regra["tier"],
            "categoria": regra["categoria"],
            "ordem": regra["ordem"],
        })

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

- [ ] **Step 4: Run, verify passes**

```bash
uv run pytest tests/test_quote_calculator.py -v
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/app/services/quote_calculator.py backend/tests/test_quote_calculator.py
git commit -m "feat(backend): quote calculator (tier filter, zero-qty skip, gerenciamento)"
```

### Task D.3: Public API endpoints — catalog + calculate

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/public_quote.py`
- Create: `backend/app/models/quote.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_public_endpoints.py`

- [ ] **Step 1: Write `backend/app/routers/__init__.py`**

```python
```

- [ ] **Step 2: Write `backend/app/models/quote.py`**

```python
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class EsquadriasExtras(BaseModel):
    portas: int = Field(ge=0, le=4)
    janelas: int = Field(ge=0, le=6)


class Configuracao(BaseModel):
    tamanho_modulo: Literal["3x3", "3x6", "3x9"]
    qtd_modulos: int = Field(ge=1, le=3)
    pe_direito_m: float = Field(ge=2.4, le=3.5)
    cor_externa: str | None = None
    pacote_acabamento: Literal["padrao", "premium"] = "padrao"
    esquadrias_extras: EsquadriasExtras = EsquadriasExtras(portas=0, janelas=0)
    piso: Literal["vinilico", "ceramico", "porcelanato"] | None = "vinilico"
    tem_wc: bool = False
    num_splits: int = Field(ge=0, le=6, default=0)


class CalculateRequest(BaseModel):
    produto_id: str
    configuracao: Configuracao


class SubmitRequest(BaseModel):
    produto_id: str
    configuracao: Configuracao
    cliente_nome: str = Field(min_length=2, max_length=200)
    cliente_email: EmailStr
    cliente_telefone: str | None = Field(default=None, max_length=40)
    finalidade: Literal["casa","farmacia","loja","conveniencia","escritorio","quiosque","outro"]


class QuoteItem(BaseModel):
    material_id: str
    descricao: str
    unidade: str
    quantidade: float
    preco_unitario: float
    subtotal: float
    tier: Literal["core", "addon"]
    categoria: str
    ordem: int


class QuoteResponse(BaseModel):
    itens: list[QuoteItem]
    variaveis: dict[str, Any]
    subtotal: float
    gerenciamento_pct: float
    total: float
```

- [ ] **Step 3: Write `backend/app/routers/public_quote.py` (skeleton, no submit yet)**

```python
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.lib import repository
from app.models.quote import CalculateRequest, QuoteResponse
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/produtos")
def list_produtos():
    return repository.list_produtos_ativos()


@router.get("/produto/{slug}")
def get_produto(slug: str):
    produto = repository.get_produto_by_slug(slug)
    if not produto:
        raise HTTPException(404, "Produto não encontrado")
    produto["opcoes"] = repository.list_opcoes(produto["id"])
    return produto


@router.post("/quote/calculate", response_model=QuoteResponse)
def public_calculate(req: CalculateRequest):
    bom = repository.list_bom_regras(req.produto_id)
    if not bom:
        raise HTTPException(404, "Produto sem BOM cadastrada")
    return calculate(bom, req.configuracao.model_dump(), tier="core", gerenciamento_pct=8.0)
```

- [ ] **Step 4: Mount router in `backend/app/main.py`**

Replace `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import public_quote

app = FastAPI(title="ERP Metalfort API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_quote.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 5: Smoke test via curl**

```bash
make supabase-start
cd backend && uv run uvicorn app.main:app --reload --port 8000 &
sleep 2
curl -s http://localhost:8000/api/public/produtos | python -m json.tool
curl -s http://localhost:8000/api/public/produto/farmacia-express-3x6 | python -m json.tool
curl -s -X POST http://localhost:8000/api/public/quote/calculate \
  -H 'Content-Type: application/json' \
  -d '{"produto_id":"<uuid_from_above>","configuracao":{"tamanho_modulo":"3x6","qtd_modulos":1,"pe_direito_m":2.7,"esquadrias_extras":{"portas":0,"janelas":2},"tem_wc":true,"num_splits":0}}' \
  | python -m json.tool
kill %1
```
Expected: products list, product detail with options, and a non-empty item list in calculate.

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/routers/ backend/app/models/quote.py backend/app/main.py
git commit -m "feat(backend): public endpoints — list produtos, get produto, calculate"
```

### Task D.4: Rate limiting on public endpoints

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/public_quote.py`

- [ ] **Step 1: Wire slowapi in `backend/app/main.py`**

Add to the imports:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
```

After `settings` line, add:
```python
limiter = Limiter(key_func=get_remote_address)
```

After app creation, before `include_router`:
```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

- [ ] **Step 2: Apply decorator in `backend/app/routers/public_quote.py`**

Add import:
```python
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

Update the two POST-ish endpoints:
```python
@router.post("/quote/calculate", response_model=QuoteResponse)
@limiter.limit("10/minute")
def public_calculate(request: Request, req: CalculateRequest):
    ...
```
(also add `request: Request` as first positional on any future submit endpoint with `@limiter.limit("5/minute")`).

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py backend/app/routers/public_quote.py
git commit -m "feat(backend): rate limit public quote endpoints (10/min)"
```

---

## Phase E — Public Frontend (landing, produto, configurator, obrigado)

### Task E.1: Supabase client + API client + router

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `frontend/src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Step 2: Write `frontend/src/lib/api.ts`**

```ts
const BASE = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Write `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing';
import ProdutoDetail from './pages/public/ProdutoDetail';
import ConfigurarOrcamento from './pages/public/ConfigurarOrcamento';
import Obrigado from './pages/public/Obrigado';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/produto/:slug" element={<ProdutoDetail />} />
        <Route path="/orcamento/:slug" element={<ConfigurarOrcamento />} />
        <Route path="/obrigado" element={<Obrigado />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/src/lib frontend/src/App.tsx
git commit -m "feat(frontend): router + supabase and api clients"
```

### Task E.2: Landing page

**Files:**
- Create: `frontend/src/pages/public/Landing.tsx`
- Create: `frontend/src/components/ProductCard/ProductCard.tsx`

- [ ] **Step 1: Write `frontend/src/components/ProductCard/ProductCard.tsx`**

```tsx
import { Link } from 'react-router-dom';

export interface ProductCardProps {
  slug: string;
  nome: string;
  tipo_base: string;
  finalidade: string;
  descricao?: string | null;
  imagem_url?: string | null;
}

export default function ProductCard(p: ProductCardProps) {
  return (
    <Link
      to={`/produto/${p.slug}`}
      className="block rounded-lg border border-mf-border bg-mf-black-soft p-6 text-white hover:border-mf-yellow transition"
    >
      <div className="text-xs uppercase tracking-wider text-mf-yellow mb-2">
        {p.finalidade} · {p.tipo_base}
      </div>
      <h3 className="text-xl font-bold">{p.nome}</h3>
      {p.descricao && <p className="mt-2 text-sm text-mf-text-secondary">{p.descricao}</p>}
      <div className="mt-4 text-mf-yellow text-sm font-semibold">Configurar orçamento →</div>
    </Link>
  );
}
```

- [ ] **Step 2: Write `frontend/src/pages/public/Landing.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import ProductCard, { ProductCardProps } from '../../components/ProductCard/ProductCard';

export default function Landing() {
  const [produtos, setProdutos] = useState<ProductCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any[]>('/api/public/produtos')
      .then(setProdutos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-mf-black text-white">
      <header className="px-8 py-6 border-b border-mf-border flex justify-between items-center">
        <div className="text-2xl font-extrabold">
          <span className="text-mf-yellow">metalfort</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-16">
        <h1 className="text-5xl font-extrabold leading-tight">
          Construção modular em <span className="text-mf-yellow">steelframe</span>.<br />
          Orçamento direto do site.
        </h1>
        <p className="mt-4 text-mf-text-secondary max-w-2xl">
          Escolha um módulo padronizado, ajuste tamanho e acabamento, e receba seu orçamento em PDF na hora.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {loading ? (
            <div className="text-mf-text-secondary">Carregando produtos...</div>
          ) : (
            produtos.map(p => <ProductCard key={p.slug} {...p} />)
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

Visit http://localhost:5173 — expect hero + 2 product cards.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/public/Landing.tsx frontend/src/components/ProductCard
git commit -m "feat(frontend): landing page with product list"
```

### Task E.3: Produto detail page + Obrigado page

**Files:**
- Create: `frontend/src/pages/public/ProdutoDetail.tsx`
- Create: `frontend/src/pages/public/Obrigado.tsx`

- [ ] **Step 1: Write `frontend/src/pages/public/ProdutoDetail.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

interface Produto {
  id: string;
  slug: string;
  nome: string;
  tipo_base: string;
  finalidade: string;
  pe_direito_sugerido_m: number;
  descricao?: string | null;
}

export default function ProdutoDetail() {
  const { slug = '' } = useParams();
  const [produto, setProduto] = useState<Produto | null>(null);

  useEffect(() => {
    apiFetch<Produto>(`/api/public/produto/${slug}`).then(setProduto);
  }, [slug]);

  if (!produto) return <div className="min-h-screen bg-mf-black text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-mf-black text-white">
      <main className="max-w-3xl mx-auto px-8 py-16">
        <div className="text-xs uppercase text-mf-yellow tracking-wider mb-2">
          {produto.finalidade} · módulo {produto.tipo_base}
        </div>
        <h1 className="text-4xl font-extrabold">{produto.nome}</h1>
        <p className="mt-4 text-mf-text-secondary">{produto.descricao}</p>
        <div className="mt-8 flex gap-3">
          <Link
            to={`/orcamento/${produto.slug}`}
            className="px-6 py-3 bg-mf-yellow text-mf-black font-bold rounded hover:bg-mf-yellow-hover transition"
          >
            Configurar orçamento
          </Link>
          <Link to="/" className="px-6 py-3 border border-mf-border rounded hover:border-mf-yellow">
            Voltar
          </Link>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/pages/public/Obrigado.tsx`**

```tsx
import { Link, useSearchParams } from 'react-router-dom';

export default function Obrigado() {
  const [sp] = useSearchParams();
  const pdfUrl = sp.get('pdf');
  const numero = sp.get('numero');

  return (
    <div className="min-h-screen bg-mf-black text-white flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <div className="text-6xl">✓</div>
        <h1 className="mt-4 text-3xl font-extrabold">Orçamento enviado!</h1>
        {numero && <div className="mt-2 text-mf-text-secondary">Nº {numero}</div>}
        <p className="mt-4 text-mf-text-secondary">
          Enviamos uma cópia no seu email. Nossa equipe vai entrar em contato em breve.
        </p>
        {pdfUrl && (
          <a
            href={pdfUrl}
            className="mt-8 inline-block px-6 py-3 bg-mf-yellow text-mf-black font-bold rounded hover:bg-mf-yellow-hover"
            target="_blank" rel="noreferrer"
          >
            Baixar PDF
          </a>
        )}
        <div className="mt-6">
          <Link to="/" className="text-mf-yellow hover:underline">← Voltar para a vitrine</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/public/ProdutoDetail.tsx frontend/src/pages/public/Obrigado.tsx
git commit -m "feat(frontend): produto detail and obrigado pages"
```

### Task E.4: Configurator — 9 alavancas

**Files:**
- Create: `frontend/src/components/Configurator/Configurator.tsx`
- Create: `frontend/src/components/Configurator/PriceBox.tsx`
- Create: `frontend/src/components/Configurator/LeverGroup.tsx`
- Create: `frontend/src/pages/public/ConfigurarOrcamento.tsx`

- [ ] **Step 1: Write `frontend/src/components/Configurator/LeverGroup.tsx`**

```tsx
import { ReactNode } from 'react';

export default function LeverGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-mf-border py-4">
      <div className="text-xs uppercase tracking-wider text-mf-yellow mb-2">{label}</div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/components/Configurator/PriceBox.tsx`**

```tsx
export default function PriceBox({
  subtotal, total, gerenciamentoPct, itemCount, loading,
}: {
  subtotal: number; total: number; gerenciamentoPct: number; itemCount: number; loading: boolean;
}) {
  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div className="bg-mf-black-soft border border-mf-border rounded-lg p-6">
      <div className="text-xs uppercase text-mf-yellow">Orçamento preliminar</div>
      {loading ? (
        <div className="mt-2 text-mf-text-secondary">Calculando...</div>
      ) : (
        <>
          <div className="mt-2 flex justify-between text-mf-text-secondary text-sm">
            <span>{itemCount} itens</span>
            <span>Gerenciamento {gerenciamentoPct}%</span>
          </div>
          <div className="mt-4 text-2xl font-extrabold text-mf-yellow">{fmt(total)}</div>
          <div className="text-xs text-mf-text-secondary">Subtotal {fmt(subtotal)}</div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `frontend/src/components/Configurator/Configurator.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Configuracao } from '../../lib/variables';
import LeverGroup from './LeverGroup';
import PriceBox from './PriceBox';
import { apiFetch } from '../../lib/api';

interface Opcao {
  tipo: string;
  label: string;
  valores_possiveis_json: any;
  default_json: any;
  ordem: number;
}

interface ProdutoWithOpcoes {
  id: string;
  slug: string;
  nome: string;
  tipo_base: '3x3' | '3x6' | '3x9';
  pe_direito_sugerido_m: number;
  opcoes: Opcao[];
}

function opcaoByTipo(opcoes: Opcao[], tipo: string) {
  return opcoes.find(o => o.tipo === tipo);
}

function defaultConfig(produto: ProdutoWithOpcoes): Configuracao {
  const o = produto.opcoes;
  return {
    tamanho_modulo: (opcaoByTipo(o, 'tamanho_modulo')?.default_json ?? produto.tipo_base) as any,
    qtd_modulos: opcaoByTipo(o, 'qtd_modulos')?.default_json ?? 1,
    pe_direito_m: opcaoByTipo(o, 'pe_direito')?.default_json ?? produto.pe_direito_sugerido_m,
    cor_externa: opcaoByTipo(o, 'cor')?.default_json ?? 'cinza',
    pacote_acabamento: (opcaoByTipo(o, 'pacote_acabamento')?.default_json ?? 'padrao') as any,
    esquadrias_extras: opcaoByTipo(o, 'esquadria')?.default_json ?? { portas: 0, janelas: 0 },
    piso: (opcaoByTipo(o, 'piso')?.default_json ?? 'vinilico') as any,
    tem_wc: opcaoByTipo(o, 'wc')?.default_json ?? false,
    num_splits: opcaoByTipo(o, 'ac')?.default_json ?? 0,
  };
}

export default function Configurator({
  produto, onConfigChange, onQuoteChange,
}: {
  produto: ProdutoWithOpcoes;
  onConfigChange: (c: Configuracao) => void;
  onQuoteChange: (q: { subtotal: number; total: number; itemCount: number }) => void;
}) {
  const [config, setConfig] = useState<Configuracao>(() => defaultConfig(produto));
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ subtotal: number; total: number; gerenciamento_pct: number; itens: any[] }>({
    subtotal: 0, total: 0, gerenciamento_pct: 8, itens: [],
  });

  useEffect(() => {
    onConfigChange(config);
    let cancelled = false;
    setLoading(true);
    apiFetch<any>('/api/public/quote/calculate', {
      method: 'POST',
      body: JSON.stringify({ produto_id: produto.id, configuracao: config }),
    })
      .then(r => { if (!cancelled) { setQuote(r); onQuoteChange({ subtotal: r.subtotal, total: r.total, itemCount: r.itens.length }); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [JSON.stringify(config)]);

  const peSuggested = useMemo(() => {
    return { '3x3': 2.4, '3x6': 2.7, '3x9': 3.0 }[config.tamanho_modulo];
  }, [config.tamanho_modulo]);

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8">
      <div>
        <LeverGroup label="Tamanho do módulo">
          <div className="flex gap-2">
            {(['3x3','3x6','3x9'] as const).map(t => (
              <button key={t}
                onClick={() => setConfig({ ...config, tamanho_modulo: t, pe_direito_m: ({'3x3':2.4,'3x6':2.7,'3x9':3.0}[t]) })}
                className={`flex-1 py-3 rounded ${config.tamanho_modulo === t ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Quantidade de módulos">
          <input type="number" min={1} max={3} value={config.qtd_modulos}
            onChange={e => setConfig({ ...config, qtd_modulos: parseInt(e.target.value) || 1 })}
            className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"/>
        </LeverGroup>

        <LeverGroup label={`Pé direito (m) — sugerido: ${peSuggested}`}>
          <input type="number" min={2.4} max={3.5} step={0.1} value={config.pe_direito_m}
            onChange={e => setConfig({ ...config, pe_direito_m: parseFloat(e.target.value) || peSuggested })}
            className="w-24 bg-mf-black-soft text-white p-2 rounded border border-mf-border"/>
        </LeverGroup>

        <LeverGroup label="Cor externa">
          <div className="flex gap-2">
            {['branco','cinza','preto','grafite'].map(c => (
              <button key={c} onClick={() => setConfig({ ...config, cor_externa: c })}
                className={`px-4 py-2 rounded ${config.cor_externa === c ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {c}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Pacote de acabamento">
          <div className="flex gap-2">
            {(['padrao','premium'] as const).map(p => (
              <button key={p} onClick={() => setConfig({ ...config, pacote_acabamento: p })}
                className={`px-4 py-2 rounded ${config.pacote_acabamento === p ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="Esquadrias extras">
          <div className="flex gap-4">
            <label className="text-sm text-mf-text-secondary">
              Portas extras:
              <input type="number" min={0} max={2} value={config.esquadrias_extras?.portas ?? 0}
                onChange={e => setConfig({ ...config, esquadrias_extras: { portas: parseInt(e.target.value) || 0, janelas: config.esquadrias_extras?.janelas ?? 0 } })}
                className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
            </label>
            <label className="text-sm text-mf-text-secondary">
              Janelas:
              <input type="number" min={0} max={4} value={config.esquadrias_extras?.janelas ?? 0}
                onChange={e => setConfig({ ...config, esquadrias_extras: { portas: config.esquadrias_extras?.portas ?? 0, janelas: parseInt(e.target.value) || 0 } })}
                className="ml-2 w-16 bg-mf-black-soft text-white p-1 rounded border border-mf-border"/>
            </label>
          </div>
        </LeverGroup>

        <LeverGroup label="Piso">
          <div className="flex gap-2">
            {(['vinilico','ceramico','porcelanato'] as const).map(p => (
              <button key={p} onClick={() => setConfig({ ...config, piso: p })}
                className={`px-4 py-2 rounded ${config.piso === p ? 'bg-mf-yellow text-mf-black font-bold' : 'bg-mf-black-soft text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </LeverGroup>

        <LeverGroup label="WC interno">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!config.tem_wc}
              onChange={e => setConfig({ ...config, tem_wc: e.target.checked })}/>
            <span className="text-white">Incluir WC</span>
          </label>
        </LeverGroup>
      </div>

      <div className="space-y-4">
        <PriceBox
          subtotal={quote.subtotal}
          total={quote.total}
          gerenciamentoPct={quote.gerenciamento_pct}
          itemCount={quote.itens.length}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `frontend/src/pages/public/ConfigurarOrcamento.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Configurator from '../../components/Configurator/Configurator';
import { apiFetch } from '../../lib/api';
import { Configuracao } from '../../lib/variables';

export default function ConfigurarOrcamento() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState<any>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [lead, setLead] = useState({ nome: '', email: '', telefone: '', finalidade: 'farmacia' as const });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { apiFetch<any>(`/api/public/produto/${slug}`).then(setProduto); }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produto || !config) return;
    setSubmitting(true); setError(null);
    try {
      const r = await apiFetch<{ numero: string; pdf_url: string }>('/api/public/quote/submit', {
        method: 'POST',
        body: JSON.stringify({
          produto_id: produto.id,
          configuracao: config,
          cliente_nome: lead.nome,
          cliente_email: lead.email,
          cliente_telefone: lead.telefone,
          finalidade: lead.finalidade || produto.finalidade,
        }),
      });
      navigate(`/obrigado?numero=${encodeURIComponent(r.numero)}&pdf=${encodeURIComponent(r.pdf_url)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!produto) return <div className="min-h-screen bg-mf-black text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-mf-black text-white">
      <header className="px-8 py-6 border-b border-mf-border">
        <Link to="/" className="text-mf-yellow font-bold">metalfort</Link>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-extrabold">{produto.nome}</h1>
        <p className="text-mf-text-secondary mt-2">{produto.descricao}</p>

        <div className="mt-8">
          <Configurator produto={produto} onConfigChange={setConfig} onQuoteChange={() => {}} />
        </div>

        <form onSubmit={handleSubmit} className="mt-12 grid gap-4 max-w-xl">
          <h2 className="text-xl font-bold">Receba seu orçamento em PDF</h2>
          <input required placeholder="Seu nome" value={lead.nome}
            onChange={e => setLead({ ...lead, nome: e.target.value })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white"/>
          <input required type="email" placeholder="Email" value={lead.email}
            onChange={e => setLead({ ...lead, email: e.target.value })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white"/>
          <input placeholder="Telefone (opcional)" value={lead.telefone}
            onChange={e => setLead({ ...lead, telefone: e.target.value })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white"/>
          <select value={lead.finalidade}
            onChange={e => setLead({ ...lead, finalidade: e.target.value as any })}
            className="bg-mf-black-soft p-3 rounded border border-mf-border text-white">
            <option value="casa">Casa</option>
            <option value="farmacia">Farmácia</option>
            <option value="loja">Loja</option>
            <option value="conveniencia">Conveniência</option>
            <option value="escritorio">Escritório</option>
            <option value="quiosque">Quiosque</option>
            <option value="outro">Outro</option>
          </select>
          <button type="submit" disabled={submitting}
            className="bg-mf-yellow text-mf-black font-bold py-3 rounded hover:bg-mf-yellow-hover disabled:opacity-50">
            {submitting ? 'Enviando...' : 'Enviar orçamento'}
          </button>
          {error && <div className="text-mf-danger">{error}</div>}
        </form>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Configurator/ frontend/src/pages/public/ConfigurarOrcamento.tsx
git commit -m "feat(frontend): configurator with 9 alavancas and lead form"
```

---

## Phase F — PDF generation, Email, Submit end-to-end

### Task F.1: PDF generator service (WeasyPrint)

**Files:**
- Create: `backend/app/templates/quote_pdf.html`
- Create: `backend/app/services/pdf_generator.py`
- Create: `backend/tests/test_pdf_generator.py`

- [ ] **Step 1: Write `backend/app/templates/quote_pdf.html`**

```html
<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family: "Helvetica", "Arial", sans-serif; color: #0a0a0a; font-size: 10pt; }
  h1 { font-size: 20pt; margin: 0 0 4mm; }
  h1 .brand { color: #FACC15; }
  .meta { color: #555; font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 8mm; }
  th, td { border-bottom: 1px solid #ddd; padding: 3mm 2mm; text-align: left; }
  th { background: #0a0a0a; color: #fff; font-weight: 600; font-size: 9pt; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 6mm; font-size: 11pt; }
  .totals .row { display: flex; justify-content: space-between; padding: 1mm 0; }
  .totals .total { font-weight: 700; color: #0a0a0a; border-top: 2px solid #FACC15; padding-top: 2mm; }
  .footer { margin-top: 14mm; font-size: 8pt; color: #888; }
</style>
</head>
<body>
  <h1><span class="brand">metalfort</span> — Orçamento {{ orcamento.numero }}</h1>
  <div class="meta">
    Cliente: {{ orcamento.cliente_nome }} — {{ orcamento.cliente_email }}<br>
    Produto: {{ produto.nome }} — finalidade: {{ orcamento.finalidade }}<br>
    Configuração: {{ resumo_config }}
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Descrição</th><th>Un.</th><th class="num">Qtd.</th><th class="num">Preço unit.</th><th class="num">Subtotal</th></tr>
    </thead>
    <tbody>
      {% for it in itens %}
      <tr>
        <td>{{ loop.index }}</td>
        <td>{{ it.descricao }}</td>
        <td>{{ it.unidade }}</td>
        <td class="num">{{ "%.2f"|format(it.quantidade) }}</td>
        <td class="num">R$ {{ "%.2f"|format(it.preco_unitario) }}</td>
        <td class="num">R$ {{ "%.2f"|format(it.subtotal) }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>R$ {{ "%.2f"|format(orcamento.valor_subtotal) }}</span></div>
    <div class="row"><span>Gerenciamento ({{ orcamento.valor_gerenciamento_pct }}%)</span><span>R$ {{ "%.2f"|format(orcamento.valor_total - orcamento.valor_subtotal) }}</span></div>
    <div class="row total"><span>Total</span><span>R$ {{ "%.2f"|format(orcamento.valor_total) }}</span></div>
  </div>

  <div class="footer">Documento gerado em {{ agora }}. Válido por 30 dias. metalfort.tech</div>
</body>
</html>
```

- [ ] **Step 2: Write `backend/app/services/pdf_generator.py`**

```python
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_quote_pdf(
    orcamento: dict[str, Any],
    produto: dict[str, Any],
    itens: list[dict[str, Any]],
    resumo_config: str,
) -> bytes:
    template = _env.get_template("quote_pdf.html")
    html = template.render(
        orcamento=orcamento,
        produto=produto,
        itens=itens,
        resumo_config=resumo_config,
        agora=datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC"),
    )
    return HTML(string=html).write_pdf()
```

- [ ] **Step 3: Write `backend/tests/test_pdf_generator.py`**

```python
from app.services.pdf_generator import render_quote_pdf


def test_render_quote_pdf_returns_pdf_bytes():
    orcamento = {
        "numero": "ORC-2026-0001",
        "cliente_nome": "Teste Cliente",
        "cliente_email": "teste@example.com",
        "finalidade": "farmacia",
        "valor_subtotal": 100.0,
        "valor_total": 108.0,
        "valor_gerenciamento_pct": 8.0,
    }
    produto = {"nome": "Farmácia Express 3×6"}
    itens = [
        {"descricao": "Perfil LSF", "unidade": "kg", "quantidade": 540.0,
         "preco_unitario": 14.0, "subtotal": 7560.0}
    ]

    pdf = render_quote_pdf(orcamento, produto, itens, resumo_config="3x6 / 1 módulo / 2,70m")
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 1000
```

- [ ] **Step 4: Run — verify passes**

```bash
cd backend && uv run pytest tests/test_pdf_generator.py -v
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/app/templates/ backend/app/services/pdf_generator.py backend/tests/test_pdf_generator.py
git commit -m "feat(backend): PDF generator (WeasyPrint + Jinja2)"
```

### Task F.2: Email sender (Resend with dev fallback)

**Files:**
- Create: `backend/app/templates/email_cliente.html`
- Create: `backend/app/templates/email_metalfort.html`
- Create: `backend/app/services/email_sender.py`
- Create: `backend/tests/test_email_sender.py`

- [ ] **Step 1: Write `backend/app/templates/email_cliente.html`**

```html
<p>Olá {{ cliente_nome }},</p>
<p>Seu orçamento <strong>{{ numero }}</strong> da <strong>metalfort</strong> foi gerado com sucesso.</p>
<p><strong>Produto:</strong> {{ produto_nome }}<br>
<strong>Total:</strong> R$ {{ "%.2f"|format(valor_total) }}</p>
<p>O PDF está anexo a este email. Qualquer dúvida, responda esta mensagem.</p>
<p>— Equipe Metalfort</p>
```

- [ ] **Step 2: Write `backend/app/templates/email_metalfort.html`**

```html
<p>Novo lead recebido pelo site.</p>
<p><strong>{{ numero }}</strong> — {{ cliente_nome }} ({{ cliente_email }})<br>
Finalidade: {{ finalidade }}<br>
Total: R$ {{ "%.2f"|format(valor_total) }}</p>
<p><a href="{{ admin_url }}">Abrir no admin</a></p>
```

- [ ] **Step 3: Write `backend/app/services/email_sender.py`**

```python
from __future__ import annotations

import base64
from datetime import datetime
from pathlib import Path
from typing import Any

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
DEV_OUTBOX = Path("/tmp/sent")

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _render(tpl: str, **ctx: Any) -> str:
    return _env.get_template(tpl).render(**ctx)


def _dev_write(to: str, subject: str, body: str, attachments: list[dict] | None = None) -> None:
    DEV_OUTBOX.mkdir(parents=True, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
    path = DEV_OUTBOX / f"{stamp}-{to}.eml"
    body_preview = body[:800]
    path.write_text(
        f"To: {to}\nSubject: {subject}\nAttachments: {len(attachments or [])}\n\n{body_preview}",
        encoding="utf-8",
    )


def _send(to: str, subject: str, body: str, attachments: list[dict] | None = None) -> None:
    if not settings.resend_api_key:
        _dev_write(to, subject, body, attachments)
        return
    resend.api_key = settings.resend_api_key
    params: dict[str, Any] = {
        "from": "Metalfort <orcamento@metalfort.tech>",
        "to": [to], "subject": subject, "html": body,
    }
    if attachments:
        params["attachments"] = attachments
    resend.Emails.send(params)


def send_cliente_email(*, to: str, cliente_nome: str, numero: str, produto_nome: str,
                       valor_total: float, pdf_bytes: bytes) -> None:
    body = _render("email_cliente.html",
        cliente_nome=cliente_nome, numero=numero,
        produto_nome=produto_nome, valor_total=valor_total)
    att = [{
        "filename": f"{numero}.pdf",
        "content": base64.b64encode(pdf_bytes).decode("ascii"),
    }]
    _send(to, f"Seu orçamento Metalfort — {numero}", body, attachments=att)


def send_metalfort_notification(*, numero: str, cliente_nome: str, cliente_email: str,
                                 finalidade: str, valor_total: float, admin_url: str) -> None:
    body = _render("email_metalfort.html",
        numero=numero, cliente_nome=cliente_nome, cliente_email=cliente_email,
        finalidade=finalidade, valor_total=valor_total, admin_url=admin_url)
    _send(settings.metalfort_notification_email, f"Novo lead — {numero}", body)
```

- [ ] **Step 4: Write `backend/tests/test_email_sender.py`**

```python
import os

from app.services.email_sender import send_cliente_email, send_metalfort_notification


def test_dev_mode_writes_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.email_sender.DEV_OUTBOX", tmp_path)
    monkeypatch.setattr("app.config.settings.resend_api_key", "", raising=False)

    send_cliente_email(
        to="buyer@example.com", cliente_nome="João", numero="ORC-2026-0001",
        produto_nome="Farmácia 3×6", valor_total=10000.0, pdf_bytes=b"%PDF-1.4...",
    )
    files = list(tmp_path.iterdir())
    assert any("buyer@example.com" in f.name for f in files)


def test_dev_mode_notification(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.email_sender.DEV_OUTBOX", tmp_path)
    monkeypatch.setattr("app.config.settings.resend_api_key", "", raising=False)

    send_metalfort_notification(
        numero="ORC-2026-0001", cliente_nome="João", cliente_email="j@x.com",
        finalidade="farmacia", valor_total=10000.0, admin_url="http://localhost/admin",
    )
    assert len(list(tmp_path.iterdir())) == 1
```

- [ ] **Step 5: Run & commit**

```bash
cd backend && uv run pytest tests/test_email_sender.py -v
cd .. && git add backend/app/services/email_sender.py backend/app/templates/ backend/tests/test_email_sender.py
git commit -m "feat(backend): email sender with Resend + dev outbox"
```

### Task F.3: Storage upload helper

**Files:**
- Modify: `backend/app/lib/supabase.py`
- Create: `backend/app/services/storage.py`

- [ ] **Step 1: Append to `backend/app/lib/supabase.py`**

```python
ORCAMENTOS_BUCKET = "orcamentos"
```

- [ ] **Step 2: Write `backend/app/services/storage.py`**

```python
from __future__ import annotations

from app.lib.supabase import ORCAMENTOS_BUCKET, get_admin_client


def ensure_bucket() -> None:
    sb = get_admin_client()
    try:
        sb.storage.create_bucket(ORCAMENTOS_BUCKET, options={"public": False})
    except Exception:
        pass  # already exists


def upload_quote_pdf(numero: str, pdf_bytes: bytes) -> str:
    """Upload PDF and return a 30-day signed URL."""
    ensure_bucket()
    sb = get_admin_client()
    path = f"{numero}.pdf"
    sb.storage.from_(ORCAMENTOS_BUCKET).upload(
        path=path, file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    signed = sb.storage.from_(ORCAMENTOS_BUCKET).create_signed_url(path, expires_in=60 * 60 * 24 * 30)
    return signed["signedURL"]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/lib/supabase.py backend/app/services/storage.py
git commit -m "feat(backend): storage helper for orcamento PDFs"
```

### Task F.4: Submit endpoint end-to-end

**Files:**
- Modify: `backend/app/routers/public_quote.py`

- [ ] **Step 1: Extend `public_quote.py` with the submit endpoint**

Add imports:
```python
from datetime import datetime
from app.services import storage
from app.services.email_sender import send_cliente_email, send_metalfort_notification
from app.services.pdf_generator import render_quote_pdf
from app.models.quote import SubmitRequest
```

Add endpoint:
```python
@router.post("/quote/submit")
@limiter.limit("5/minute")
def public_submit(request: Request, req: SubmitRequest):
    produto = None
    # Find produto by id via repository (single query)
    from app.lib.supabase import get_admin_client
    sb = get_admin_client()
    p = sb.table("produto").select("*").eq("id", req.produto_id).limit(1).execute().data
    if not p:
        raise HTTPException(404, "Produto não encontrado")
    produto = p[0]

    bom = repository.list_bom_regras(req.produto_id)
    quote = calculate(bom, req.configuracao.model_dump(), tier="core", gerenciamento_pct=8.0)

    config = req.configuracao.model_dump()
    resumo_config = (
        f"{config['tamanho_modulo']} × {config['qtd_modulos']}, pé direito "
        f"{config['pe_direito_m']:.2f}m, piso {config['piso']}, WC: {'sim' if config['tem_wc'] else 'não'}"
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
            "material_id","descricao","unidade","quantidade","preco_unitario",
            "subtotal","tier","categoria","ordem"
        }} for it in quote["itens"]
    ])

    pdf_bytes = render_quote_pdf(orcamento, produto, quote["itens"], resumo_config)
    pdf_url = storage.upload_quote_pdf(orcamento["numero"], pdf_bytes)
    sb.table("orcamento").update({"pdf_url": pdf_url}).eq("id", orcamento["id"]).execute()

    send_cliente_email(
        to=req.cliente_email, cliente_nome=req.cliente_nome,
        numero=orcamento["numero"], produto_nome=produto["nome"],
        valor_total=quote["total"], pdf_bytes=pdf_bytes,
    )
    send_metalfort_notification(
        numero=orcamento["numero"], cliente_nome=req.cliente_nome,
        cliente_email=req.cliente_email, finalidade=req.finalidade,
        valor_total=quote["total"],
        admin_url=f"http://localhost:5173/admin/orcamento/{orcamento['id']}",
    )
    return {"numero": orcamento["numero"], "pdf_url": pdf_url}
```

- [ ] **Step 2: Manual end-to-end test**

```bash
make dev &
# Wait for all three services; then fill form on http://localhost:5173/orcamento/farmacia-express-3x6
# Submit, confirm redirect to /obrigado, confirm /tmp/sent/ has two files
ls /tmp/sent/
```
Expected: redirect to `/obrigado?numero=...&pdf=...`, two `.eml` files in `/tmp/sent/`, one row in `orcamento` and ~14 rows in `orcamento_item`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/public_quote.py
git commit -m "feat(backend): public quote submit end-to-end (DB + PDF + storage + email)"
```

---

## Phase G — Authentication & Internal APIs

### Task G.1: JWT validation middleware

**Files:**
- Create: `backend/app/lib/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write `backend/app/lib/auth.py`**

```python
from __future__ import annotations

from typing import Literal

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.config import settings
from app.lib.supabase import get_admin_client

Role = Literal["admin", "vendedor"]


def _decode(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.supabase_jwt_secret,
            algorithms=["HS256"], audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}")


def current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode(token)
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing sub")
    sb = get_admin_client()
    res = sb.table("usuario_interno").select("*").eq("id", uid).limit(1).execute()
    rows = res.data or []
    if not rows or not rows[0]["ativo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User not authorized")
    return rows[0]


def require_role(*allowed: Role):
    def _dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Role not allowed")
        return user
    return _dep
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/lib/auth.py
git commit -m "feat(backend): JWT validation + role-gated dependencies"
```

### Task G.2: Internal quote + product + material routers

**Files:**
- Create: `backend/app/routers/quote.py`
- Create: `backend/app/routers/produto.py`
- Create: `backend/app/routers/material.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write `backend/app/routers/quote.py`**

```python
from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

from app.lib import repository
from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.quote import CalculateRequest, SubmitRequest
from app.services.quote_calculator import calculate

router = APIRouter(prefix="/api/quote", tags=["quote"])


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
    bom = repository.list_bom_regras(req.produto_id)
    return calculate(bom, req.configuracao.model_dump(), tier=tier, gerenciamento_pct=8.0)


@router.post("")
def create_internal(
    req: SubmitRequest, user=Depends(require_role("admin", "vendedor"))
):
    bom = repository.list_bom_regras(req.produto_id)
    quote = calculate(bom, req.configuracao.model_dump(), tier="full", gerenciamento_pct=8.0)
    year = datetime.utcnow().year
    payload = {
        "_year": year,
        "cliente_nome": req.cliente_nome, "cliente_email": req.cliente_email,
        "cliente_telefone": req.cliente_telefone, "produto_id": req.produto_id,
        "finalidade": req.finalidade, "configuracao_json": req.configuracao.model_dump(),
        "tipo": "interno", "tier_aplicado": "full",
        "valor_subtotal": quote["subtotal"],
        "valor_gerenciamento_pct": quote["gerenciamento_pct"],
        "valor_total": quote["total"], "status": "rascunho",
        "criado_por": user["id"],
    }
    orc = repository.insert_orcamento(payload)
    repository.insert_orcamento_itens(orc["id"], [
        {k: v for k, v in it.items() if k in {
            "material_id","descricao","unidade","quantidade","preco_unitario",
            "subtotal","tier","categoria","ordem"
        }} for it in quote["itens"]
    ])
    return orc


@router.patch("/{orcamento_id}")
def patch_orcamento(
    orcamento_id: str, body: dict,
    user=Depends(require_role("admin", "vendedor"))
):
    allowed = {"status", "cliente_nome", "cliente_email", "cliente_telefone", "finalidade"}
    patch = {k: v for k, v in body.items() if k in allowed}
    if not patch:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()
    sb.table("orcamento").update(patch).eq("id", orcamento_id).execute()
    return sb.table("orcamento").select("*").eq("id", orcamento_id).limit(1).execute().data[0]
```

- [ ] **Step 2: Write `backend/app/routers/produto.py`**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/produto", tags=["produto"])


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("produto").select("*").order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    return sb.table("produto").insert(body).execute().data[0]


@router.patch("/{produto_id}")
def patch(produto_id: str, body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("produto").update(body).eq("id", produto_id).execute()
    return sb.table("produto").select("*").eq("id", produto_id).limit(1).execute().data[0]


@router.delete("/{produto_id}")
def deactivate(produto_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("produto").update({"ativo": False}).eq("id", produto_id).execute()
    return {"ok": True}
```

- [ ] **Step 3: Write `backend/app/routers/material.py`**

```python
from fastapi import APIRouter, Depends

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/material", tags=["material"])


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("material").select("*").order("categoria", desc=False).order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    return sb.table("material").insert(body).execute().data[0]


@router.patch("/{material_id}")
def patch(material_id: str, body: dict, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update(body).eq("id", material_id).execute()
    return sb.table("material").select("*").eq("id", material_id).limit(1).execute().data[0]


@router.delete("/{material_id}")
def deactivate(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update({"ativo": False}).eq("id", material_id).execute()
    return {"ok": True}
```

- [ ] **Step 4: Mount routers in `backend/app/main.py`**

Extend imports/include:
```python
from app.routers import public_quote, quote, produto, material

app.include_router(public_quote.router)
app.include_router(quote.router)
app.include_router(produto.router)
app.include_router(material.router)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/ backend/app/main.py
git commit -m "feat(backend): internal routers (quote, produto, material) with role gates"
```

---

## Phase H — Admin Frontend

### Task H.1: Auth context + protected routes

**Files:**
- Create: `frontend/src/lib/auth.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `frontend/src/lib/auth.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue>({ session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, loading, signOut: async () => { await supabase.auth.signOut(); } }}>
    {children}
  </Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }

export function useAuthedFetch() {
  const { session } = useAuth();
  return async function<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: session ? `Bearer ${session.access_token}` : '',
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  };
}
```

- [ ] **Step 2: Write `frontend/src/components/ProtectedRoute.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8">Carregando...</div>;
  if (!session) return <Navigate to="/admin/login" replace />;
  return children;
}
```

- [ ] **Step 3: Update `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing';
import ProdutoDetail from './pages/public/ProdutoDetail';
import ConfigurarOrcamento from './pages/public/ConfigurarOrcamento';
import Obrigado from './pages/public/Obrigado';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrcamentos from './pages/admin/AdminOrcamentos';
import AdminOrcamentoDetail from './pages/admin/AdminOrcamentoDetail';
import AdminProdutos from './pages/admin/AdminProdutos';
import AdminMateriais from './pages/admin/AdminMateriais';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/produto/:slug" element={<ProdutoDetail />} />
          <Route path="/orcamento/:slug" element={<ConfigurarOrcamento />} />
          <Route path="/obrigado" element={<Obrigado />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orcamentos" element={<AdminOrcamentos />} />
            <Route path="orcamento/:id" element={<AdminOrcamentoDetail />} />
            <Route path="produtos" element={<AdminProdutos />} />
            <Route path="materiais" element={<AdminMateriais />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/auth.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/App.tsx
git commit -m "feat(frontend): auth context + protected routes + admin route tree"
```

### Task H.2: Admin login + layout

**Files:**
- Create: `frontend/src/pages/admin/AdminLogin.tsx`
- Create: `frontend/src/pages/admin/AdminLayout.tsx`

- [ ] **Step 1: Write `frontend/src/pages/admin/AdminLogin.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    nav('/admin');
  }

  return (
    <div className="min-h-screen bg-mf-black text-white flex items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-extrabold"><span className="text-mf-yellow">metalfort</span> · Admin</h1>
        <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-mf-black-soft p-3 rounded border border-mf-border"/>
        <input required type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full bg-mf-black-soft p-3 rounded border border-mf-border"/>
        {err && <div className="text-mf-danger text-sm">{err}</div>}
        <button type="submit" disabled={loading}
          className="w-full bg-mf-yellow text-mf-black font-bold py-3 rounded hover:bg-mf-yellow-hover disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/pages/admin/AdminLayout.tsx`**

```tsx
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded text-sm ${isActive ? 'bg-mf-yellow text-mf-black font-bold' : 'hover:bg-mf-black-soft text-white'}`;

export default function AdminLayout() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-mf-bg-light">
      <header className="bg-mf-black text-white px-6 py-3 flex items-center justify-between">
        <Link to="/admin" className="text-lg font-extrabold"><span className="text-mf-yellow">metalfort</span> · ERP</Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/admin/orcamentos" className={linkClass}>Orçamentos</NavLink>
          <NavLink to="/admin/produtos" className={linkClass}>Produtos</NavLink>
          <NavLink to="/admin/materiais" className={linkClass}>Materiais</NavLink>
          <button onClick={signOut} className="ml-4 text-sm text-mf-text-secondary hover:text-white">Sair</button>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminLogin.tsx frontend/src/pages/admin/AdminLayout.tsx
git commit -m "feat(frontend): admin login + layout with top nav"
```

### Task H.3: Admin dashboard, orcamentos list & detail

**Files:**
- Create: `frontend/src/pages/admin/AdminDashboard.tsx`
- Create: `frontend/src/pages/admin/AdminOrcamentos.tsx`
- Create: `frontend/src/pages/admin/AdminOrcamentoDetail.tsx`

- [ ] **Step 1: Write `frontend/src/pages/admin/AdminDashboard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminDashboard() {
  const fetchApi = useAuthedFetch();
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => { fetchApi<any[]>('/api/quote').then(xs => setRecentes(xs.slice(0, 10))); }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">Últimos 10 orçamentos recebidos.</p>
      <div className="mt-6 bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr><th className="p-3">Número</th><th className="p-3">Cliente</th><th className="p-3">Tipo</th><th className="p-3">Total</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {recentes.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono">{o.numero}</td>
                <td className="p-3">{o.cliente_nome}</td>
                <td className="p-3">{o.tipo}</td>
                <td className="p-3 tabular-nums">R$ {Number(o.valor_total).toFixed(2)}</td>
                <td className="p-3"><Link to={`/admin/orcamento/${o.id}`} className="text-mf-yellow font-bold">Abrir →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/pages/admin/AdminOrcamentos.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminOrcamentos() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [tipo, setTipo] = useState<'todos' | 'publico' | 'interno'>('todos');
  const [status, setStatus] = useState<'todos' | 'rascunho' | 'enviado' | 'aprovado' | 'perdido'>('todos');

  useEffect(() => { fetchApi<any[]>('/api/quote').then(setRows); }, []);

  const filtered = useMemo(() => rows.filter(r =>
    (tipo === 'todos' || r.tipo === tipo) && (status === 'todos' || r.status === status)
  ), [rows, tipo, status]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orçamentos</h1>
      <div className="mt-4 flex gap-3 items-center">
        <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="border rounded p-2">
          <option value="todos">Todos os tipos</option>
          <option value="publico">Público</option>
          <option value="interno">Interno</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="border rounded p-2">
          <option value="todos">Todos status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviado">Enviado</option>
          <option value="aprovado">Aprovado</option>
          <option value="perdido">Perdido</option>
        </select>
        <Link to="/admin/orcamento/new" className="ml-auto bg-mf-black text-white px-4 py-2 rounded">+ Novo orçamento</Link>
      </div>
      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr><th className="p-3">Número</th><th className="p-3">Cliente</th><th className="p-3">Finalidade</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-mono">{o.numero}</td>
                <td className="p-3">{o.cliente_nome}</td>
                <td className="p-3">{o.finalidade}</td>
                <td className="p-3 tabular-nums">R$ {Number(o.valor_total).toFixed(2)}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3"><Link to={`/admin/orcamento/${o.id}`} className="text-mf-yellow font-bold">Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `frontend/src/pages/admin/AdminOrcamentoDetail.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminOrcamentoDetail() {
  const { id = '' } = useParams();
  const fetchApi = useAuthedFetch();
  const [orc, setOrc] = useState<any>(null);

  useEffect(() => {
    fetchApi<any[]>('/api/quote').then(xs => setOrc(xs.find(o => o.id === id)));
  }, [id]);

  async function setStatus(newStatus: string) {
    const updated = await fetchApi<any>(`/api/quote/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status: newStatus }),
    });
    setOrc(updated);
  }

  if (!orc) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{orc.numero}</h1>
      <div className="mt-2 text-sm text-gray-600">{orc.cliente_nome} · {orc.cliente_email}</div>
      <div className="mt-2 text-sm">Finalidade: <strong>{orc.finalidade}</strong> · Tipo: <strong>{orc.tipo}</strong> · Status: <strong>{orc.status}</strong></div>
      <div className="mt-4 text-3xl font-extrabold tabular-nums">R$ {Number(orc.valor_total).toFixed(2)}</div>

      <div className="mt-6 flex gap-2">
        {orc.pdf_url && <a href={orc.pdf_url} target="_blank" rel="noreferrer" className="bg-mf-black text-white px-4 py-2 rounded">Abrir PDF</a>}
        <button onClick={() => setStatus('aprovado')} className="bg-mf-success text-white px-4 py-2 rounded">Aprovar</button>
        <button onClick={() => setStatus('perdido')} className="bg-mf-danger text-white px-4 py-2 rounded">Perdido</button>
      </div>

      <details className="mt-8">
        <summary className="cursor-pointer">Configuração usada</summary>
        <pre className="bg-white border p-3 mt-2 text-xs overflow-x-auto">{JSON.stringify(orc.configuracao_json, null, 2)}</pre>
      </details>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/
git commit -m "feat(frontend): admin dashboard, quote list and detail"
```

### Task H.4: Admin Produtos + Materiais (read-only + inline edits)

**Files:**
- Create: `frontend/src/pages/admin/AdminProdutos.tsx`
- Create: `frontend/src/pages/admin/AdminMateriais.tsx`

- [ ] **Step 1: Write `frontend/src/pages/admin/AdminProdutos.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminProdutos() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { fetchApi<any[]>('/api/produto').then(setRows); }, []);

  async function toggleAtivo(id: string, ativo: boolean) {
    const r = await fetchApi<any>(`/api/produto/${id}`, {
      method: 'PATCH', body: JSON.stringify({ ativo: !ativo }),
    });
    setRows(rows.map(x => x.id === id ? r : x));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Produtos</h1>
      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3">Finalidade</th><th className="p-3">Pé direito</th><th className="p-3">Ativo</th></tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-bold">{p.nome}</td>
                <td className="p-3">{p.tipo_base}</td>
                <td className="p-3">{p.finalidade}</td>
                <td className="p-3">{p.pe_direito_sugerido_m} m</td>
                <td className="p-3">
                  <button onClick={() => toggleAtivo(p.id, p.ativo)}
                    className={`px-2 py-1 rounded text-xs ${p.ativo ? 'bg-mf-success' : 'bg-gray-400'} text-white`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-600 mt-4">Edição de BOM/opções ficará numa tela dedicada — MVP usa seed SQL.</p>
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/pages/admin/AdminMateriais.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';

export default function AdminMateriais() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');

  useEffect(() => { fetchApi<any[]>('/api/material').then(setRows); }, []);

  async function save(id: string) {
    const r = await fetchApi<any>(`/api/material/${id}`, {
      method: 'PATCH', body: JSON.stringify({ preco_unitario: parseFloat(draftPrice) }),
    });
    setRows(rows.map(x => x.id === id ? r : x));
    setEditingId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Materiais</h1>
      <div className="mt-4 bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mf-black text-white text-left">
            <tr><th className="p-3">SKU</th><th className="p-3">Nome</th><th className="p-3">Categoria</th><th className="p-3">Un.</th><th className="p-3">Preço</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-mono">{m.sku}</td>
                <td className="p-3">{m.nome}</td>
                <td className="p-3">{m.categoria}</td>
                <td className="p-3">{m.unidade}</td>
                <td className="p-3 tabular-nums">
                  {editingId === m.id
                    ? <input value={draftPrice} onChange={e => setDraftPrice(e.target.value)} className="border rounded p-1 w-24"/>
                    : `R$ ${Number(m.preco_unitario).toFixed(2)}`}
                </td>
                <td className="p-3">
                  {editingId === m.id
                    ? <button onClick={() => save(m.id)} className="bg-mf-success text-white px-2 py-1 rounded text-xs">Salvar</button>
                    : <button onClick={() => { setEditingId(m.id); setDraftPrice(String(m.preco_unitario)); }} className="text-mf-yellow font-bold">Editar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminProdutos.tsx frontend/src/pages/admin/AdminMateriais.tsx
git commit -m "feat(frontend): admin produtos (toggle ativo) and materiais (edit preço)"
```

---

## Phase I — Polish, E2E, CI, README

### Task I.1: Playwright e2e — golden path público

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/public-flow.spec.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install Playwright**

```bash
cd frontend
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Write `frontend/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
```

- [ ] **Step 3: Write `frontend/e2e/public-flow.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('public user configures and submits a quote', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Construção modular');
  await page.getByText('Farmácia Express 3×6').click();
  await expect(page).toHaveURL(/\/produto\/farmacia-express-3x6$/);
  await page.getByRole('link', { name: /Configurar orçamento/ }).click();
  await expect(page).toHaveURL(/\/orcamento\/farmacia-express-3x6$/);
  await page.getByPlaceholder('Seu nome').fill('João Teste');
  await page.getByPlaceholder('Email').fill('joao@example.com');
  await page.getByRole('button', { name: /Enviar orçamento/ }).click();
  await expect(page).toHaveURL(/\/obrigado/);
  await expect(page.locator('h1')).toContainText('Orçamento enviado');
});
```

- [ ] **Step 4: Add script to `frontend/package.json`**

```json
"scripts": {
  "test:e2e": "playwright test"
}
```

- [ ] **Step 5: Run (requires `make dev` up in another terminal)**

```bash
npm run test:e2e
```
Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/playwright.config.ts frontend/e2e/ frontend/package.json frontend/package-lock.json
git commit -m "test(e2e): playwright golden path for public flow"
```

### Task I.2: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push: { branches: [main] }
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - name: Install deps
        run: cd backend && uv sync
      - name: Test (unit only — skip integration)
        run: cd backend && uv run pytest -k "not integration" -v
      - name: Lint
        run: cd backend && uv run ruff check .

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - name: Install
        run: cd frontend && npm ci
      - name: Unit tests
        run: cd frontend && npm test -- --run
      - name: Build
        run: cd frontend && npm run build

  parity:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    steps:
      - uses: actions/checkout@v4
      - name: Verify fixtures exist in both sides
        run: |
          test -f database/tests/formula-fixtures.json
          test -f database/tests/variables-fixtures.json
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: backend pytest, frontend vitest+build, parity check"
```

### Task I.3: Updated README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with dev setup, structure, and next waves"
```

### Task I.4: Final manual smoke pass + finish branch

- [ ] **Step 1: Clean restart**

```bash
make clean
make dev
```

- [ ] **Step 2: Run full test suite**

```bash
make test
cd frontend && npm run test:e2e
```
Expected: all green.

- [ ] **Step 3: Manual checklist**

- [ ] http://localhost:5173 shows 2 products
- [ ] Configure Farmácia 3×6 — live price updates as alavancas change
- [ ] Submit form — redirected to `/obrigado`, 2 `.eml` files in `/tmp/sent/`
- [ ] Login at `/admin/login` with admin@metalfort.tech
- [ ] `/admin` dashboard shows the submission
- [ ] `/admin/orcamento/:id` shows detail, Open PDF works, Aprovar updates status
- [ ] `/admin/produtos` toggles ativo
- [ ] `/admin/materiais` edits a price → re-submit from public → new total reflects new price
- [ ] PDF renders legibly with black/yellow header

- [ ] **Step 4: Invoke `superpowers:finishing-a-development-branch` skill**

At this point, the MVP is feature-complete for Onda 1. Invoke the finishing-a-development-branch skill to merge/PR.

---

## Spec coverage self-check

Every numbered section of the spec has at least one task:

- **§1 Contexto:** not code
- **§2 Escopo dentro:** covered by Phases A–I (all "dentro" items listed have tasks)
- **§3.1 9 alavancas:** Task E.4 (Configurator) + Task B.4 (produto_opcao seed)
- **§3.2 Tier B/C:** Task D.2 (tier filter), D.3 (public = core), G.2 (internal = full)
- **§4 Arquitetura 3 plataformas:** A.2 (Supabase) + A.3 (FastAPI) + A.4 (frontend)
- **§5 Monorepo:** A.1
- **§6.1 Tabelas:** B.1 (schema), B.2 (RLS)
- **§6.2 Tabelas ondas 2-3:** explicitly NOT included (out of scope)
- **§7 Formula engine + parity:** C.1–C.4
- **§7.5 Pé direito auto:** Configurator E.4 sets default from tipo_base
- **§8 Rotas frontend:** E.1–E.4, H.1–H.4
- **§9 API backend:** D.3, D.4, G.2
- **§9.5 Identidade visual:** A.4 (CSS tokens), used throughout frontend
- **§10 Auth:** G.1, H.1
- **§11 Dev local:** A.2, A.5
- **§12 Seed:** B.3–B.5
- **§13 Testes:** C (unit), D.2 (calculator), F.1 (pdf), F.2 (email), I.1 (e2e), I.2 (CI)
- **§14 Email:** F.2
- **§15 Deploy cloud:** out of this plan (post-Onda 1)
- **§16 Riscos/premissas:** acknowledged in design; plan follows the "linear module" premise
- **§17 Definition of Done:** I.4 checklist

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-04-18-erp-metalfort-onda1-implementation.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. **Required sub-skill:** `superpowers:subagent-driven-development`.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
