# ERP Metalfort — Onda 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stock control on top of the onda 1 ERP: append-only ledger of movements, computed saldo via a view, fornecedor mini-CRUD, per-material minimum alert, and manufacturing-gap analysis seeded from any existing orçamento.

**Architecture:** Single new SQL migration (`005_estoque.sql`) adds `fornecedor`, `estoque_movimento`, the `estoque_saldo_v` view, a new `estoque_minimo` column on `material`, admin-only RLS, and DB-level CHECK constraints mirroring Pydantic. Backend adds a `services/estoque.py` + routers (`fornecedor.py`, `estoque.py`) reusing the existing `require_role` auth and `get_admin_client` Supabase helper. Frontend adds a nested `/admin/estoque/*` layout with 4 sub-tabs (Saldo · Movimentos · Fornecedores · Fabricação), plus a "Análise de fabricação" shortcut on the orçamento detail page.

**Tech Stack:** (no new stack — reuses onda 1)
- Backend: FastAPI · Pydantic v2 (discriminated union) · supabase-py (service role)
- Frontend: React 18 · Vite · TypeScript · Tailwind · React Router · existing `useAuthedFetch` helper
- DB: Postgres (via Supabase CLI), views, enums, RLS
- Tests: pytest (backend) · Vitest + Testing Library (frontend) · Playwright (e2e, nightly)

**Spec:** `docs/superpowers/specs/2026-04-19-erp-metalfort-onda2-design.md` (read it before starting).

**Repo root:** `/Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort`

---

## Phase 0 — Worktree & Branch Setup

### Task 0.1: Isolate work on a feature branch

**Files:** none (git plumbing only)

- [ ] **Step 1: Verify current branch and clean working tree**

```bash
cd /Users/theodecourttheodecourt/Desktop/THEO/ERP_metalfote/erp-metalfort
git status
git log --oneline -3
```
Expected: on `main`, latest commit is the spec commit (`docs(onda2): spec de design do controle de estoque`). Untracked duplicate files (`* 2.py`, `* 2.ts`, `supabase/snippets/`) are pre-existing and should be ignored — do NOT stage them during this work.

- [ ] **Step 2: Create feature branch**

```bash
git checkout -b feat/onda2-estoque
```

- [ ] **Step 3: Verify**

```bash
git branch --show-current
```
Expected: `feat/onda2-estoque`.

---

## Phase A — Database: migration, seed, smoke-test

### Task A.1: Create migration `005_estoque.sql`

**Files:**
- Create: `supabase/migrations/005_estoque.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/005_estoque.sql`:

```sql
-- Onda 2 — Controle de Estoque
-- Adds: material.estoque_minimo, fornecedor, estoque_movimento, estoque_saldo_v, RLS

-- 1. material: minimum stock threshold (0 = unmonitored)
alter table material
  add column estoque_minimo numeric(12,3) not null default 0
    check (estoque_minimo >= 0);

-- 2. fornecedor
create table fornecedor (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text unique,
  contato_nome text,
  contato_email text,
  contato_fone text,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fornecedor_nome on fornecedor(nome);
create trigger fornecedor_updated_at before update on fornecedor
  for each row execute function set_updated_at();

-- 3. estoque_movimento: append-only ledger
create type estoque_movimento_tipo as enum (
  'compra',
  'ajuste_positivo',
  'saida_obra',
  'ajuste_negativo'
);

create table estoque_movimento (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references material(id),
  tipo estoque_movimento_tipo not null,
  quantidade numeric(12,3) not null check (quantidade > 0),
  preco_unitario numeric(12,2) check (preco_unitario is null or preco_unitario >= 0),
  fornecedor_id uuid references fornecedor(id),
  orcamento_id uuid references orcamento(id),
  destino text,
  nota_fiscal text,
  observacao text,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now(),

  constraint mov_compra_precisa_preco check (
    tipo <> 'compra' or (preco_unitario is not null and fornecedor_id is not null)
  ),
  constraint mov_saida_precisa_destino check (
    tipo <> 'saida_obra' or destino is not null
  ),
  constraint mov_ajuste_precisa_motivo check (
    tipo not in ('ajuste_positivo','ajuste_negativo') or observacao is not null
  ),
  constraint mov_sem_fornecedor_fora_compra check (
    tipo = 'compra' or fornecedor_id is null
  ),
  constraint mov_sem_orcamento_fora_saida check (
    tipo = 'saida_obra' or orcamento_id is null
  ),
  constraint mov_preco_fora_compra_null check (
    tipo = 'compra' or preco_unitario is null
  )
);

create index idx_estoque_mov_material on estoque_movimento(material_id, created_at desc);
create index idx_estoque_mov_tipo on estoque_movimento(tipo, created_at desc);
create index idx_estoque_mov_orcamento on estoque_movimento(orcamento_id);
create index idx_estoque_mov_fornecedor on estoque_movimento(fornecedor_id, created_at desc);

-- 4. estoque_saldo_v: computed balance per material
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

-- 5. RLS: admin only
alter table fornecedor        enable row level security;
alter table estoque_movimento enable row level security;

create policy "fornecedor_admin_all" on fornecedor for all
  using (current_role_internal() = 'admin')
  with check (current_role_internal() = 'admin');

create policy "estoque_movimento_admin_read" on estoque_movimento for select
  using (current_role_internal() = 'admin');
create policy "estoque_movimento_admin_insert" on estoque_movimento for insert
  with check (current_role_internal() = 'admin');
-- no update/delete policies => blocked by default (append-only)
```

- [ ] **Step 2: Apply migration locally**

```bash
make migrate
```
Expected: no errors. Supabase CLI runs `db reset` and applies 001→005.

