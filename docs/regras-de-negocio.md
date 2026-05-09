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

## Convenções para futuras entradas neste documento

- Sempre datar (`YYYY-MM-DD`) e numerar decisões dentro de uma seção.
- Cada decisão tem **Razão** + **Tradeoff conhecido** sempre que possível.
- Se uma decisão for revertida, ~~marque com tachado~~ e adicione a nova abaixo
  com a data da reversão e o motivo. Não apague — o histórico é o ponto.
- Linguagem direta, sem jargão de produto. Foco no "por que" mais do que no "o
  que" (o "o que" o código mostra; o "por que" se perde).
