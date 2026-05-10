# Composições — pontos pendentes de revisão com o Samuel

Este documento é **pauta de conversa**, não decisão tomada. Lista pontos onde a
modelagem da planilha v3 levanta dúvidas que precisam ser confirmadas antes de
qualquer correção. **Nada aqui foi mudado no ERP** — está congelado no estado
da v3 até o Samuel revisar.

Contexto da decisão de não-corrigir-agora: ver
[Decisão 9 em `regras-de-negocio.md`](regras-de-negocio.md#decisão-9--hipótese-de-modelagem-de-mo-da-planilha-samuel-validar-com-samuel).

---

## Bloco 1 — Mão-de-obra com nomes que parecem "ofício específico" mas uso cruzado

### Tabela: composição × item de MO usado × nome × tier sugerido

| Composição | Item MO usado | Nome cadastrado do item | R$/m² | Coerente com nome? | Tier sugerido |
|---|---|---|---|---|---|
| COMP00001 LSF UE 90 simples | CF006SF001 | "MONTAR PAINEL SIMPLES UE 90" | 40 | ✅ sim | Básico |
| COMP00002 LSF UE 300 piso | CF006SF002 | "INSTALAR PLACAS CIMENTÍCIAS" | 40 | ⚠️ **NÃO** — nome é placa cimentícia, uso é em painel UE 300 | Básico |
| COMP00003 LSF 2UE 90 cobertura | CF006SF003 | "MONTAR PAINEL SIMPLES UE 300" | 60 | ⚠️ **NÃO** — nome é UE 300, uso é em 2UE 90 | Complexo |
| COMP00004 TRELIÇAS E PILARES | CF006SF003 | "MONTAR PAINEL SIMPLES UE 300" | 60 | ⚠️ **NÃO** — nome é painel UE 300, uso é em treliças/pilares | Complexo |
| COMP00005 TELHA + MANTA | CF006SF005 | "TELHAS + MANTA" | 60 | ✅ sim | Cobertura |
| COMP00006 MEMBRANA + CIMENTÍCIA | CF006SF006 | "CIMENTÍCIAS + BASECOAT" | 60 | ✅ sim | Fechamento |
| COMP00007 LÃ + GESSO ST | CF006SF006 | "CIMENTÍCIAS + BASECOAT" | 60 | ⚠️ **NÃO** — nome é cimentícia, uso é em parede com gesso | Fechamento |
| COMP00008 PLACA CIMENTÍCIA 20MM | CF006SF006 | "CIMENTÍCIAS + BASECOAT" | 60 | ✅ sim | Fechamento |
| COMP00009 FORRO GESSO | CF006SF007 | "FORRO GESSO + LÃ" | 75 | ✅ sim | Forro |

**Padrão observado**: 4 dos 9 vínculos usam item CF006 com nome que não bate
com a composição. Mas os **valores R$/m² formam apenas 4-5 níveis** (40, 55, 60,
75, 700), o que sugere que o Samuel pensa em tier de complexidade, não em
operação literal.

### Itens MO órfãos (cadastrados mas sem composição)

| Item | Nome | R$/m² | Comentário |
|---|---|---|---|
| CF006SF004 | "MONTAR PAINEL 2UE 90 X 0,95" | 55 | Item nomeado pra 2UE 90 mas COMP00003 (que é 2UE 90) não usa este — usa CF006SF003. Pode ter sido renomeado e o Samuel esqueceu de mudar a vinculação? |
| CF006SF008 | "MO LSF POR M2 EM PLANTA" | 700 | Verba global de MO de obra inteira; não casa com nenhum subsistema específico. |

### Perguntas pra Samuel

1. **Confirmação de tiers**: a hipótese de "Básico R$40 / Complexo R$60 / Forro R$75" reflete a realidade dos 5 cruzamentos esquisitos?
2. **CF006SF004 (R$55)**: deveria estar sendo usado em alguma composição? Se sim, em qual? Ou é resíduo de uma versão antiga?
3. **CF006SF008 (R$700)**: como entra esse valor num orçamento real? Por m² de planta inteira, em paralelo às MOs específicas?
4. **Renomear pra clareza**: tudo bem renomear os itens CF006SFxxx pra nomes neutros de tier (ex.: "MO LSF tier básico R$40/m²")?

### Decisão sobre próximos passos

Depende da resposta do Samuel:
- **Hipótese confirmada** → renomear CF006SFxxx pra nomes neutros (não mexe em
  composições nem valores).
- **Hipótese rejeitada** → ajustar valores ou cruzamentos conforme orientação
  dele. Atenção pra impacto em orçamentos: cada R$/m² alterado se propaga em
  centenas de m² de obra.

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

## Como atualizar este documento

Quando uma pendência for resolvida (Samuel responde, decisão é tomada):
1. Mover a entrada pra seção "Resolvidas" abaixo, com data + decisão.
2. Atualizar `regras-de-negocio.md` com a decisão correspondente.
3. Aplicar a mudança no código/dados se necessário.

## Resolvidas

(vazio por enquanto)