- [ ] **Step 3: Smoke-test schema via psql**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d fornecedor" -c "\d estoque_movimento" -c "select * from estoque_saldo_v limit 3;"
```
Expected: both tables listed with all columns; view returns rows for existing materials with `saldo = 0`.

- [ ] **Step 4: Verify CHECK constraints work**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
-- Should fail: compra without fornecedor_id
insert into estoque_movimento (material_id, tipo, quantidade, preco_unitario, criado_por)
select id, 'compra', 10, 100, '00000000-0000-0000-0000-000000000000'::uuid
from material limit 1;
SQL
```
Expected: `ERROR: new row for relation "estoque_movimento" violates check constraint "mov_compra_precisa_preco"` (because `fornecedor_id is null`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_estoque.sql
git commit -m "feat(db): migration 005 — estoque schema, view, RLS, CHECKs"
```

---

### Task A.2: Extend seed with fornecedores, minimums, and example movements

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Read current seed tail**

```bash
cat supabase/seed.sql | tail -40
```
Note the file's existing style (pure SQL, no PL/pgSQL wrappers). Append new sections at the end.

- [ ] **Step 2: Append fornecedores section**

Append to `supabase/seed.sql`:

```sql
-- ===== Onda 2: estoque =====

-- Fornecedores
insert into fornecedor (nome, cnpj, contato_nome, contato_email, contato_fone) values
  ('Casa do Construtor', '12.345.678/0001-90', 'João Silva', 'joao@casaconstrutor.com.br', '(11) 94000-0001'),
  ('Metalúrgica Santos', '98.765.432/0001-10', 'Maria Santos', 'vendas@metalsantos.com.br', '(11) 94000-0002'),
  ('Aço Forte',          '55.444.333/0001-22', 'Carlos Lima',  'carlos@acoforte.com.br',    '(11) 94000-0003');
```

- [ ] **Step 3: Append `estoque_minimo` updates for ~10 representative materials**

Append to `supabase/seed.sql`:

```sql
-- Minimums for representative SKUs (others stay 0 = unmonitored)
update material set estoque_minimo = 40  where sku = 'MT-FCH-001';  -- Placa Glasroc-X
update material set estoque_minimo = 500 where sku = 'MT-LSF-001';  -- Perfil LSF (kg)
update material set estoque_minimo = 3   where sku = 'MT-LSF-002';  -- Parafuso metal/metal (cx)
update material set estoque_minimo = 30  where sku = 'MT-DRW-001';  -- Placa gesso 12,5
update material set estoque_minimo = 20  where sku = 'MT-COB-001';  -- Telha TP40 PIR
update material set estoque_minimo = 40  where sku = 'MT-PIS-001';  -- LVT
update material set estoque_minimo = 2   where sku = 'MT-INS-001';  -- Kit hidráulico WC
update material set estoque_minimo = 2   where sku = 'MT-INS-002';  -- Kit elétrico 10 pontos
update material set estoque_minimo = 2   where sku = 'MT-INS-003';  -- Split 12k BTU (if seeded)
update material set estoque_minimo = 5   where sku = 'MT-FCH-005';  -- Manta asfáltica
```

Note: if any `sku` doesn't exist in onda 1's seed, the `update` is a no-op; safe to leave.

- [ ] **Step 4: Append ~15 example movements**

Append to `supabase/seed.sql`:

```sql
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
```

- [ ] **Step 5: Reseed and smoke-test**

```bash
make seed
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "select m.sku, m.estoque_minimo, v.saldo from material m join estoque_saldo_v v on v.material_id = m.id where m.estoque_minimo > 0 order by m.sku;"
```
Expected: at least 5 rows. `MT-FCH-001` shows `saldo = 15` (60 − 45) and `estoque_minimo = 40`, i.e. below minimum.

- [ ] **Step 6: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(seed): fornecedores, estoque_minimo, movimentos iniciais (onda 2)"
```

---

## Phase B — Backend models & services (TDD)

### Task B.1: Pydantic models for fornecedor + movimento (discriminated union)

**Files:**
- Create: `backend/app/models/estoque.py`
- Test: `backend/tests/test_models_estoque.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_models_estoque.py`:

```python
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from app.models.estoque import (
    FornecedorCreate,
    FornecedorUpdate,
    MovimentoIn,
    MovimentoCompraIn,
    MovimentoSaidaObraIn,
    MovimentoAjusteIn,
)


def test_fornecedor_create_minimo():
    f = FornecedorCreate(nome="Casa do Construtor")
    assert f.nome == "Casa do Construtor"
    assert f.cnpj is None


def test_fornecedor_create_email_valido():
    FornecedorCreate(nome="X", contato_email="a@b.com")
    with pytest.raises(ValidationError):
        FornecedorCreate(nome="X", contato_email="not-an-email")


def test_movimento_compra_ok():
    m = MovimentoCompraIn(
        tipo="compra",
        material_id=uuid4(),
        quantidade=Decimal("10"),
        preco_unitario=Decimal("50"),
        fornecedor_id=uuid4(),
    )
    assert m.tipo == "compra"


def test_movimento_compra_sem_preco_falha():
    with pytest.raises(ValidationError):
        MovimentoCompraIn(
            tipo="compra",
            material_id=uuid4(),
            quantidade=Decimal("10"),
            fornecedor_id=uuid4(),  # missing preco_unitario
        )  # type: ignore[call-arg]


def test_movimento_saida_precisa_destino():
    ta = TypeAdapter(MovimentoIn)
    # destino obrigatório
    with pytest.raises(ValidationError):
        ta.validate_python({
            "tipo": "saida_obra",
            "material_id": str(uuid4()),
            "quantidade": "5",
        })
    # ok com destino texto livre
    m = ta.validate_python({
        "tipo": "saida_obra",
        "material_id": str(uuid4()),
        "quantidade": "5",
        "destino": "Manutenção",
    })
    assert isinstance(m, MovimentoSaidaObraIn)


def test_movimento_ajuste_precisa_observacao():
    with pytest.raises(ValidationError):
        MovimentoAjusteIn(
            tipo="ajuste_positivo",
            material_id=uuid4(),
            quantidade=Decimal("3"),
        )  # type: ignore[call-arg]
    m = MovimentoAjusteIn(
        tipo="ajuste_negativo",
        material_id=uuid4(),
        quantidade=Decimal("3"),
        observacao="Perda na descarga",
    )
    assert m.tipo == "ajuste_negativo"


def test_movimento_quantidade_positiva():
    with pytest.raises(ValidationError):
        MovimentoAjusteIn(
            tipo="ajuste_positivo",
            material_id=uuid4(),
            quantidade=Decimal("0"),
            observacao="x",
        )


def test_discriminator_union_resolves_each_type():
    ta = TypeAdapter(MovimentoIn)
    m = ta.validate_python({
        "tipo": "compra",
        "material_id": str(uuid4()),
        "quantidade": "2",
        "preco_unitario": "10",
        "fornecedor_id": str(uuid4()),
    })
    assert isinstance(m, MovimentoCompraIn)
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd backend && uv run pytest tests/test_models_estoque.py -x
```
Expected: `ModuleNotFoundError: No module named 'app.models.estoque'`.

- [ ] **Step 3: Implement the models**

Create `backend/app/models/estoque.py`:

```python
from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Literal, Union
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class FornecedorCreate(BaseModel):
    nome: str = Field(min_length=1)
    cnpj: str | None = None
    contato_nome: str | None = None
    contato_email: EmailStr | None = None
    contato_fone: str | None = None
    observacao: str | None = None


class FornecedorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1)
    cnpj: str | None = None
    contato_nome: str | None = None
    contato_email: EmailStr | None = None
    contato_fone: str | None = None
    observacao: str | None = None
    ativo: bool | None = None


class _MovimentoBase(BaseModel):
    material_id: UUID
    quantidade: Decimal = Field(gt=0)

    @field_validator("quantidade")
    @classmethod
    def _round3(cls, v: Decimal) -> Decimal:
        return v.quantize(Decimal("0.001"))


class MovimentoCompraIn(_MovimentoBase):
    tipo: Literal["compra"]
    preco_unitario: Decimal = Field(ge=0)
    fornecedor_id: UUID
    nota_fiscal: str | None = None
    observacao: str | None = None


class MovimentoSaidaObraIn(_MovimentoBase):
    tipo: Literal["saida_obra"]
    orcamento_id: UUID | None = None
    destino: str = Field(min_length=1)
    observacao: str | None = None


class MovimentoAjusteIn(_MovimentoBase):
    tipo: Literal["ajuste_positivo", "ajuste_negativo"]
    observacao: str = Field(min_length=1)


MovimentoIn = Annotated[
    Union[MovimentoCompraIn, MovimentoSaidaObraIn, MovimentoAjusteIn],
    Field(discriminator="tipo"),
]
```

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/test_models_estoque.py -v
```
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/estoque.py backend/tests/test_models_estoque.py
git commit -m "feat(backend): pydantic models for fornecedor + movimento (discriminated union)"
```

---

### Task B.2: Service — `calcular_saldo` + `listar_saldos` (TDD)

**Files:**
- Create: `backend/app/services/estoque.py`
- Test: `backend/tests/test_estoque_service.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_estoque_service.py`:

```python
from decimal import Decimal
from uuid import uuid4

import pytest

from app.services.estoque import (
    saldo_from_movimentos,
    montar_saldos,
    montar_analise_fabricacao,
)


def _mov(tipo: str, qtd: str) -> dict:
    return {"tipo": tipo, "quantidade": Decimal(qtd)}


def test_saldo_sem_movimentos_e_zero():
    assert saldo_from_movimentos([]) == Decimal("0")


def test_saldo_soma_compra_e_subtrai_saida():
    movs = [
        _mov("compra", "10"),
        _mov("saida_obra", "3"),
        _mov("ajuste_positivo", "2"),
        _mov("ajuste_negativo", "1"),
    ]
    assert saldo_from_movimentos(movs) == Decimal("8")


def test_saldo_pode_ser_negativo():
    movs = [_mov("saida_obra", "5")]
    assert saldo_from_movimentos(movs) == Decimal("-5")


def test_montar_saldos_marca_abaixo_do_minimo():
    material = {
        "id": str(uuid4()),
        "sku": "MT-FCH-001",
        "nome": "Placa",
        "categoria": "fechamento",
        "unidade": "pc",
        "preco_unitario": 219.90,
        "estoque_minimo": 40,
        "ativo": True,
    }
    saldos_v = [{"material_id": material["id"], "saldo": Decimal("15")}]
    result = montar_saldos([material], saldos_v)
    assert len(result) == 1
    row = result[0]
    assert row["saldo"] == Decimal("15")
    assert row["abaixo_minimo"] is True


def test_montar_saldos_minimo_zero_nunca_alerta():
    material = {
        "id": str(uuid4()),
        "sku": "X", "nome": "Y", "categoria": "acabamento",
        "unidade": "pc", "preco_unitario": 1, "estoque_minimo": 0, "ativo": True,
    }
    saldos_v = [{"material_id": material["id"], "saldo": Decimal("0")}]
    assert montar_saldos([material], saldos_v)[0]["abaixo_minimo"] is False


def test_analise_fabricacao_classifica_status_e_custo():
    mid = str(uuid4())
    orc = {"id": str(uuid4()), "numero": "ORC-2026-0001",
           "cliente_nome": "Tatuí", "produto_id": str(uuid4())}
    itens_orc = [{
        "material_id": mid, "descricao": "Placa Glasroc", "unidade": "pc",
        "quantidade": Decimal("28"), "preco_unitario": Decimal("219.90"),
        "subtotal": Decimal("6157.20"), "tier": "core",
        "categoria": "fechamento", "ordem": 1,
    }]
    saldos = [{"material_id": mid, "saldo": Decimal("23")}]
    materiais = [{"id": mid, "sku": "MT-FCH-001", "nome": "Placa",
                  "unidade": "pc", "preco_unitario": 219.90}]
    produto = {"id": orc["produto_id"], "nome": "Farmácia Express 3×6"}

    result = montar_analise_fabricacao(orc, produto, itens_orc, saldos, materiais)
    assert result["orcamento_numero"] == "ORC-2026-0001"
    assert len(result["itens"]) == 1
    linha = result["itens"][0]
    assert linha["status"] == "faltante"
    assert linha["falta"] == Decimal("5")
    assert linha["custo_reposicao_linha"] == Decimal("1099.50")
    assert result["totais"]["itens_faltantes"] == 1
    assert result["totais"]["custo_reposicao"] == Decimal("1099.50")


def test_analise_fabricacao_saldo_suficiente_nao_conta_falta():
    mid = str(uuid4())
    orc = {"id": str(uuid4()), "numero": "ORC-2026-0002",
           "cliente_nome": "A", "produto_id": str(uuid4())}
    itens_orc = [{
        "material_id": mid, "descricao": "X", "unidade": "pc",
        "quantidade": Decimal("10"), "preco_unitario": Decimal("5"),
        "subtotal": Decimal("50"), "tier": "core",
        "categoria": "estrutura", "ordem": 1,
    }]
    saldos = [{"material_id": mid, "saldo": Decimal("100")}]
    materiais = [{"id": mid, "sku": "X", "nome": "X", "unidade": "pc",
                  "preco_unitario": 5}]
    produto = {"id": orc["produto_id"], "nome": "P"}

    result = montar_analise_fabricacao(orc, produto, itens_orc, saldos, materiais)
    linha = result["itens"][0]
    assert linha["status"] == "suficiente"
    assert linha["falta"] == Decimal("0")
    assert result["totais"]["itens_faltantes"] == 0
    assert result["totais"]["custo_reposicao"] == Decimal("0")
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd backend && uv run pytest tests/test_estoque_service.py -x
```
Expected: `ModuleNotFoundError: No module named 'app.services.estoque'`.

- [ ] **Step 3: Implement the service**

Create `backend/app/services/estoque.py`:

```python
from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable

_SIGN = {
    "compra":            Decimal("1"),
    "ajuste_positivo":   Decimal("1"),
    "saida_obra":        Decimal("-1"),
    "ajuste_negativo":   Decimal("-1"),
}


def saldo_from_movimentos(movimentos: Iterable[dict[str, Any]]) -> Decimal:
    total = Decimal("0")
    for m in movimentos:
        sign = _SIGN[m["tipo"]]
        total += sign * Decimal(str(m["quantidade"]))
    return total


def montar_saldos(
    materiais: list[dict[str, Any]],
    saldos_v: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    saldo_por_mat = {str(s["material_id"]): Decimal(str(s["saldo"])) for s in saldos_v}
    out: list[dict[str, Any]] = []
    for m in materiais:
        saldo = saldo_por_mat.get(str(m["id"]), Decimal("0"))
        minimo = Decimal(str(m.get("estoque_minimo") or 0))
        abaixo = minimo > 0 and saldo < minimo
        out.append({
            "material_id": m["id"],
            "sku": m["sku"],
            "nome": m["nome"],
            "categoria": m["categoria"],
            "unidade": m["unidade"],
            "saldo": saldo,
            "estoque_minimo": minimo,
            "abaixo_minimo": abaixo,
            "preco_unitario": Decimal(str(m["preco_unitario"])),
        })
    return out


def montar_analise_fabricacao(
    orcamento: dict[str, Any],
    produto: dict[str, Any],
    itens_orc: list[dict[str, Any]],
    saldos_v: list[dict[str, Any]],
    materiais: list[dict[str, Any]],
) -> dict[str, Any]:
    saldo_por_mat = {str(s["material_id"]): Decimal(str(s["saldo"])) for s in saldos_v}
    mat_index = {str(m["id"]): m for m in materiais}

    linhas: list[dict[str, Any]] = []
    faltantes = 0
    custo_reposicao = Decimal("0")
    for it in itens_orc:
        mat = mat_index.get(str(it["material_id"]), {})
        necessario = Decimal(str(it["quantidade"]))
        saldo_atual = saldo_por_mat.get(str(it["material_id"]), Decimal("0"))
        falta = max(Decimal("0"), necessario - saldo_atual)
        status = "faltante" if falta > 0 else "suficiente"
        preco = Decimal(str(mat.get("preco_unitario", it["preco_unitario"])))
        custo_linha = (falta * preco).quantize(Decimal("0.01"))
        if status == "faltante":
            faltantes += 1
            custo_reposicao += custo_linha
        linhas.append({
            "material_id": it["material_id"],
            "sku": mat.get("sku", ""),
            "nome": it["descricao"],
            "unidade": it["unidade"],
            "necessario": necessario,
            "saldo_atual": saldo_atual,
            "falta": falta,
            "status": status,
            "preco_unitario": preco,
            "custo_reposicao_linha": custo_linha,
        })

    return {
        "orcamento_id": orcamento["id"],
        "orcamento_numero": orcamento["numero"],
        "cliente_nome": orcamento["cliente_nome"],
        "produto_nome": produto["nome"],
        "itens": linhas,
        "totais": {
            "itens_total": len(linhas),
            "itens_faltantes": faltantes,
            "custo_reposicao": custo_reposicao,
        },
    }
```

- [ ] **Step 4: Run tests**

```bash
cd backend && uv run pytest tests/test_estoque_service.py -v
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/estoque.py backend/tests/test_estoque_service.py
git commit -m "feat(backend): estoque service — saldo, analise de fabricacao (TDD)"
```

---

## Phase C — Backend routers

### Task C.1: Fornecedor router (CRUD)

**Files:**
- Create: `backend/app/routers/fornecedor.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

Create `backend/app/routers/fornecedor.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.estoque import FornecedorCreate, FornecedorUpdate

router = APIRouter(prefix="/api/fornecedor", tags=["fornecedor"])


@router.get("")
def list_all(
    ativo: bool | None = Query(default=True),
    q: str | None = Query(default=None),
    user=Depends(require_role("admin")),
):
    sb = get_admin_client()
    query = sb.table("fornecedor").select("*").order("nome")
    if ativo is not None:
        query = query.eq("ativo", ativo)
    if q:
        query = query.ilike("nome", f"%{q}%")
    return query.execute().data or []


@router.post("", status_code=201)
def create(body: FornecedorCreate, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    payload = body.model_dump(mode="json", exclude_none=True)
    return sb.table("fornecedor").insert(payload).execute().data[0]


@router.patch("/{fornecedor_id}")
def patch(fornecedor_id: str, body: FornecedorUpdate, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    payload = body.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise HTTPException(400, "nothing to update")
    sb.table("fornecedor").update(payload).eq("id", fornecedor_id).execute()
    return sb.table("fornecedor").select("*").eq("id", fornecedor_id).limit(1).execute().data[0]


@router.delete("/{fornecedor_id}")
def deactivate(fornecedor_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("fornecedor").update({"ativo": False}).eq("id", fornecedor_id).execute()
    return {"ok": True}
```

- [ ] **Step 2: Register the router**

Edit `backend/app/main.py`:

```python
from app.routers import fornecedor, material, produto, public_quote, quote
# …
app.include_router(fornecedor.router)
```

Place the new `include_router` line next to the others. Keep alphabetical or append — match the file's existing order.

- [ ] **Step 3: Smoke-test the endpoints**

```bash
cd backend && uv run uvicorn app.main:app --reload &
SERVER_PID=$!
sleep 2
curl -s http://localhost:8000/api/fornecedor | head -c 200
# Should 401 (no token) — that's fine; the server is reachable.
kill $SERVER_PID
```
Expected: HTTP 401/403 body. Server starts cleanly with no import errors.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/fornecedor.py backend/app/main.py
git commit -m "feat(backend): router de fornecedor (CRUD admin-only)"
```

---

### Task C.2: Estoque router (saldo, movimento, fabricação)

**Files:**
- Create: `backend/app/routers/estoque.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

Create `backend/app/routers/estoque.py`:

```python
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client
from app.models.estoque import MovimentoIn
from app.services.estoque import (
    montar_analise_fabricacao,
    montar_saldos,
)

router = APIRouter(prefix="/api/estoque", tags=["estoque"])


# ---------- Saldo ----------

@router.get("/saldo")
def saldo(
    abaixo_minimo: bool = Query(default=False),
    q: str | None = Query(default=None),
    user=Depends(require_role("admin")),
):
    sb = get_admin_client()
    mats_q = sb.table("material").select("*").eq("ativo", True)
    if q:
        mats_q = mats_q.or_(f"sku.ilike.%{q}%,nome.ilike.%{q}%")
    materiais = mats_q.order("categoria").order("nome").execute().data or []
    saldos_v = sb.table("estoque_saldo_v").select("*").execute().data or []
    rows = montar_saldos(materiais, saldos_v)
    if abaixo_minimo:
        rows = [r for r in rows if r["abaixo_minimo"]]
    return rows


@router.get("/saldo/{material_id}")
def saldo_material(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    mat = sb.table("material").select("*").eq("id", material_id).limit(1).execute().data
    if not mat:
        raise HTTPException(404, "Material não encontrado")
    sv = sb.table("estoque_saldo_v").select("*").eq("material_id", material_id).execute().data
    rows = montar_saldos(mat, sv or [])
    movs = (
        sb.table("estoque_movimento")
        .select("*")
        .eq("material_id", material_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    return {**rows[0], "ultimos_movimentos": movs}


# ---------- Movimento ----------

@router.get("/movimento")
def list_movimentos(
    material_id: str | None = None,
    tipo: str | None = None,
    fornecedor_id: str | None = None,
    orcamento_id: str | None = None,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_role("admin")),
):
    sb = get_admin_client()
    q = sb.table("estoque_movimento").select("*").order("created_at", desc=True)
    if material_id:
        q = q.eq("material_id", material_id)
    if tipo:
        q = q.eq("tipo", tipo)
    if fornecedor_id:
        q = q.eq("fornecedor_id", fornecedor_id)
    if orcamento_id:
        q = q.eq("orcamento_id", orcamento_id)
    if data_inicio:
        q = q.gte("created_at", data_inicio)
    if data_fim:
        q = q.lte("created_at", data_fim)
    q = q.range(offset, offset + limit - 1)
    return q.execute().data or []


@router.post("/movimento", status_code=201)
def create_movimento(body: MovimentoIn, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    payload = body.model_dump(mode="json", exclude_none=False)
    payload["criado_por"] = user["id"]
    # Discriminated-union validation already enforced; strip fields that don't belong
    # to the chosen tipo (Pydantic already excluded unrelated ones, but double-check).
    data = sb.table("estoque_movimento").insert(payload).execute().data
    if not data:
        raise HTTPException(500, "Falha ao inserir movimento")
    return data[0]


@router.get("/movimento/{movimento_id}")
def get_movimento(movimento_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    data = sb.table("estoque_movimento").select("*").eq("id", movimento_id).limit(1).execute().data
    if not data:
        raise HTTPException(404, "Movimento não encontrado")
    return data[0]


# ---------- Análise de fabricação ----------

@router.get("/fabricacao/{orcamento_id}")
def analise_fabricacao(orcamento_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    orc_res = sb.table("orcamento").select("*").eq("id", orcamento_id).limit(1).execute().data
    if not orc_res:
        raise HTTPException(404, "Orçamento não encontrado")
    orc = orc_res[0]
    produto = (
        sb.table("produto").select("id,nome").eq("id", orc["produto_id"]).limit(1).execute().data
    )
    if not produto:
        raise HTTPException(404, "Produto do orçamento não encontrado")
    itens = (
        sb.table("orcamento_item").select("*")
        .eq("orcamento_id", orcamento_id).order("ordem").execute().data or []
    )
    if not itens:
        return {
            "orcamento_id": orcamento_id,
            "orcamento_numero": orc["numero"],
            "cliente_nome": orc["cliente_nome"],
            "produto_nome": produto[0]["nome"],
            "itens": [],
            "totais": {"itens_total": 0, "itens_faltantes": 0, "custo_reposicao": 0},
        }
    mat_ids = list({it["material_id"] for it in itens})
    materiais = (
        sb.table("material").select("*").in_("id", mat_ids).execute().data or []
    )
    saldos = (
        sb.table("estoque_saldo_v").select("*").in_("material_id", mat_ids).execute().data or []
    )
    return montar_analise_fabricacao(orc, produto[0], itens, saldos, materiais)
```

- [ ] **Step 2: Register the router in `main.py`**

Edit `backend/app/main.py` — add `estoque` to the imports and `include_router` list:

```python
from app.routers import estoque, fornecedor, material, produto, public_quote, quote
# …
app.include_router(estoque.router)
```

- [ ] **Step 3: Integration test via script**

Create a throwaway script `/tmp/test_estoque_api.sh`:

```bash
#!/bin/bash
set -e
# Assumes uvicorn is running on :8000 and make seed has been applied.
# 1) No token → 401
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/estoque/saldo)
[ "$code" = "401" ] || { echo "expected 401, got $code"; exit 1; }
echo "ok: unauth rejected"
```

Run backend, execute script:
```bash
cd backend && uv run uvicorn app.main:app --reload &
SERVER_PID=$!
sleep 2
bash /tmp/test_estoque_api.sh
kill $SERVER_PID
```
Expected: `ok: unauth rejected`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/estoque.py backend/app/main.py
git commit -m "feat(backend): router de estoque (saldo, movimento, fabricacao)"
```

---

### Task C.3: Extend material router to accept `estoque_minimo`

**Files:**
- Modify: `backend/app/routers/material.py`

Currently the material router takes a raw `dict` for body (onda 1 style). We add lightweight filtering so unknown fields are ignored but `estoque_minimo` passes through.

- [ ] **Step 1: Tighten the router**

Edit `backend/app/routers/material.py` — replace the whole file:

```python
from fastapi import APIRouter, Depends, HTTPException

from app.lib.auth import require_role
from app.lib.supabase import get_admin_client

router = APIRouter(prefix="/api/material", tags=["material"])

_ALLOWED_FIELDS = {
    "sku", "nome", "categoria", "unidade", "preco_unitario",
    "estoque_minimo", "ativo",
}


@router.get("")
def list_all(user=Depends(require_role("admin", "vendedor"))):
    sb = get_admin_client()
    return sb.table("material").select("*").order("categoria", desc=False).order("nome").execute().data or []


@router.post("")
def create(body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _ALLOWED_FIELDS}
    if "sku" not in payload or "nome" not in payload:
        raise HTTPException(400, "sku e nome são obrigatórios")
    sb = get_admin_client()
    return sb.table("material").insert(payload).execute().data[0]


@router.patch("/{material_id}")
def patch(material_id: str, body: dict, user=Depends(require_role("admin"))):
    payload = {k: v for k, v in body.items() if k in _ALLOWED_FIELDS}
    if not payload:
        raise HTTPException(400, "nothing to update")
    sb = get_admin_client()
    sb.table("material").update(payload).eq("id", material_id).execute()
    return sb.table("material").select("*").eq("id", material_id).limit(1).execute().data[0]


@router.delete("/{material_id}")
def deactivate(material_id: str, user=Depends(require_role("admin"))):
    sb = get_admin_client()
    sb.table("material").update({"ativo": False}).eq("id", material_id).execute()
    return {"ok": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/material.py
git commit -m "feat(backend): material router aceita estoque_minimo no POST/PATCH"
```

---

### Task C.4: Integration tests with live Supabase (role-gating + CRUD)

**Files:**
- Create: `backend/tests/test_estoque_api.py`

These tests require the local Supabase stack to be running. Follow onda 1's pattern: skip when `SUPABASE_URL` isn't set to a local address, otherwise exercise real HTTP calls.

- [ ] **Step 1: Read an existing integration test for the pattern**

```bash
cat backend/tests/test_quote_calculator.py | head -30
```
(If there's no HTTP integration test yet, these tests become the first of their kind — the pattern below stands on its own.)

- [ ] **Step 2: Write the integration test**

Create `backend/tests/test_estoque_api.py`:

```python
from __future__ import annotations

import os
from decimal import Decimal

import httpx
import pytest

BASE = os.environ.get("API_BASE", "http://localhost:8000")
RUN_INTEGRATION = os.environ.get("RUN_INTEGRATION") == "1"

pytestmark = pytest.mark.skipif(
    not RUN_INTEGRATION,
    reason="set RUN_INTEGRATION=1 and ensure local Supabase + uvicorn are running",
)


def _admin_token() -> str:
    # Uses Supabase local GoTrue to sign in the dev admin created by seed.
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/token?grant_type=password"
    key = os.environ["SUPABASE_ANON_KEY"]
    r = httpx.post(
        url,
        headers={"apikey": key, "Content-Type": "application/json"},
        json={"email": "admin@metalfort.tech", "password": "metalfort2026!"},
        timeout=5.0,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_admin_token()}"}


def test_saldo_unauth_401():
    r = httpx.get(f"{BASE}/api/estoque/saldo", timeout=5.0)
    assert r.status_code == 401


def test_saldo_admin_ok():
    r = httpx.get(f"{BASE}/api/estoque/saldo", headers=_auth_headers(), timeout=5.0)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    # Seed has at least one material
    assert any(row["sku"] for row in rows)


def test_saldo_abaixo_minimo_filter():
    r = httpx.get(
        f"{BASE}/api/estoque/saldo?abaixo_minimo=true",
        headers=_auth_headers(),
        timeout=5.0,
    )
    assert r.status_code == 200
    for row in r.json():
        assert row["abaixo_minimo"] is True
        assert Decimal(str(row["estoque_minimo"])) > 0


def test_fornecedor_crud_cycle():
    h = _auth_headers()
    # create
    created = httpx.post(
        f"{BASE}/api/fornecedor",
        headers=h,
        json={"nome": "Teste CRUD", "cnpj": None, "contato_email": "a@b.com"},
        timeout=5.0,
    ).json()
    fid = created["id"]
    # patch
    patched = httpx.patch(
        f"{BASE}/api/fornecedor/{fid}",
        headers=h,
        json={"contato_nome": "Joana"},
        timeout=5.0,
    ).json()
    assert patched["contato_nome"] == "Joana"
    # soft delete
    r = httpx.delete(f"{BASE}/api/fornecedor/{fid}", headers=h, timeout=5.0)
    assert r.status_code == 200


def test_movimento_compra_invalida_sem_preco_retorna_422():
    h = _auth_headers()
    # Pick a material id
    mats = httpx.get(f"{BASE}/api/material", headers=h, timeout=5.0).json()
    mid = mats[0]["id"]
    bad = {"tipo": "compra", "material_id": mid, "quantidade": "3"}
    r = httpx.post(f"{BASE}/api/estoque/movimento", headers=h, json=bad, timeout=5.0)
    assert r.status_code == 422


def test_movimento_ajuste_sem_observacao_retorna_422():
    h = _auth_headers()
    mats = httpx.get(f"{BASE}/api/material", headers=h, timeout=5.0).json()
    mid = mats[0]["id"]
    bad = {"tipo": "ajuste_positivo", "material_id": mid, "quantidade": "1"}
    r = httpx.post(f"{BASE}/api/estoque/movimento", headers=h, json=bad, timeout=5.0)
    assert r.status_code == 422


def test_fabricacao_retorna_analise_para_orcamento_seed():
    h = _auth_headers()
    orcs = httpx.get(f"{BASE}/api/quote", headers=h, timeout=5.0).json()
    if not orcs:
        pytest.skip("no orçamentos in seed")
    oid = orcs[0]["id"]
    r = httpx.get(f"{BASE}/api/estoque/fabricacao/{oid}", headers=h, timeout=5.0)
    assert r.status_code == 200
    body = r.json()
    assert body["orcamento_id"] == oid
    assert "itens" in body and "totais" in body
```

- [ ] **Step 3: Run integration tests**

In one terminal:
```bash
make dev
```

In another:
```bash
cd backend && RUN_INTEGRATION=1 \
  SUPABASE_URL=http://127.0.0.1:54321 \
  SUPABASE_ANON_KEY=$(grep SUPABASE_ANON_KEY .env | cut -d= -f2) \
  uv run pytest tests/test_estoque_api.py -v
```
Expected: all 7 tests pass. If `make seed` already created orcamentos from onda 1, `test_fabricacao_retorna_analise_para_orcamento_seed` exercises the full flow.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_estoque_api.py
git commit -m "test(backend): integração HTTP de estoque e fornecedor"
```

---

## Phase D — Frontend: types and API client

### Task D.1: TypeScript types mirroring Pydantic

**Files:**
- Create: `frontend/src/lib/estoque.ts`

- [ ] **Step 1: Create types + client functions**

Create `frontend/src/lib/estoque.ts`:

```typescript
export type MovimentoTipo =
  | 'compra'
  | 'ajuste_positivo'
  | 'saida_obra'
  | 'ajuste_negativo';

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
  contato_fone?: string | null;
  observacao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FornecedorInput {
  nome: string;
  cnpj?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
  contato_fone?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export interface SaldoRow {
  material_id: string;
  sku: string;
  nome: string;
  categoria: string;
  unidade: string;
  saldo: string;            // backend sends Decimal as string via JSON
  estoque_minimo: string;
  abaixo_minimo: boolean;
  preco_unitario: string;
}

export interface Movimento {
  id: string;
  material_id: string;
  tipo: MovimentoTipo;
  quantidade: string;
  preco_unitario: string | null;
  fornecedor_id: string | null;
  orcamento_id: string | null;
  destino: string | null;
  nota_fiscal: string | null;
  observacao: string | null;
  criado_por: string;
  created_at: string;
}

export type MovimentoInput =
  | {
      tipo: 'compra';
      material_id: string;
      quantidade: string;
      preco_unitario: string;
      fornecedor_id: string;
      nota_fiscal?: string | null;
      observacao?: string | null;
    }
  | {
      tipo: 'saida_obra';
      material_id: string;
      quantidade: string;
      orcamento_id?: string | null;
      destino: string;
      observacao?: string | null;
    }
  | {
      tipo: 'ajuste_positivo' | 'ajuste_negativo';
      material_id: string;
      quantidade: string;
      observacao: string;
    };

export interface FabricacaoLinha {
  material_id: string;
  sku: string;
  nome: string;
  unidade: string;
  necessario: string;
  saldo_atual: string;
  falta: string;
  status: 'suficiente' | 'faltante';
  preco_unitario: string;
  custo_reposicao_linha: string;
}

export interface FabricacaoAnalise {
  orcamento_id: string;
  orcamento_numero: string;
  cliente_nome: string;
  produto_nome: string;
  itens: FabricacaoLinha[];
  totais: {
    itens_total: number;
    itens_faltantes: number;
    custo_reposicao: string;
  };
}

// ----- API calls -----

// The project uses useAuthedFetch() which returns a generic fetcher that
// already attaches the Supabase bearer token. We accept that fetcher as an
// argument to keep pages thin and avoid importing a hook into a plain module.

export type Fetcher = <T>(path: string, init?: RequestInit) => Promise<T>;

export const estoqueApi = {
  listSaldo: (
    fetchApi: Fetcher,
    opts: { abaixoMinimo?: boolean; q?: string } = {},
  ) => {
    const p = new URLSearchParams();
    if (opts.abaixoMinimo) p.set('abaixo_minimo', 'true');
    if (opts.q) p.set('q', opts.q);
    const qs = p.toString();
    return fetchApi<SaldoRow[]>(`/api/estoque/saldo${qs ? `?${qs}` : ''}`);
  },

  listMovimentos: (
    fetchApi: Fetcher,
    filters: Partial<{
      material_id: string;
      tipo: MovimentoTipo;
      fornecedor_id: string;
      orcamento_id: string;
      data_inicio: string;
      data_fim: string;
      limit: number;
      offset: number;
    }> = {},
  ) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
    }
    const qs = p.toString();
    return fetchApi<Movimento[]>(`/api/estoque/movimento${qs ? `?${qs}` : ''}`);
  },

  createMovimento: (fetchApi: Fetcher, body: MovimentoInput) =>
    fetchApi<Movimento>('/api/estoque/movimento', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  analiseFabricacao: (fetchApi: Fetcher, orcamentoId: string) =>
    fetchApi<FabricacaoAnalise>(`/api/estoque/fabricacao/${orcamentoId}`),
};

export const fornecedorApi = {
  list: (fetchApi: Fetcher, opts: { ativo?: boolean; q?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.ativo !== undefined) p.set('ativo', String(opts.ativo));
    if (opts.q) p.set('q', opts.q);
    const qs = p.toString();
    return fetchApi<Fornecedor[]>(`/api/fornecedor${qs ? `?${qs}` : ''}`);
  },

  create: (fetchApi: Fetcher, body: FornecedorInput) =>
    fetchApi<Fornecedor>('/api/fornecedor', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (fetchApi: Fetcher, id: string, body: Partial<FornecedorInput>) =>
    fetchApi<Fornecedor>(`/api/fornecedor/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivate: (fetchApi: Fetcher, id: string) =>
    fetchApi<{ ok: boolean }>(`/api/fornecedor/${id}`, {
      method: 'DELETE',
    }),
};
```

Note: this module only declares types + URL builders; every HTTP call goes through the `Fetcher` parameter, which the pages obtain via `useAuthedFetch()`. The fetcher already adds the Supabase bearer token, `Content-Type`, and standard error handling.

- [ ] **Step 2: Verify typecheck**

```bash
cd frontend && npm run build
```
Expected: type check + build both succeed. (No existing code imports these yet.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/estoque.ts
git commit -m "feat(frontend): tipos e client de estoque/fornecedor"
```

---

## Phase E — Frontend components (TDD where it adds value)

### Task E.1: Sub-nav (`EstoqueNav`)

**Files:**
- Create: `frontend/src/components/Estoque/EstoqueNav.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/Estoque/EstoqueNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';

const tab = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm rounded ${
    isActive ? 'bg-mf-yellow text-mf-black font-bold' : 'text-mf-text-ink hover:bg-mf-black-soft/10'
  }`;

export default function EstoqueNav() {
  return (
    <nav className="flex gap-2 border-b border-mf-border/20 pb-3 mb-4">
      <NavLink to="/admin/estoque/saldo" className={tab}>Saldo</NavLink>
      <NavLink to="/admin/estoque/movimentos" className={tab}>Movimentos</NavLink>
      <NavLink to="/admin/estoque/fornecedores" className={tab}>Fornecedores</NavLink>
      <NavLink to="/admin/estoque/fabricacao" className={tab}>Fabricação</NavLink>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Estoque/EstoqueNav.tsx
git commit -m "feat(frontend): EstoqueNav sub-nav"
```

---

### Task E.2: `SaldoTable` (with test)

**Files:**
- Create: `frontend/src/components/Estoque/SaldoTable.tsx`
- Create: `frontend/src/components/Estoque/SaldoTable.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Estoque/SaldoTable.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SaldoTable from './SaldoTable';
import type { SaldoRow } from '../../lib/estoque';

const rows: SaldoRow[] = [
  {
    material_id: 'a',
    sku: 'MT-FCH-001',
    nome: 'Placa Glasroc-X',
    categoria: 'fechamento',
    unidade: 'pc',
    saldo: '15',
    estoque_minimo: '40',
    abaixo_minimo: true,
    preco_unitario: '219.90',
  },
  {
    material_id: 'b',
    sku: 'MT-LSF-001',
    nome: 'Perfil LSF',
    categoria: 'estrutura',
    unidade: 'kg',
    saldo: '800',
    estoque_minimo: '500',
    abaixo_minimo: false,
    preco_unitario: '14.00',
  },
];

describe('SaldoTable', () => {
  it('renders both rows with sku and saldo', () => {
    render(<SaldoTable rows={rows} />);
    expect(screen.getByText('MT-FCH-001')).toBeInTheDocument();
    expect(screen.getByText('MT-LSF-001')).toBeInTheDocument();
  });

  it('shows "abaixo do mínimo" badge only on rows where the flag is true', () => {
    render(<SaldoTable rows={rows} />);
    const badges = screen.queryAllByText(/abaixo do mínimo/i);
    expect(badges).toHaveLength(1);
  });

  it('highlights negative saldo with danger color', () => {
    const neg: SaldoRow[] = [{ ...rows[0], saldo: '-3', abaixo_minimo: true }];
    const { container } = render(<SaldoTable rows={neg} />);
    // The saldo cell is the 4th td in the only row.
    const saldoCell = container.querySelector('tbody tr td:nth-child(4)');
    expect(saldoCell?.className).toMatch(/text-mf-danger/);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd frontend && npx vitest run src/components/Estoque/SaldoTable.test.tsx
```
Expected: module not found.

- [ ] **Step 3: Implement the component**

Create `frontend/src/components/Estoque/SaldoTable.tsx`:

```tsx
import type { SaldoRow } from '../../lib/estoque';
import { fmtDec } from '../../lib/format';

interface Props {
  rows: SaldoRow[];
}

export default function SaldoTable({ rows }: Props) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="text-left text-mf-text-secondary">
        <tr>
          <th className="py-2">SKU</th>
          <th>Material</th>
          <th>Categoria</th>
          <th className="text-right">Saldo</th>
          <th className="text-right">Mínimo</th>
          <th>Un.</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const saldoNum = Number(r.saldo);
          const negativo = saldoNum < 0;
          return (
            <tr key={r.material_id} className="border-t border-mf-border/20">
              <td className="py-2 font-mono text-xs">{r.sku}</td>
              <td>{r.nome}</td>
              <td className="text-mf-text-secondary">{r.categoria}</td>
              <td className={`text-right ${negativo ? 'text-mf-danger' : ''}`}>
                {fmtDec(saldoNum, 3)}
              </td>
              <td className="text-right text-mf-text-secondary">
                {Number(r.estoque_minimo) > 0 ? fmtDec(Number(r.estoque_minimo), 3) : '—'}
              </td>
              <td>{r.unidade}</td>
              <td>
                {r.abaixo_minimo ? (
                  <span className="inline-block rounded bg-mf-warning/20 text-mf-warning px-2 py-0.5 text-xs font-bold">
                    abaixo do mínimo
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/components/Estoque/SaldoTable.test.tsx
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Estoque/SaldoTable.tsx frontend/src/components/Estoque/SaldoTable.test.tsx
git commit -m "feat(frontend): SaldoTable com badge 'abaixo do mínimo'"
```

---

### Task E.3: `MovimentoList` and `MovimentoFiltros`

**Files:**
- Create: `frontend/src/components/Estoque/MovimentoList.tsx`
- Create: `frontend/src/components/Estoque/MovimentoFiltros.tsx`

- [ ] **Step 1: Implement `MovimentoFiltros`**

Create `frontend/src/components/Estoque/MovimentoFiltros.tsx`:

```tsx
import type { MovimentoTipo } from '../../lib/estoque';

export interface FiltrosState {
  tipo?: MovimentoTipo | '';
  material_id?: string;
  fornecedor_id?: string;
  orcamento_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

interface Props {
  value: FiltrosState;
  onChange: (next: FiltrosState) => void;
}

const TIPOS: { value: MovimentoTipo | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'compra', label: 'Compra' },
  { value: 'ajuste_positivo', label: 'Ajuste +' },
  { value: 'saida_obra', label: 'Saída para obra' },
  { value: 'ajuste_negativo', label: 'Ajuste −' },
];

export default function MovimentoFiltros({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <label className="text-sm">
        <span className="block text-xs text-mf-text-secondary">Tipo</span>
        <select
          className="border px-2 py-1 rounded"
          value={value.tipo ?? ''}
          onChange={(e) => onChange({ ...value, tipo: e.target.value as MovimentoTipo | '' })}
        >
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-xs text-mf-text-secondary">Data inicial</span>
        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={value.data_inicio ?? ''}
          onChange={(e) => onChange({ ...value, data_inicio: e.target.value })}
        />
      </label>
      <label className="text-sm">
        <span className="block text-xs text-mf-text-secondary">Data final</span>
        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={value.data_fim ?? ''}
          onChange={(e) => onChange({ ...value, data_fim: e.target.value })}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Implement `MovimentoList`**

Create `frontend/src/components/Estoque/MovimentoList.tsx`:

```tsx
import type { Movimento } from '../../lib/estoque';

const TIPO_LABEL: Record<string, string> = {
  compra: 'Compra',
  ajuste_positivo: 'Ajuste +',
  saida_obra: 'Saída',
  ajuste_negativo: 'Ajuste −',
};

const TIPO_SIGN: Record<string, string> = {
  compra: '+',
  ajuste_positivo: '+',
  saida_obra: '−',
  ajuste_negativo: '−',
};

interface Props {
  movimentos: Movimento[];
  materialNameById: Record<string, string>;
}

export default function MovimentoList({ movimentos, materialNameById }: Props) {
  if (!movimentos.length) {
    return <p className="text-mf-text-secondary text-sm">Nenhum movimento encontrado.</p>;
  }
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="text-left text-mf-text-secondary">
        <tr>
          <th className="py-2">Data</th>
          <th>Tipo</th>
          <th>Material</th>
          <th className="text-right">Qtd.</th>
          <th>Detalhe</th>
        </tr>
      </thead>
      <tbody>
        {movimentos.map((m) => (
          <tr key={m.id} className="border-t border-mf-border/20">
            <td className="py-2">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
            <td>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
            <td>{materialNameById[m.material_id] ?? m.material_id}</td>
            <td className="text-right">{TIPO_SIGN[m.tipo]}{m.quantidade}</td>
            <td className="text-mf-text-secondary">
              {m.tipo === 'compra' && m.nota_fiscal ? `NF ${m.nota_fiscal}` : ''}
              {m.tipo === 'saida_obra' ? m.destino ?? '' : ''}
              {m.tipo.startsWith('ajuste') ? m.observacao ?? '' : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Estoque/MovimentoList.tsx frontend/src/components/Estoque/MovimentoFiltros.tsx
git commit -m "feat(frontend): MovimentoList + MovimentoFiltros"
```

---

### Task E.4: `MovimentoForm` (discriminated union, with test)

**Files:**
- Create: `frontend/src/components/Estoque/MovimentoForm.tsx`
- Create: `frontend/src/components/Estoque/MovimentoForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Estoque/MovimentoForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MovimentoForm from './MovimentoForm';

const materiais = [{ id: 'mat1', sku: 'MT-X', nome: 'Placa X' }];
const fornecedores = [{ id: 'f1', nome: 'Casa do Construtor' }];
const orcamentos = [{ id: 'o1', numero: 'ORC-1', cliente_nome: 'Cli' }];

describe('MovimentoForm', () => {
  it('shows fornecedor + preco fields when tipo=compra', () => {
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'compra' } });
    expect(screen.getByLabelText(/preço/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fornecedor/i)).toBeInTheDocument();
  });

  it('shows destino + orcamento fields when tipo=saida_obra', () => {
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'saida_obra' } });
    expect(screen.getByLabelText(/destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/orçamento/i)).toBeInTheDocument();
  });

  it('requires observacao for ajuste', () => {
    const onSubmit = vi.fn();
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'ajuste_negativo' } });
    fireEvent.change(screen.getByLabelText(/material/i), { target: { value: 'mat1' } });
    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /lançar/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/justificativa obrigatória/i)).toBeInTheDocument();
  });

  it('pre-fills destino when orcamento chosen on saida_obra', () => {
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'saida_obra' } });
    fireEvent.change(screen.getByLabelText(/orçamento/i), { target: { value: 'o1' } });
    expect((screen.getByLabelText(/destino/i) as HTMLInputElement).value).toBe('ORC-1 – Cli');
  });
});
```

- [ ] **Step 2: Implement `MovimentoForm`**

Create `frontend/src/components/Estoque/MovimentoForm.tsx`:

```tsx
import { useState } from 'react';
import type { MovimentoInput, MovimentoTipo } from '../../lib/estoque';

export interface MaterialOption { id: string; sku: string; nome: string; }
export interface FornecedorOption { id: string; nome: string; }
export interface OrcamentoOption { id: string; numero: string; cliente_nome: string; }

interface Props {
  materiais: MaterialOption[];
  fornecedores: FornecedorOption[];
  orcamentos: OrcamentoOption[];
  onSubmit: (body: MovimentoInput) => void | Promise<void>;
  submitting?: boolean;
}

export default function MovimentoForm({
  materiais, fornecedores, orcamentos, onSubmit, submitting,
}: Props) {
  const [tipo, setTipo] = useState<MovimentoTipo>('compra');
  const [materialId, setMaterialId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnit, setPrecoUnit] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [orcamentoId, setOrcamentoId] = useState('');
  const [destino, setDestino] = useState('');
  const [observacao, setObservacao] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function handleOrcamentoChange(id: string) {
    setOrcamentoId(id);
    const orc = orcamentos.find((o) => o.id === id);
    if (orc) setDestino(`${orc.numero} – ${orc.cliente_nome}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!materialId) return setErr('Selecione um material');
    if (!quantidade || Number(quantidade) <= 0) return setErr('Quantidade precisa ser > 0');

    let body: MovimentoInput;
    if (tipo === 'compra') {
      if (!precoUnit) return setErr('Preço unitário obrigatório');
      if (!fornecedorId) return setErr('Fornecedor obrigatório');
      body = {
        tipo, material_id: materialId, quantidade, preco_unitario: precoUnit,
        fornecedor_id: fornecedorId,
        nota_fiscal: notaFiscal || null, observacao: observacao || null,
      };
    } else if (tipo === 'saida_obra') {
      if (!destino) return setErr('Destino obrigatório');
      body = {
        tipo, material_id: materialId, quantidade, destino,
        orcamento_id: orcamentoId || null, observacao: observacao || null,
      };
    } else {
      if (!observacao) return setErr('Justificativa obrigatória');
      body = { tipo, material_id: materialId, quantidade, observacao };
    }
    onSubmit(body);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
      <label className="block">
        <span className="text-xs text-mf-text-secondary">Tipo</span>
        <select
          aria-label="Tipo"
          className="block w-full border rounded px-2 py-1"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as MovimentoTipo)}
        >
          <option value="compra">Compra</option>
          <option value="saida_obra">Saída para obra</option>
          <option value="ajuste_positivo">Ajuste +</option>
          <option value="ajuste_negativo">Ajuste −</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-mf-text-secondary">Material</span>
        <select
          aria-label="Material"
          className="block w-full border rounded px-2 py-1"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
        >
          <option value="">—</option>
          {materiais.map((m) => (
            <option key={m.id} value={m.id}>{m.sku} · {m.nome}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-mf-text-secondary">Quantidade</span>
        <input
          aria-label="Quantidade"
          type="number" step="0.001" min="0"
          className="block w-full border rounded px-2 py-1"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </label>

      {tipo === 'compra' && (
        <>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Preço unitário (R$)</span>
            <input
              aria-label="Preço unitário"
              type="number" step="0.01" min="0"
              className="block w-full border rounded px-2 py-1"
              value={precoUnit}
              onChange={(e) => setPrecoUnit(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Fornecedor</span>
            <select
              aria-label="Fornecedor"
              className="block w-full border rounded px-2 py-1"
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">—</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Nota fiscal (opcional)</span>
            <input
              aria-label="Nota fiscal"
              type="text"
              className="block w-full border rounded px-2 py-1"
              value={notaFiscal}
              onChange={(e) => setNotaFiscal(e.target.value)}
            />
          </label>
        </>
      )}

      {tipo === 'saida_obra' && (
        <>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Orçamento (opcional)</span>
            <select
              aria-label="Orçamento"
              className="block w-full border rounded px-2 py-1"
              value={orcamentoId}
              onChange={(e) => handleOrcamentoChange(e.target.value)}
            >
              <option value="">—</option>
              {orcamentos.map((o) => (
                <option key={o.id} value={o.id}>{o.numero} — {o.cliente_nome}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-mf-text-secondary">Destino</span>
            <input
              aria-label="Destino"
              type="text"
              className="block w-full border rounded px-2 py-1"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />
          </label>
        </>
      )}

      {(tipo === 'ajuste_positivo' || tipo === 'ajuste_negativo') && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Justificativa</span>
          <textarea
            aria-label="Justificativa"
            className="block w-full border rounded px-2 py-1"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>
      )}

      {tipo !== 'ajuste_positivo' && tipo !== 'ajuste_negativo' && (
        <label className="block">
          <span className="text-xs text-mf-text-secondary">Observação (opcional)</span>
          <textarea
            aria-label="Observação"
            className="block w-full border rounded px-2 py-1"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>
      )}

      {err && <p className="text-mf-danger text-sm">{err}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-mf-yellow text-mf-black font-bold px-4 py-2 rounded disabled:opacity-50"
      >
        Lançar movimento
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run src/components/Estoque/MovimentoForm.test.tsx
```
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Estoque/MovimentoForm.tsx frontend/src/components/Estoque/MovimentoForm.test.tsx
git commit -m "feat(frontend): MovimentoForm com discriminated union e pré-fill de destino"
```

---

### Task E.5: Fornecedor form + list

**Files:**
- Create: `frontend/src/components/Estoque/FornecedorList.tsx`
- Create: `frontend/src/components/Estoque/FornecedorForm.tsx`

- [ ] **Step 1: Implement `FornecedorForm`**

Create `frontend/src/components/Estoque/FornecedorForm.tsx`:

```tsx
import { useState } from 'react';
import type { Fornecedor, FornecedorInput } from '../../lib/estoque';

interface Props {
  initial?: Partial<Fornecedor>;
  onSubmit: (body: FornecedorInput) => void | Promise<void>;
  submitting?: boolean;
}

export default function FornecedorForm({ initial, onSubmit, submitting }: Props) {
  const [form, setForm] = useState<FornecedorInput>({
    nome: initial?.nome ?? '',
    cnpj: initial?.cnpj ?? '',
    contato_nome: initial?.contato_nome ?? '',
    contato_email: initial?.contato_email ?? '',
    contato_fone: initial?.contato_fone ?? '',
    observacao: initial?.observacao ?? '',
  });
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome?.trim()) { setErr('Nome obrigatório'); return; }
    setErr(null);
    onSubmit({
      ...form,
      cnpj: form.cnpj || null,
      contato_email: form.contato_email || null,
      contato_fone: form.contato_fone || null,
      contato_nome: form.contato_nome || null,
      observacao: form.observacao || null,
    });
  }

  function bind<K extends keyof FornecedorInput>(key: K) {
    return {
      value: (form[key] as string | null) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-xl">
      <label className="block"><span className="text-xs">Nome *</span>
        <input aria-label="Nome" className="block w-full border rounded px-2 py-1" {...bind('nome')} />
      </label>
      <label className="block"><span className="text-xs">CNPJ</span>
        <input aria-label="CNPJ" className="block w-full border rounded px-2 py-1" {...bind('cnpj')} />
      </label>
      <label className="block"><span className="text-xs">Contato – nome</span>
        <input className="block w-full border rounded px-2 py-1" {...bind('contato_nome')} />
      </label>
      <label className="block"><span className="text-xs">Contato – email</span>
        <input type="email" className="block w-full border rounded px-2 py-1" {...bind('contato_email')} />
      </label>
      <label className="block"><span className="text-xs">Contato – telefone</span>
        <input className="block w-full border rounded px-2 py-1" {...bind('contato_fone')} />
      </label>
      <label className="block"><span className="text-xs">Observação</span>
        <textarea className="block w-full border rounded px-2 py-1" {...bind('observacao')} />
      </label>
      {err && <p className="text-mf-danger text-sm">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-mf-yellow text-mf-black font-bold px-4 py-2 rounded disabled:opacity-50"
      >Salvar</button>
    </form>
  );
}
```

- [ ] **Step 2: Implement `FornecedorList`**

Create `frontend/src/components/Estoque/FornecedorList.tsx`:

```tsx
import type { Fornecedor } from '../../lib/estoque';

interface Props {
  fornecedores: Fornecedor[];
  onEdit: (f: Fornecedor) => void;
  onDeactivate: (f: Fornecedor) => void;
}

export default function FornecedorList({ fornecedores, onEdit, onDeactivate }: Props) {
  if (!fornecedores.length) {
    return <p className="text-mf-text-secondary text-sm">Nenhum fornecedor cadastrado.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-mf-text-secondary">
        <tr>
          <th className="py-2">Nome</th>
          <th>CNPJ</th>
          <th>Contato</th>
          <th>Telefone</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {fornecedores.map((f) => (
          <tr key={f.id} className="border-t border-mf-border/20">
            <td className="py-2">{f.nome}</td>
            <td>{f.cnpj ?? '—'}</td>
            <td>{f.contato_nome ?? '—'} {f.contato_email ? `(${f.contato_email})` : ''}</td>
            <td>{f.contato_fone ?? '—'}</td>
            <td className="text-right space-x-2">
              <button className="text-mf-text-ink underline" onClick={() => onEdit(f)}>editar</button>
              {f.ativo && (
                <button className="text-mf-danger underline" onClick={() => onDeactivate(f)}>desativar</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Estoque/FornecedorList.tsx frontend/src/components/Estoque/FornecedorForm.tsx
git commit -m "feat(frontend): FornecedorList + FornecedorForm"
```

---

### Task E.6: `FabricacaoPicker` + `FabricacaoAnalise` (with test)

**Files:**
- Create: `frontend/src/components/Estoque/FabricacaoPicker.tsx`
- Create: `frontend/src/components/Estoque/FabricacaoAnalise.tsx`
- Create: `frontend/src/components/Estoque/FabricacaoAnalise.test.tsx`

- [ ] **Step 1: Implement `FabricacaoPicker`**

Create `frontend/src/components/Estoque/FabricacaoPicker.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';

export interface OrcamentoOption {
  id: string;
  numero: string;
  cliente_nome: string;
  status: string;
}

interface Props {
  orcamentos: OrcamentoOption[];
}

export default function FabricacaoPicker({ orcamentos }: Props) {
  const nav = useNavigate();
  return (
    <div>
      <p className="text-sm text-mf-text-secondary mb-3">
        Escolha um orçamento para ver quais materiais faltam para fabricar.
      </p>
      <ul className="divide-y divide-mf-border/20">
        {orcamentos.map((o) => (
          <li key={o.id} className="py-2 flex justify-between items-center">
            <div>
              <div className="font-mono text-xs">{o.numero}</div>
              <div>{o.cliente_nome}</div>
              <div className="text-xs text-mf-text-secondary">{o.status}</div>
            </div>
            <button
              className="bg-mf-yellow text-mf-black px-3 py-1 rounded text-sm font-bold"
              onClick={() => nav(`/admin/estoque/fabricacao/${o.id}`)}
            >Analisar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Write failing test for `FabricacaoAnalise`**

Create `frontend/src/components/Estoque/FabricacaoAnalise.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FabricacaoAnalise from './FabricacaoAnalise';
import type { FabricacaoAnalise as Analise } from '../../lib/estoque';

const data: Analise = {
  orcamento_id: 'o1',
  orcamento_numero: 'ORC-2026-0001',
  cliente_nome: 'Tatuí',
  produto_nome: 'Farmácia Express 3×6',
  itens: [
    {
      material_id: 'm1', sku: 'MT-FCH-001', nome: 'Placa', unidade: 'pc',
      necessario: '28', saldo_atual: '23', falta: '5', status: 'faltante',
      preco_unitario: '219.90', custo_reposicao_linha: '1099.50',
    },
    {
      material_id: 'm2', sku: 'MT-LSF-001', nome: 'Perfil', unidade: 'kg',
      necessario: '100', saldo_atual: '200', falta: '0', status: 'suficiente',
      preco_unitario: '14.00', custo_reposicao_linha: '0',
    },
  ],
  totais: { itens_total: 2, itens_faltantes: 1, custo_reposicao: '1099.50' },
};

describe('FabricacaoAnalise', () => {
  it('renders orcamento number and both lines', () => {
    render(<FabricacaoAnalise analise={data} />);
    expect(screen.getByText(/ORC-2026-0001/)).toBeInTheDocument();
    expect(screen.getByText('MT-FCH-001')).toBeInTheDocument();
    expect(screen.getByText('MT-LSF-001')).toBeInTheDocument();
  });

  it('marks faltante line visibly', () => {
    render(<FabricacaoAnalise analise={data} />);
    const row = screen.getByText('MT-FCH-001').closest('tr')!;
    expect(row.className).toMatch(/faltante|bg-mf-warning|bg-mf-danger/);
  });

  it('shows totals in footer', () => {
    render(<FabricacaoAnalise analise={data} />);
    expect(screen.getByText(/1.*faltantes/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement `FabricacaoAnalise`**

Create `frontend/src/components/Estoque/FabricacaoAnalise.tsx`:

```tsx
import type { FabricacaoAnalise as Analise } from '../../lib/estoque';

interface Props { analise: Analise; }

export default function FabricacaoAnalise({ analise }: Props) {
  const moeda = (v: string) =>
    Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-bold">Análise de fabricação</h2>
        <p className="text-sm text-mf-text-secondary">
          {analise.orcamento_numero} · {analise.cliente_nome} · {analise.produto_nome}
        </p>
      </header>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-mf-text-secondary">
          <tr>
            <th className="py-2">SKU</th>
            <th>Material</th>
            <th className="text-right">Necessário</th>
            <th className="text-right">Saldo</th>
            <th className="text-right">Falta</th>
            <th className="text-right">Custo reposição</th>
          </tr>
        </thead>
        <tbody>
          {analise.itens.map((l) => {
            const isFalta = l.status === 'faltante';
            return (
              <tr
                key={l.material_id}
                className={`border-t border-mf-border/20 ${isFalta ? 'faltante bg-mf-warning/10' : ''}`}
              >
                <td className="py-2 font-mono text-xs">{l.sku}</td>
                <td>{l.nome}</td>
                <td className="text-right">{l.necessario}</td>
                <td className="text-right">{l.saldo_atual}</td>
                <td className={`text-right ${isFalta ? 'font-bold text-mf-danger' : ''}`}>{l.falta}</td>
                <td className="text-right">{isFalta ? `R$ ${moeda(l.custo_reposicao_linha)}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-mf-border/40">
          <tr>
            <td colSpan={4} className="py-2 text-right text-mf-text-secondary">
              {analise.totais.itens_faltantes} de {analise.totais.itens_total} itens faltantes
            </td>
            <td></td>
            <td className="text-right font-bold">R$ {moeda(analise.totais.custo_reposicao)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/components/Estoque/FabricacaoAnalise.test.tsx
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Estoque/FabricacaoPicker.tsx \
        frontend/src/components/Estoque/FabricacaoAnalise.tsx \
        frontend/src/components/Estoque/FabricacaoAnalise.test.tsx
git commit -m "feat(frontend): FabricacaoPicker + FabricacaoAnalise"
```

---

## Phase F — Frontend pages, routing, dashboard integration

### Task F.1: `AdminEstoqueLayout` + sub-route pages (saldo, movimentos, fornecedores)

**Files:**
- Create: `frontend/src/pages/admin/AdminEstoqueLayout.tsx`
- Create: `frontend/src/pages/admin/AdminEstoqueSaldo.tsx`
- Create: `frontend/src/pages/admin/AdminEstoqueMovimentos.tsx`
- Create: `frontend/src/pages/admin/AdminEstoqueFornecedores.tsx`

- [ ] **Step 1: Layout shell**

Create `frontend/src/pages/admin/AdminEstoqueLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import EstoqueNav from '../../components/Estoque/EstoqueNav';

export default function AdminEstoqueLayout() {
  return (
    <section>
      <h1 className="text-xl font-bold mb-4">Estoque</h1>
      <EstoqueNav />
      <Outlet />
    </section>
  );
}
```

- [ ] **Step 2: Saldo page**

Create `frontend/src/pages/admin/AdminEstoqueSaldo.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { estoqueApi, type SaldoRow } from '../../lib/estoque';
import SaldoTable from '../../components/Estoque/SaldoTable';

export default function AdminEstoqueSaldo() {
  const fetchApi = useAuthedFetch();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<SaldoRow[] | null>(null);
  const [q, setQ] = useState(params.get('q') ?? '');
  const abaixoMinimo = params.get('abaixo_minimo') === 'true';

  useEffect(() => {
    setRows(null);
    estoqueApi.listSaldo(fetchApi, { abaixoMinimo, q: q || undefined }).then(setRows);
  }, [abaixoMinimo, q]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="Buscar por SKU ou nome"
          className="border rounded px-2 py-1 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={abaixoMinimo}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.checked) next.set('abaixo_minimo', 'true');
              else next.delete('abaixo_minimo');
              setParams(next);
            }}
          />
          Só abaixo do mínimo
        </label>
      </div>
      {rows === null ? <p>Carregando…</p> : <SaldoTable rows={rows} />}
    </div>
  );
}
```

- [ ] **Step 3: Movimentos page**

Create `frontend/src/pages/admin/AdminEstoqueMovimentos.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import {
  estoqueApi, fornecedorApi,
  type Movimento, type MovimentoInput,
} from '../../lib/estoque';
import MovimentoFiltros, { type FiltrosState } from '../../components/Estoque/MovimentoFiltros';
import MovimentoList from '../../components/Estoque/MovimentoList';
import MovimentoForm from '../../components/Estoque/MovimentoForm';

interface MaterialLite { id: string; sku: string; nome: string; }
interface OrcamentoLite { id: string; numero: string; cliente_nome: string; }

export default function AdminEstoqueMovimentos() {
  const fetchApi = useAuthedFetch();
  const [filtros, setFiltros] = useState<FiltrosState>({});
  const [movimentos, setMovimentos] = useState<Movimento[] | null>(null);
  const [materiais, setMateriais] = useState<MaterialLite[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoLite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const materialNameById = useMemo(
    () => Object.fromEntries(materiais.map((m) => [m.id, `${m.sku} · ${m.nome}`])),
    [materiais],
  );

  async function reload() {
    const apiFilters = {
      tipo: filtros.tipo || undefined,
      data_inicio: filtros.data_inicio || undefined,
      data_fim: filtros.data_fim || undefined,
    };
    setMovimentos(await estoqueApi.listMovimentos(fetchApi, apiFilters));
  }

  useEffect(() => {
    (async () => {
      const [mats, forns, orcs] = await Promise.all([
        fetchApi<MaterialLite[]>('/api/material'),
        fornecedorApi.list(fetchApi),
        fetchApi<OrcamentoLite[]>('/api/quote'),
      ]);
      setMateriais(mats);
      setFornecedores(forns.map((f) => ({ id: f.id, nome: f.nome })));
      setOrcamentos(orcs);
    })();
  }, []);

  useEffect(() => { reload(); }, [filtros.tipo, filtros.data_inicio, filtros.data_fim]);

  async function handleCreate(body: MovimentoInput) {
    setSubmitting(true);
    try {
      await estoqueApi.createMovimento(fetchApi, body);
      setShowForm(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <MovimentoFiltros value={filtros} onChange={setFiltros} />
        <button
          className="bg-mf-yellow text-mf-black font-bold px-3 py-1 rounded text-sm"
          onClick={() => setShowForm((s) => !s)}
        >{showForm ? 'Cancelar' : 'Novo movimento'}</button>
      </div>
      {showForm && (
        <div className="mb-6 p-4 bg-white rounded shadow-sm">
          <MovimentoForm
            materiais={materiais}
            fornecedores={fornecedores}
            orcamentos={orcamentos}
            onSubmit={handleCreate}
            submitting={submitting}
          />
        </div>
      )}
      {movimentos === null
        ? <p>Carregando…</p>
        : <MovimentoList movimentos={movimentos} materialNameById={materialNameById} />}
    </div>
  );
}
```

- [ ] **Step 4: Fornecedores page**

Create `frontend/src/pages/admin/AdminEstoqueFornecedores.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fornecedorApi, type Fornecedor, type FornecedorInput } from '../../lib/estoque';
import FornecedorList from '../../components/Estoque/FornecedorList';
import FornecedorForm from '../../components/Estoque/FornecedorForm';

export default function AdminEstoqueFornecedores() {
  const fetchApi = useAuthedFetch();
  const [rows, setRows] = useState<Fornecedor[] | null>(null);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    setRows(await fornecedorApi.list(fetchApi));
  }

  useEffect(() => { reload(); }, []);

  async function save(body: FornecedorInput) {
    setSubmitting(true);
    try {
      if (editing) await fornecedorApi.update(fetchApi, editing.id, body);
      else await fornecedorApi.create(fetchApi, body);
      setEditing(null);
      setShowForm(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(f: Fornecedor) {
    if (!confirm(`Desativar "${f.nome}"?`)) return;
    await fornecedorApi.deactivate(fetchApi, f.id);
    await reload();
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          className="bg-mf-yellow text-mf-black font-bold px-3 py-1 rounded text-sm"
          onClick={() => { setEditing(null); setShowForm((s) => !s); }}
        >{showForm ? 'Cancelar' : 'Novo fornecedor'}</button>
      </div>
      {(showForm || editing) && (
        <div className="mb-6 p-4 bg-white rounded shadow-sm">
          <FornecedorForm
            initial={editing ?? undefined}
            onSubmit={save}
            submitting={submitting}
          />
        </div>
      )}
      {rows === null
        ? <p>Carregando…</p>
        : <FornecedorList
            fornecedores={rows}
            onEdit={(f) => { setEditing(f); setShowForm(true); }}
            onDeactivate={deactivate}
          />}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/AdminEstoqueLayout.tsx \
        frontend/src/pages/admin/AdminEstoqueSaldo.tsx \
        frontend/src/pages/admin/AdminEstoqueMovimentos.tsx \
        frontend/src/pages/admin/AdminEstoqueFornecedores.tsx
git commit -m "feat(frontend): páginas /admin/estoque (layout, saldo, movimentos, fornecedores)"
```

---

### Task F.2: Fabricação picker and detail pages

**Files:**
- Create: `frontend/src/pages/admin/AdminEstoqueFabricacaoPicker.tsx`
- Create: `frontend/src/pages/admin/AdminEstoqueFabricacao.tsx`

- [ ] **Step 1: Picker page**

Create `frontend/src/pages/admin/AdminEstoqueFabricacaoPicker.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import FabricacaoPicker, { type OrcamentoOption } from '../../components/Estoque/FabricacaoPicker';

export default function AdminEstoqueFabricacaoPicker() {
  const fetchApi = useAuthedFetch();
  const [orcs, setOrcs] = useState<OrcamentoOption[] | null>(null);

  useEffect(() => {
    fetchApi<OrcamentoOption[]>('/api/quote').then((xs) => {
      const filtered = xs.filter((o) => ['aprovado', 'enviado'].includes(o.status));
      setOrcs(filtered.length ? filtered : xs);
    });
  }, []);

  if (orcs === null) return <p>Carregando…</p>;
  return <FabricacaoPicker orcamentos={orcs} />;
}
```

- [ ] **Step 2: Detail page**

Create `frontend/src/pages/admin/AdminEstoqueFabricacao.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { estoqueApi, type FabricacaoAnalise as Analise } from '../../lib/estoque';
import FabricacaoAnalise from '../../components/Estoque/FabricacaoAnalise';

export default function AdminEstoqueFabricacao() {
  const fetchApi = useAuthedFetch();
  const { orcamento_id } = useParams<{ orcamento_id: string }>();
  const [analise, setAnalise] = useState<Analise | null>(null);

  useEffect(() => {
    if (!orcamento_id) return;
    estoqueApi.analiseFabricacao(fetchApi, orcamento_id).then(setAnalise);
  }, [orcamento_id]);

  if (!analise) return <p>Carregando…</p>;
  return <FabricacaoAnalise analise={analise} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminEstoqueFabricacaoPicker.tsx \
        frontend/src/pages/admin/AdminEstoqueFabricacao.tsx
git commit -m "feat(frontend): fabricação picker + detail"
```

---

### Task F.3: Wire routes and add "Estoque" to top nav

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/admin/AdminLayout.tsx`

- [ ] **Step 1: Update `App.tsx` routes**

Edit `frontend/src/App.tsx`. Add imports:

```tsx
import AdminEstoqueLayout from './pages/admin/AdminEstoqueLayout';
import AdminEstoqueSaldo from './pages/admin/AdminEstoqueSaldo';
import AdminEstoqueMovimentos from './pages/admin/AdminEstoqueMovimentos';
import AdminEstoqueFornecedores from './pages/admin/AdminEstoqueFornecedores';
import AdminEstoqueFabricacaoPicker from './pages/admin/AdminEstoqueFabricacaoPicker';
import AdminEstoqueFabricacao from './pages/admin/AdminEstoqueFabricacao';
import { Navigate } from 'react-router-dom';
```

Add nested routes inside the admin block. Full route tree becomes:

```tsx
<Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
  <Route index element={<AdminDashboard />} />
  <Route path="orcamentos" element={<AdminOrcamentos />} />
  <Route path="orcamento/new" element={<AdminOrcamentoNew />} />
  <Route path="orcamento/:id" element={<AdminOrcamentoDetail />} />
  <Route path="produtos" element={<AdminProdutos />} />
  <Route path="materiais" element={<AdminMateriais />} />
  <Route path="estoque" element={<AdminEstoqueLayout />}>
    <Route index element={<Navigate to="saldo" replace />} />
    <Route path="saldo" element={<AdminEstoqueSaldo />} />
    <Route path="movimentos" element={<AdminEstoqueMovimentos />} />
    <Route path="fornecedores" element={<AdminEstoqueFornecedores />} />
    <Route path="fabricacao" element={<AdminEstoqueFabricacaoPicker />} />
    <Route path="fabricacao/:orcamento_id" element={<AdminEstoqueFabricacao />} />
  </Route>
</Route>
```

- [ ] **Step 2: Add "Estoque" NavLink in `AdminLayout.tsx`**

Edit `frontend/src/pages/admin/AdminLayout.tsx` — add a `NavLink` after "Materiais":

```tsx
<NavLink to="/admin/estoque" className={linkClass}>Estoque</NavLink>
```

- [ ] **Step 3: Smoke-test the routes in dev**

Start `make dev` if not already running. In a browser:
1. Go to `http://localhost:5173/admin/login`, sign in as admin.
2. Click "Estoque" → should land on `/admin/estoque/saldo` with the table populated.
3. Try each sub-tab; try `?abaixo_minimo=true`.
4. Open `/admin/estoque/fabricacao` and pick a seed orçamento → analysis renders.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/admin/AdminLayout.tsx
git commit -m "feat(frontend): rotas /admin/estoque/* + link no top nav"
```

---

### Task F.4: Dashboard cards — "abaixo do mínimo" + "últimos movimentos"

**Files:**
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Read existing dashboard**

```bash
cat frontend/src/pages/admin/AdminDashboard.tsx
```
Note the current structure. The edit below adds two cards; preserve the existing content.

- [ ] **Step 2: Add stock cards**

Near the top of the dashboard JSX (before any existing cards), add:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthedFetch } from '../../lib/auth';
import { estoqueApi, type SaldoRow, type Movimento } from '../../lib/estoque';

// inside component (the existing component already calls useAuthedFetch()).
// If it doesn't, add this line at the top of the component body:
const fetchApi = useAuthedFetch();

const [lowCount, setLowCount] = useState<number | null>(null);
const [lastMovs, setLastMovs] = useState<Movimento[]>([]);

useEffect(() => {
  estoqueApi.listSaldo(fetchApi, { abaixoMinimo: true })
    .then((r: SaldoRow[]) => setLowCount(r.length));
  estoqueApi.listMovimentos(fetchApi, { limit: 5 }).then(setLastMovs);
}, []);
```

Add two cards in the dashboard body:

```tsx
<section className="grid md:grid-cols-2 gap-4 mb-6">
  <Link to="/admin/estoque/saldo?abaixo_minimo=true"
        className="block bg-white rounded shadow-sm p-4 hover:ring-2 hover:ring-mf-yellow">
    <div className="text-xs text-mf-text-secondary">Estoque</div>
    <div className="text-3xl font-extrabold">{lowCount ?? '—'}</div>
    <div className="text-sm text-mf-text-secondary">
      {lowCount === 1 ? 'material abaixo do mínimo' : 'materiais abaixo do mínimo'}
    </div>
  </Link>
  <Link to="/admin/estoque/movimentos"
        className="block bg-white rounded shadow-sm p-4 hover:ring-2 hover:ring-mf-yellow">
    <div className="text-xs text-mf-text-secondary">Últimos movimentos</div>
    <ul className="mt-2 text-sm space-y-1">
      {lastMovs.length
        ? lastMovs.map((m) => (
            <li key={m.id} className="truncate">
              <span className="text-mf-text-secondary">{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>{' '}
              <strong className="capitalize">{m.tipo.replace('_', ' ')}</strong>{' '}
              · {m.quantidade}
            </li>
          ))
        : <li className="text-mf-text-secondary">nenhum</li>}
    </ul>
  </Link>
</section>
```

Adjust imports/component signature as needed so the file keeps a single default export.

- [ ] **Step 3: Verify in browser**

Refresh `/admin`. Both cards appear and click-through to the right pages. Expected: "1 material abaixo do mínimo" (Placa Glasroc-X after seed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "feat(frontend): cards de estoque (abaixo do minimo + ultimos movimentos) no dashboard"
```

---

### Task F.5: "Análise de fabricação" shortcut on orçamento detail

**Files:**
- Modify: `frontend/src/pages/admin/AdminOrcamentoDetail.tsx`

- [ ] **Step 1: Read the file**

```bash
cat frontend/src/pages/admin/AdminOrcamentoDetail.tsx
```

- [ ] **Step 2: Add the button**

In the header region of `AdminOrcamentoDetail.tsx`, alongside existing action buttons (e.g. "Gerar PDF"), add:

```tsx
import { Link } from 'react-router-dom';
// …
<Link
  to={`/admin/estoque/fabricacao/${orcamento.id}`}
  className="bg-mf-black text-white px-3 py-1 rounded text-sm font-bold"
>Análise de fabricação</Link>
```

(Use the variable name for the orçamento that already exists in the file — often `orc` or `orcamento`. If the variable can be `null`, guard the Link behind a null check.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminOrcamentoDetail.tsx
git commit -m "feat(frontend): botão 'Análise de fabricação' no detalhe do orçamento"
```

---

### Task F.6: Materiais page — add `estoque_minimo` input

**Files:**
- Modify: `frontend/src/pages/admin/AdminMateriais.tsx`

- [ ] **Step 1: Read the file and find the material edit form**

```bash
cat frontend/src/pages/admin/AdminMateriais.tsx
```
Locate where material fields (`nome`, `sku`, `preco_unitario`, etc.) are rendered.

- [ ] **Step 2: Add the `estoque_minimo` number input**

Next to `preco_unitario`, add an input bound to the same local state machinery. Typical pattern in this file is an inline edit per row or a modal — replicate whichever exists. Example for an inline cell:

```tsx
<td>
  <input
    type="number" step="0.001" min="0"
    value={row.estoque_minimo ?? 0}
    onChange={(e) => patch(row.id, { estoque_minimo: Number(e.target.value) })}
    className="border rounded px-2 py-1 w-24"
  />
</td>
```

Add a matching `<th>Mínimo</th>` to the table header if applicable. Make sure the PATCH request sends `estoque_minimo` through — the router whitelist from Task C.3 accepts it.

- [ ] **Step 3: Verify in browser**

In `/admin/materiais`, change a material's minimum; reload `/admin/estoque/saldo`; confirm the new value is reflected and the "abaixo do mínimo" badge recomputes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminMateriais.tsx
git commit -m "feat(frontend): materiais aceita editar estoque_minimo"
```

---

## Phase G — E2E, CI, README, finish

### Task G.1: Playwright e2e — compra → saldo

**Files:**
- Create: `frontend/e2e/estoque-flow.spec.ts`

- [ ] **Step 1: Read existing e2e for pattern**

```bash
cat frontend/e2e/public-flow.spec.ts | head -40
cat frontend/playwright.config.ts
```
Note how they launch dev server / sign in.

- [ ] **Step 2: Write the spec**

Create `frontend/e2e/estoque-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// Prereqs: make dev is running, make seed applied, admin@metalfort.tech exists.

test('admin lança compra e saldo sobe', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@metalfort.tech');
  await page.fill('input[type="password"]', 'metalfort2026!');
  await page.click('button[type="submit"]');

  await page.goto('/admin/estoque/saldo');
  const firstRowSaldoBefore = await page.locator('tbody tr').first().locator('td').nth(3).innerText();

  await page.goto('/admin/estoque/movimentos');
  await page.click('text=Novo movimento');
  await page.selectOption('label:has-text("Tipo") select', 'compra');
  await page.selectOption('label:has-text("Material") select', { index: 1 });
  await page.fill('label:has-text("Quantidade") input', '5');
  await page.fill('label:has-text("Preço unitário") input', '10');
  await page.selectOption('label:has-text("Fornecedor") select', { index: 1 });
  await page.click('button:has-text("Lançar movimento")');

  await expect(page.locator('text=Lançar movimento')).toHaveCount(0);
  // saldo page: first row saldo should have increased
  await page.goto('/admin/estoque/saldo');
  const firstRowSaldoAfter = await page.locator('tbody tr').first().locator('td').nth(3).innerText();
  expect(Number(firstRowSaldoAfter.replace(/\./g, '').replace(',', '.')))
    .toBeGreaterThan(Number(firstRowSaldoBefore.replace(/\./g, '').replace(',', '.')));
});

test('análise de fabricação mostra item faltante após seed', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@metalfort.tech');
  await page.fill('input[type="password"]', 'metalfort2026!');
  await page.click('button[type="submit"]');

  await page.goto('/admin/estoque/fabricacao');
  await page.click('button:has-text("Analisar")');
  await expect(page.locator('text=Análise de fabricação')).toBeVisible();
});
```

- [ ] **Step 3: Run the spec**

```bash
cd frontend && npm run test:e2e
```
Expected: both tests pass. (If `make dev` is not running, start it first.)

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/estoque-flow.spec.ts
git commit -m "test(e2e): fluxo de compra e analise de fabricacao"
```

---

### Task G.2: GitHub Actions — run new backend tests

**Files:**
- Modify: `.github/workflows/ci.yml` (or existing workflow file)

- [ ] **Step 1: Inspect the current workflow**

```bash
ls .github/workflows/
cat .github/workflows/ci.yml
```

- [ ] **Step 2: Verify onda-2 tests are covered**

The existing `pytest` step should pick up `test_models_estoque.py` and `test_estoque_service.py` automatically (no filter). Confirm by looking at the step — if it runs `uv run pytest` with no `-k` filter, it's fine.

If the workflow filters paths (e.g., `pytest backend/tests/test_quote_calculator.py`), widen it to run the whole `backend/tests/` folder.

- [ ] **Step 3: Exclude integration tests in CI**

Integration tests from Task C.4 are gated by `RUN_INTEGRATION=1`. CI does not set it — they skip cleanly. Confirm by grep:

```bash
grep -n RUN_INTEGRATION backend/tests/test_estoque_api.py
```
Expected: one match, the `skipif`.

- [ ] **Step 4: Commit if the workflow changed**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: ensure onda2 backend tests run"
```
(Skip commit if no changes were needed.)

---

### Task G.3: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

```bash
cat README.md
```

- [ ] **Step 2: Add an "Onda 2 — Estoque" section**

Append under the existing "Próximas ondas" / wave sections:

```markdown
## Onda 2 — Controle de Estoque

Adicionada em 2026-04. Admin-only.

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
make dev        # sobe tudo
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

### Fora do escopo (onda 3+)

Modelo de obra, múltiplos galpões, recebimento parcial, custo médio, notas fiscais XML.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): seção Onda 2 — Estoque"
```

---

### Task G.4: Final smoke test + finish branch

**Files:** none (verification only)

- [ ] **Step 1: Rebuild everything from scratch to confirm clean state**

```bash
make migrate
make seed
make test
```
Expected: migrations apply cleanly, seed inserts without errors, full test suite green.

- [ ] **Step 2: Start fresh dev and exercise each sub-tab manually**

```bash
make dev
```
In browser, walk through:
1. `/admin/estoque/saldo` with and without the "só abaixo" filter.
2. `/admin/estoque/movimentos` with each movement type.
3. `/admin/estoque/fornecedores` create/edit/deactivate.
4. `/admin/estoque/fabricacao` → pick orçamento → analysis renders.
5. `/admin/orcamento/:id` → "Análise de fabricação" button works.
6. `/admin/materiais` edit `estoque_minimo` → saldo page reflects.
7. Dashboard cards show correct counts and link through.

- [ ] **Step 3: Run e2e again for regression**

```bash
cd frontend && npm run test:e2e
```
Expected: all specs green (public-flow from onda 1 + estoque-flow from onda 2).

- [ ] **Step 4: Review git log**

```bash
git log --oneline main..HEAD
```
Expected: a clean sequence of commits, one per task, no noise.

- [ ] **Step 5: Decide on merge strategy**

Options:
- **Merge now** (trusted single-dev repo, mirrors onda 1 approach):
  ```bash
  git checkout main
  git merge --no-ff feat/onda2-estoque -m "Merge branch 'feat/onda2-estoque' (Onda 2 - Estoque)"
  ```
- **Open PR** (if reviewing with someone):
  ```bash
  git push -u origin feat/onda2-estoque
  gh pr create --title "Onda 2 — Controle de Estoque" --body "$(cat <<'EOF'
  ## Summary
  - Append-only ledger (`estoque_movimento`) + computed view for saldo
  - Fornecedor mini-CRUD, estoque_minimo per material, análise de fabricação
  - Admin-only RLS; reuses onda 1 auth and BOM snapshot

  ## Test plan
  - [ ] `make migrate && make seed && make test`
  - [ ] `/admin/estoque/*` all tabs reachable
  - [ ] Launch a compra and watch saldo update
  - [ ] Open análise de fabricação on a seeded orçamento
  EOF
  )"
  ```

Commit merge or wait for PR review — whichever the user prefers.

---

## Spec Coverage Checklist (done implicitly via the tasks above)

| Spec requirement | Where it's implemented |
|---|---|
| `estoque_minimo` column on `material` | A.1, C.3, F.6 |
| `fornecedor` table + RLS | A.1, C.1 |
| `estoque_movimento` append-only + CHECKs | A.1 |
| `estoque_saldo_v` view | A.1 |
| Admin-only RLS | A.1 |
| Seed updates (fornecedores, minimums, movimentos) | A.2 |
| Pydantic discriminated union | B.1 |
| Saldo + fabricação services (TDD) | B.2 |
| `/api/fornecedor` CRUD | C.1 |
| `/api/estoque/saldo[/...]` | C.2 |
| `/api/estoque/movimento` (GET/POST/GET:id) | C.2 |
| `/api/estoque/fabricacao/:id` | C.2 |
| Integration tests (role-gating, CHECKs) | C.4 |
| TS types + API client | D.1 |
| `EstoqueNav` | E.1 |
| `SaldoTable` + test | E.2 |
| `MovimentoList` + filtros | E.3 |
| `MovimentoForm` (discriminated + pré-fill destino) | E.4 |
| Fornecedor list/form | E.5 |
| Fabricação picker + analise + test | E.6 |
| `/admin/estoque/*` routes + top nav | F.1, F.2, F.3 |
| Dashboard cards | F.4 |
| Análise de fabricação shortcut | F.5 |
| Materiais edits `estoque_minimo` | F.6 |
| E2E: compra → saldo, análise de fabricação | G.1 |
| CI covers new tests | G.2 |
| README updated | G.3 |
| Final smoke + finish branch | G.4 |
