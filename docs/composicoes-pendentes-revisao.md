# Composições — pontos pendentes de revisão com o Samuel

Este documento é **pauta de conversa**, não decisão tomada. Lista pontos onde a
modelagem da planilha v3 levanta dúvidas que precisam ser confirmadas antes de
qualquer correção. **Nada aqui foi mudado no ERP** — está congelado no estado
da v3 até o Samuel revisar.

Contexto da decisão de não-corrigir-agora: ver
[Decisão 9 em `regras-de-negocio.md`](regras-de-negocio.md#decisão-9--hipótese-de-modelagem-de-mo-da-planilha-samuel-validar-com-samuel).

---

## Bloco 1 — Mão-de-obra com nomes que parecem "ofício específico" mas uso cruzado ✅ RESOLVIDO 2026-05-12

**Resolução**: Samuel confirmou em 2026-05-12 que `CF006SF002` foi escolhido por
valor equivalente (R$ 40 = tier básico), independente do nome cadastrado. A
hipótese de "tiers de complexidade" (Básico R$40 / Complexo R$60 / Forro R$75)
está correta — o Samuel pensa em faixa de valor por m², não em operação literal
do que está escrito no nome do item.

### Sub-pendência aberta (dívida técnica, não bloqueia)

**Renomear ou criar itens de MO com nomes que reflitam tiers explicitamente**,
ex.: "MO LSF tier básico R$40/m²", "MO LSF tier complexo R$60/m²". Hoje os
nomes (`MONTAR PAINEL SIMPLES UE 90`, `INSTALAR PLACAS CIMENTÍCIAS` etc.) são
enganosos porque o uso é por valor, não por operação. Renomear deixa a
intenção explícita pra quem ler o catálogo no futuro.

**Não fazer agora** — é cosmético e o ERP funciona corretamente como está. Fica
como tech debt registrada aqui pra ser tratada num ciclo futuro de polimento
de catálogo (junto com perguntas remanescentes sobre CF006SF004 R$55 e
CF006SF008 R$700, que continuam sem uso e ainda merecem clarificação).

### Snapshot histórico (estado quando a pendência foi levantada)

Tabela original com 4 dos 9 vínculos usando CF006 com nome incoerente:

| Composição | Item MO usado | Nome cadastrado | R$/m² | Coerente? |
|---|---|---|---|---|
| COMP00001 LSF UE 90 simples | CF006SF001 | "MONTAR PAINEL SIMPLES UE 90" | 40 | ✅ |
| COMP00002 LSF UE 300 piso | CF006SF002 | "INSTALAR PLACAS CIMENTÍCIAS" | 40 | ⚠️ |
| COMP00003 LSF 2UE 90 cobertura | CF006SF003 | "MONTAR PAINEL SIMPLES UE 300" | 60 | ⚠️ |
| COMP00004 TRELIÇAS E PILARES | CF006SF003 | "MONTAR PAINEL SIMPLES UE 300" | 60 | ⚠️ |
| COMP00005-09 | CF006SF005-007 | nomes batem | 60-75 | ✅ |

Órfãos remanescentes (cadastrados mas sem composição): `CF006SF004` R$55 e
`CF006SF008` R$700 — uso ainda indefinido, deixados como biblioteca.

---

## Bloco 2 — COMP00008 com soma divergente da planilha

Custo total na planilha v3: **R$ 374,12**.
Custo recalculado pelo ERP a partir do catálogo atual: **R$ 434,12**.
Diferença: **+R$ 60**.

### Causa identificada

Na planilha, a linha de MO da COMP00008 tem `qtd=1`, `custo_un=R$60`, mas a
célula `custo_total` da linha **está vazia**. A soma da planilha (R$ 374,12)
omite a MO; o nome da composição (`MT MO+INS PLACA CIMENTÍCIA 1200X2400X20MM`)
diz que MO entra. ERP usa o cálculo correto (com MO), divergindo em R$ 60.

### Pergunta pra Samuel

- A célula custo_total da MO da COMP00008 está vazia por **erro** (esqueceu de
  preencher) ou **intencional** (algum motivo de não cobrar MO nessa linha)?

Se for erro: planilha v3 tem R$ 60 a menos que deveria; ERP já está correto.
Se for intencional: ERP precisa filtrar essa MO específica em COMP00008.

---

## Bloco 4 — Volume e tipo de concreto da fundação (assumido sem confirmar)

Quando admin marca `incluir_fundacao=true` no novo orçamento, o ERP hoje aplica:
- **Concreto**: COMP00020 (Concreto C20)
- **Volume**: `area_planta_m2 × 0,10 m` (ou seja, 10 cm de espessura)

Decisão **assumida**, não confirmada com Samuel. Em obra Metalfort 3×6 (18 m²), isso
dá 1,8 m³ de concreto C20 + agregados + água, total ≈ R$ 843.

### Perguntas pra Samuel

1. **Tipo de concreto padrão Metalfort**: é C20 (mais barato), ou na prática se
   usa C25/C30? Faz diferença pra estrutura LSF leve?
2. **Espessura típica**: 10 cm é razoável pra radier de modular Metalfort? Ou
   varia por finalidade (residencial vs comercial)?
3. **Argamassas**: o sistema modular LSF dispensa argamassas (construção seca);
   COMP00023-27 (argamassa de assentamento, reboco, chapisco etc.) realmente
   não entram em obra Metalfort, ou tem caso de uso?
4. **Sapata vs radier**: em obras pequenas (3×6, 18 m²), o padrão é radier
   inteiro ou sapata corrida só no perímetro? Os volumes diferem.

Até confirmar, valor de fundação no ERP é uma estimativa rápida — não usar como
referência financeira sem revisar.

---

## Bloco 3 — Composições "alternativas" ficam órfãs no DB

Comentário paralelo, não ação imediata: COMP00005-09 foram importadas mas não
estão vinculadas a nenhum produto. Razão técnica em
[Decisão 8 do doc de regras](regras-de-negocio.md#decisão-8--composições-alternativas-ficam-sem-vínculo-automático-dívida-técnica-conhecida).

Conversa que vai precisar acontecer um dia: se essas composições devem
substituir os combos atuais (`cobertura-standard`, `fechamento-standard` etc.),
ou se combos vão evoluir pra "consumir" composições. Trabalho de refatoração
γ — fora deste ciclo.

---

## Bloco 5 — Limitação: adicionar vs substituir material no orçamento

ERP hoje permite ADICIONAR material extra ao orçamento (via picker "Material
extra (catálogo)" no Step 10 do StepConfigurator), mas não SUBSTITUIR um
material que já entra via composição automática.

Exemplo: cliente que prefere perfil UE 75 em vez de UE 90 acaba pagando os
dois (UE 90 da composição COMP00001 + UE 75 extra adicionado pelo admin).

Não é bug, é limitação de feature. Caminhos futuros:

1. **Override por orçamento**: campo em `configuracao_json` tipo
   `compoosicoes_desativadas: ['COMP00001']` ou
   `materiais_substituidos: [{ from: 'CF001SF010', to: 'CF001SF003' }]`.
2. **Combos alternativos**: criar combos paralelos (`estrutura-LSF-UE-75`,
   `estrutura-LSF-UE-90`, `estrutura-LSF-UE-300`) e admin escolhe o adequado
   no configurador.

Decidir abordagem em ciclo separado se a Metalfort tiver demanda real.

---

## Bloco 6 — 34 materiais ativos sem rota automática em orçamento (snapshot 2026-05-11)

Materiais cadastrados como ativos mas que **não entram em nenhuma BOM/combo/
composição** automaticamente. Continuam acessíveis via picker "Material extra
(catálogo)" no novo orçamento — ficam como biblioteca técnica disponível pra
admin escolher quando precisar.

Total: 34. Os 2 SKUs de teste óbvios (`MT-tito`, `SKU TESTE 0001`) já foram
apagados nesta data.

### 6.1 Perfis LSF UE 75 — 12 SKUs (CF001SF001-008, CF001SF011-014)

Alternativas ao perfil UE 90 (que é o padrão atual via COMP00001/03/04).
Espessuras de chapa de 0,65 a 2,70 mm.

Decisão: **manter como biblioteca técnica disponível** — não vincular
automaticamente. Pertence à discussão γ (refatoração combos→composições) ou
ao Bloco 5 (override por orçamento), conforme escolha futura.

### 6.2 Parafusos especiais — 2 SKUs

- `CF005SF002` PARAFUSO CHUMBADOR M8 X 100 MM HARDBOLT — R$ 3/un
- `CF005SF003` PARAFUSO PONTA BROCA Nº5 (5,5 X 76mm) — R$ 0,55/un

Possivelmente usados em obras com requisitos estruturais específicos.
Validar com Samuel se entram em alguma composição padrão ou se o uso é
caso-a-caso.

### 6.3 Mão de obra órfã — 2 SKUs

- `CF006SF004` MO PAINEL 2UE 90 — R$ 55/m² ✋ **já listado no Bloco 1**
  Renomeado para `MO LSF T2 — painel 2UE médio (R$55/m²)` na migration 011.
  Continua sem composição vinculada — fica como biblioteca técnica até
  Samuel definir uso.
- `CF006SF008` MO LSF POR M² EM PLANTA — R$ 700/m² ⚠️ **PENDENTE INVESTIGAÇÃO**
  Não foi renomeado na migration 011 porque R$700/m² **não é tier de MO no
  mesmo sentido das outras** (que são valores por m² aplicados a subsistemas
  específicos). Pode ser MO global de algum serviço específico (planta
  inteira como obra) ou cadastro de outra natureza. Investigar com Samuel
  antes de renomear:
  - Esse valor é R$/m² de planta total ou um valor único de obra inteira?
  - Quando entra em orçamento real?
  - Faz sentido na nomenclatura T1/T2/T3/T4 (seria T5 global?) ou
    pertence a outra família?

### 6.4 Elementos estruturais — 3 SKUs (CF009SFxxx)

- `CF009SF001` PERFIL GOUSSET 150x150x0,95mm
- `CF009SF002` PERFIL CONECTOR DE ANCORAGEM
- `CF009SF006` TIRANTE - ARAME 10 COM ELO 1m (cx 100pç)

Itens usados em obras com requisitos estruturais específicos (gousset =
chapa de reforço; conector = ancoragem na fundação; tirante = travamento).
Validar com Samuel se entram em alguma composição padrão.

### 6.5 Desempenho estrutural — 5 SKUs (CF010SFxxx)

- `CF010SF001` BANDA ACÚSTICA 90x10000x4mm
- `CF010SF004` MANTA AUTO ADESIVA ASFALTICA ALUMINIZADA
- `CF010SF009` CANTONEIRA FLEXÍVEL LEVELLINE 30m
- `CF010SF010` PERFIL PINGADEIRA PVC 2500mm
- `CF010SF011` FITA HYDRO TAPE ÁREAS MOLHADAS

Maioria são auxiliares de obra (fitas, mantas, pingadeiras) que entram em
contextos específicos (umidade, acústica, beirais). Validar com Samuel.

### 6.6 Vedações específicas — 2 SKUs (CF011SFxxx)

- `CF011SF002` TELHA CERÂMICA TIPO PORTUGUESA — CUMEEIRA
- `CF011SF003` CALHAS E RUFOS

Itens de telhado. Cumeeira é específica (peça de remate) e calha/rufo só
em obras com captação pluvial.

### 6.7 Fechamento MT-FCH — 3 SKUs

- `MT-FCH-006` Fita Tyvek Tape 50x50m
- `MT-FCH-009` Cantoneira PVC 2,50m
- `MT-FCH-010` Perfil início com pingadeira PVC 2500mm

Itens auxiliares cadastrados manualmente, sem vínculo. Provavelmente
deveriam estar em alguma composição de fechamento — investigar caso a caso.

### 6.8 Equipamentos / addons MT-ADD — 2 SKUs

- `MT-ADD-002` Iluminação comercial especial — por ponto (R$ 280/und)
- `MT-ADD-003` Balcão fixo em steelframe + MDF — por metro linear (R$ 1200/m)

Addons comerciais (loja/conveniência). Provavelmente intencionalmente
órfãos — só entram quando o admin decide (varia por cliente).

### 6.9 Outros serviços — 3 SKUs

- `CF002SF001` PROJETO ESTRUTURAL ESCADA DE AÇO — R$ 1500/und
  Caso de obra com escada metálica. Faz sentido ser opcional.
- `CF004SF001` FRETE E MOVIMENTAÇÃO — R$ 10/km
  Frete por km. Provavelmente entra como extra comercial caso a caso
  (admin digita distância e valor).
- `CF004SF002` MUNK — R$ 2500/diária
  Locação de caminhão Munk. Idem (caso a caso).

---

## Como atualizar este documento

Quando uma pendência for resolvida (Samuel responde, decisão é tomada):
1. Mover a entrada pra seção "Resolvidas" abaixo, com data + decisão.
2. Atualizar `regras-de-negocio.md` com a decisão correspondente.
3. Aplicar a mudança no código/dados se necessário.

## Resolvidas

- **Bloco 1 — MO tiers** (resolvido 2026-05-12): Samuel confirmou que itens
  CF006SFxxx são escolhidos por tier de valor (R$/m²), não pela operação
  literal do nome. Ver detalhes inline no Bloco 1 acima. Sub-pendência de
  renomear itens permanece aberta como dívida técnica cosmética.
