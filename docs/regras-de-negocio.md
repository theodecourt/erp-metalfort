# Regras de Negócio do ERP Metalfort

Decisões de produto e negócio que afetam o ERP, registradas em ordem cronológica.
O objetivo é não depender de memória meses depois — toda decisão não-óbvia mora aqui
com data e motivo. Quando uma decisão for revertida, marque a antiga com tachado e
adicione a nova abaixo (não apague o histórico).

---

## 2026-05-06 — Composições de obra (subsistemas reutilizáveis)

### Contexto

A planilha do Samuel (v3) trouxe 28 composições de obra (estrutura LSF, cobertura,
fechamento externo, forro, fundação, projeto). Composição = receita técnica de
subsistema com lista de insumos + mão de obra. É um conceito **diferente** de combo
(combo = alternativa que cliente público escolhe por categoria, ex.: "fechamento
térmico vs acústico").

Antes desta decisão, o ERP só modelava combos. Itens fixos da obra (estrutura
detalhada, fundação, projeto) ficavam de fora dos orçamentos — eram contabilizados
em planilha externa ou esquecidos. Decisão: criar entidade `composicao` ao lado de
`pacote_combo`, com schema aditivo (não quebra orçamentos antigos).

---

### Decisão 1 — Pares "MO+INS" e "só INS" viram uma composição com flag `incluir_mo`

A planilha tem 9 pares idênticos (COMP00001 vs COMP00010, COMP00005 vs COMP00014,
etc.) que só diferem na presença/ausência da linha de mão-de-obra. Modelamos como
uma composição única com flag `incluir_mo` (default `true`).

**Razão**: duplicar no schema vira fonte de dessincronia quando o Samuel atualizar
uma versão e esquecer da outra. Mais limpo manter uma só receita e filtrar a MO
em runtime.

**Tradeoff conhecido**: se aparecer caso onde a "versão sem MO" tem um insumo
extra que não existe na "versão com MO", o modelo não cobre. Não há esse caso
na v3. Refatoramos quando aparecer.

---

### Decisão 2 — Fundação: opcional, default OFF, prompt obrigatório

Composições COMP00020-27 (concretos e argamassas) entram OPCIONAIS no orçamento,
default desligado. **Não é "ligar/desligar com checkbox" — é prompt obrigatório**:
ao criar orçamento novo, o admin precisa marcar explicitamente "Incluir fundação?
Sim / Não" antes do botão Salvar habilitar. Sem default implícito.

**Razão**: na operação Metalfort, a fundação muitas vezes não está inclusa
(cliente executa por conta). Default ON faz o vendedor esquecer de tirar e cobrar
indevidamente; default OFF puro faz esquecer de incluir e perder receita. Prompt
obrigatório elimina os dois sintomas.

**Escopo "fundação" como item único**: a decisão liga/desliga TODAS as composições
COMP00020-27 juntas (concretos + argamassas). Não há subdivisão "projeto da
fundação" vs "execução da fundação" — vai como pacote indivisível. Se daqui a
meses precisar separar (ex.: cliente que tem projeto pronto mas precisa execução),
refatoramos.

---

### Decisão 3 — Projeto complementar: opcional, default OFF, valor editável por orçamento

Composição COMP00028 (PROJETOS COMPLEMENTARES) entra OPCIONAL com default
desligado. Mesmo padrão de prompt obrigatório que fundação. Quando o admin
responde "Sim", aparece input "Valor R$ ___" pré-preenchido com R$ 142 (default
da composição), **editável** — pode ser reduzido a zero (caso de reaproveitamento)
ou ajustado para outro valor.

**Razão**: existem casos onde o projeto estrutural é reaproveitado de uma
edificação parecida já calculada (valor cheio não se aplica) ou o cliente já tem
projeto próprio (zerar). Diferenças tão case-a-case que não vale fazer duas
composições separadas no schema agora.

**Tradeoff**: auditoria de "quanto foi cobrado em projeto neste orçamento" requer
ler o snapshot em `configuracao_json`, não fica em campo dedicado. Quando virar
dor, refatoramos.

---

### Decisão 4 — Visibilidade: cliente público vs admin

**Cliente público** (`/orcamento/:slug`):
- NÃO vê composições fixas no configurador.
- Vê só subtotal e total (mesma experiência que hoje).
- Composições fixas entram **invisíveis no cálculo**. Cliente público nunca pode
  desligar fundação ou ajustar projeto pelo fluxo público — `incluir_fundacao` e
  `incluir_projeto` ficam forçados em `false` para qualquer chamada
  `/api/public/quote/*`.

**Admin/vendedor** (`/admin/orcamento/new` e `/admin/orcamento/:id`):
- VÊ todas as composições aplicadas.
- Marca o prompt obrigatório (Sim/Não) ao criar.
- Bloco "Composições aplicadas" na tela de detalhe mostra cada composição usada
  com qtd, subtotal e overrides aplicados.
- Pode (em iteração futura) ajustar qtd ou desativar por orçamento via tela de
  detalhe — primeiro ciclo só mostra.

**Razão**: detalhe técnico distrai cliente final e abre brecha pra negociar item
a item. Vendedor precisa ver pra justificar o orçamento e ajustar pontualmente.

---

### Decisão 5 — Schema aditivo, orçamentos antigos preservados

A migração introduz 3 tabelas novas: `composicao`, `composicao_material`,
`produto_composicao`. **NÃO altera** `orcamento` nem `orcamento_item`.

**Risco direto**: zero pra orçamentos antigos. Eles têm `valor_total` (snapshot) e
`orcamento_item` (BOM materializado em linhas) — preservados mesmo se composições
mudarem depois.

**Risco indireto** (esperado e desejado): orçamentos NOVOS passam a incluir itens
que antes ficavam de fora (estrutura LSF detalhada, e fundação/projeto quando
marcados). Valor total final aumenta. Antes do deploy, **comunicar à equipe
comercial** que valores subiram (eles podem ajustar margem, expectativa de cliente,
material de venda).

---

### Decisão 6 — Overrides ficam em `configuracao_json`, não em tabela própria

Os campos novos do orçamento — `incluir_fundacao`, `incluir_projeto`,
`valor_projeto_override` — entram dentro do JSON de `orcamento.configuracao_json`,
junto com tamanho de módulo, combos selecionados, etc. **Não foi criada tabela
`orcamento_composicao`** neste ciclo.

**Razão**: simplicidade. JSON snapshot já preserva o estado por orçamento. Tabela
normalizada adicionaria complexidade sem ganho imediato.

**Tradeoff**: queries do tipo "quantos orçamentos incluíram fundação no último
trimestre" exigem `jsonb_extract` em vez de JOIN simples. Histórico de quem
editou o valor de projeto não é guardado. Quando virar dor de auditoria,
refatoramos.

---

### Decisão 7 — Limpeza de combos de teste

`combo-teste` e `combo-teste-copia` (categoria `vidro`) — apagados nesta data.
Eram lixo de testes anteriores que estavam aparecendo no configurador público.

---

### Decisão 8 — Composições alternativas ficam sem vínculo automático (dívida técnica conhecida)

Das 10 composições marcadas inicialmente como "automáticas" no plano, apenas 5
foram efetivamente vinculadas a `produto_composicao` (COMP00001-04 + COMP00019:
estrutura LSF, treliças, pilares e insumos auxiliares).

As outras 5 — COMP00005 (Telha+Manta), COMP00006 (Membrana+Cimentícia),
COMP00007 (Lã+Gesso), COMP00008 (Cimentícia 20mm), COMP00009 (Forro Gesso) —
ficam cadastradas em `composicao` mas **sem vínculo** com produto. Continuam
disponíveis no banco como "biblioteca" de receitas.

**Razão**: essas 5 são alternativas tecnológicas que **se sobrepõem aos combos
existentes** do ERP (ex.: COMP00005 ↔ `cobertura-standard`, COMP00006 ↔
`fechamento-standard`, COMP00009 ↔ `forro-standard`, etc.). Vincular como
automáticas duplicaria materiais nos orçamentos. Hoje as alternativas continuam
sendo cobertas pelos combos.

**Dívida técnica futura (γ)**: refatorar combos para serem "cascas" em cima de
composições, eliminando a duplicação de definição entre os dois mundos. Combos
passariam a ser responsáveis apenas pela lógica de "alternativa que o cliente
escolhe"; composições continuariam sendo a receita técnica. Trabalho relevante e
arriscado, merece ciclo dedicado — não bloqueia a operação atual.

---

### Decisão 9 — Hipótese de modelagem de MO da planilha Samuel (validar com Samuel)

Investigação durante a Etapa 8 mostrou que itens de mão-de-obra (família CF006)
têm **nomes específicos** mas **uso cruzado** em composições. Aparente erro de
catalogação, mas o cruzamento é **idêntico em v2 e v3** — não é erro de
transcrição recente.

**Hipótese**: o Samuel modela MO em **tiers de complexidade**, não em
"operação específica". Os nomes dos itens CF006SF00x viraram rotuladores
históricos, mas na prática representam categorias de preço:

| Tier | Preço | Itens | Uso prático em composições |
|---|---|---|---|
| Básico | R$ 40/m² | CF006SF001, CF006SF002 | Painéis simples (UE 90, UE 300 plano) |
| Médio | R$ 55/m² | CF006SF004 | (não usado em composições atuais) |
| Complexo | R$ 60/m² | CF006SF003, CF006SF005, CF006SF006 | Painéis duplos, treliças, fechamento, cobertura |
| Forro | R$ 75/m² | CF006SF007 | Forro de gesso |
| Global | R$ 700/m² | CF006SF008 | Verba LSF por m² de planta (raro) |

**Cruzamentos de nome ⚠️ versus uso** (exemplos):
- CF006SF002 "INSTALAÇÃO PLACAS CIMENTÍCIAS" usado em COMP00002 (LSF UE 300 piso)
- CF006SF003 "MONTAR PAINEL UE 300" usado em COMP00003 (2UE 90) e COMP00004 (TRELIÇAS)
- CF006SF006 "CIMENTÍCIAS + BASECOAT" usado em COMP00007 (LÃ + GESSO)

**Decisão temporária**: NÃO corrigir nomes nem mudar vínculos das composições
**agora**. Risco de "consertar" o que está certo em essência. Antes de produção:
sentar com Samuel, confirmar a hipótese de tiers, e:
- Se confirmada: renomear itens CF006 para nomes neutros de tier (ex.: "MO LSF
  básico R$40/m²", "MO LSF complexo R$60/m²"). Composições continuam funcionando
  com mesmos vínculos.
- Se rejeitada: ajustar valores ou cruzamentos conforme orientação do Samuel.

Tabela detalhada composição × MO atual × tier sugerido está em
[`docs/composicoes-pendentes-revisao.md`](composicoes-pendentes-revisao.md) —
serve de pauta da conversa com o Samuel.

---

## 2026-05-11 — Fluxo de merge para ciclos de refinamento

### Decisão 10 — Merge local sem PR em ciclos de baixo risco

Para ciclos de refinamento (cosméticos, renames, polimento de UI) que não
mexem em fluxo do usuário nem em schema de risco, o fluxo de merge é
simplificado:

1. Trabalho continua em branch separado (`feature/<nome>`) — preserva rede
   de proteção caso algo dê errado no meio do ciclo.
2. Push regular do branch para o GitHub ao longo do trabalho como backup
   remoto.
3. Ao final, em vez de abrir PR no GitHub: **merge local** direto pra main
   seguido de push:
   ```
   git checkout main
   git merge feature/<nome>
   git push origin main
   git branch -d feature/<nome>
   ```
4. **Parada obrigatória antes do `git push origin main`**: agente mostra
   resumo do ciclo (commits + arquivos + checkpoints validados) e aguarda
   OK explícito do usuário antes de empurrar pra origin.

**Razão**: PR via GitHub adiciona overhead (abrir página, copiar URL,
clicar merge, esperar UI) que se justifica quando há revisão real ou CI
externo. Em refinamentos validados localmente pelo próprio fluxo do
agente + checkpoint humano, o PR vira ritual vazio. Merge local é mais
rápido e mantém o histórico equivalente (commit de merge + push).

**Quando NÃO usar este fluxo (continua via PR no GitHub)**:
- Mudanças de schema com risco real (migrations destrutivas, alteração
  de tipos de coluna em produção).
- Mudanças de fluxo do usuário (admin ou cliente público) que precisam
  revisão visual antes do merge.
- Ciclos de funcionalidade nova de tamanho médio/grande onde a PR vira
  documentação útil do escopo.

**Sinalização explícita pelo usuário**: o usuário escolhe o modo no
início de cada ciclo. Default (sem sinalização) = via PR.

---

## Pendências arquiteturais futuras

### Separação conceitual materiais físicos vs serviços (ainda unificada)

A separação conceitual mais clara entre 'materiais físicos' e 'serviços'
(MO, frete, projeto) ainda usa a mesma tabela `material` no banco. Ciclo
(g) adicionou filtro visual na aba Materiais (tabs **Materiais** / **MO**)
para mitigar a confusão na UI, mas estrutura subjacente permanece
unificada. Refatoração para tabelas separadas (ou coluna `tipo`) fica
como opção quando outra dor concreta aparecer. Não bloqueia operação
atual.

Particularidades conhecidas do filtro visual:
- Critério "MO" = SKU começa com `CF006`. Itens de serviço fora dessa
  família (projetos `CF002SF*`, frete `CF004SF*`, e SKUs avulsos como
  `MT-SVC-001` "Mão de obra LSF") ficam na aba **Materiais** mesmo
  sendo serviços conceituais. Quando a separação subjacente for feita,
  esse filtro pode usar o campo de tipo direto.

---

## Convenções para futuras entradas neste documento

- Sempre datar (`YYYY-MM-DD`) e numerar decisões dentro de uma seção.
- Cada decisão tem **Razão** + **Tradeoff conhecido** sempre que possível.
- Se uma decisão for revertida, ~~marque com tachado~~ e adicione a nova abaixo
  com a data da reversão e o motivo. Não apague — o histórico é o ponto.
- Linguagem direta, sem jargão de produto. Foco no "por que" mais do que no "o
  que" (o "o que" o código mostra; o "por que" se perde).
