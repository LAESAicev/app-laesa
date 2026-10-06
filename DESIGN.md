---
name: LAESA
description: Site da Liga Acadêmica de Engenharia de Software Aplicada (iCEV), desenhado como um git log --graph vertical.
colors:
  navy: "#043F63"
  navy-deep: "#022B45"
  blue: "#0078D4"
  blue-hover: "#005A9E"
  blue-text: "#005A9E"
  cyan: "#1DD0F8"
  mint: "#5CEAD2"
  ground: "#F3F6F9"
  paper: "#FFFFFF"
  ink: "#0A1D2E"
  ink-2: "#3E566B"
  ink-3: "#5A7084"
  rule: "#D3DEE8"
  rule-strong: "#B4C6D6"
  on-navy: "#EAF4FA"
  on-navy-2: "#A9CBE0"
  on-navy-rule: "rgba(169, 203, 224, 0.22)"
  spine: "#B4C6D6"
  spine-navy: "rgba(29, 208, 248, 0.55)"
  error: "#C42B2B"
typography:
  display-1:
    fontFamily: "Bebas Neue, Oswald, Arial Narrow, sans-serif"
    fontSize: "96px"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.004em"
  display-2:
    fontFamily: "Bebas Neue, Oswald, Arial Narrow, sans-serif"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "0.004em"
  display-3:
    fontFamily: "Bebas Neue, Oswald, Arial Narrow, sans-serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.004em"
  title:
    fontFamily: "Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  meta:
    fontFamily: "Geist Mono, SFMono-Regular, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  tag-sm: "3px"
  control: "4px"
  panel: "6px"
  pill: "15px"
  node: "50%"
spacing:
  gutter: "96px"
  gutter-tablet: "40px"
  gutter-mobile: "20px"
  spine-col: "56px"
  section-y: "112px"
  section-y-mobile: "72px"
  hero-y: "88px 104px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 22px 0 20px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "0 22px 0 20px"
    height: "52px"
  button-light:
    backgroundColor: "{colors.on-navy}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "0 22px 0 20px"
    height: "52px"
  button-ghost-light:
    backgroundColor: "transparent"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.control}"
    padding: "0 22px 0 20px"
    height: "52px"
  tag-open:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.navy-deep}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "0 12px 0 10px"
    height: "30px"
  tag-neutral:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 12px 0 10px"
    height: "30px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  headref:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.navy-deep}"
    rounded: "{rounded.tag-sm}"
    padding: "0 7px"
    height: "20px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "50px"
  graph-node:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.node}"
    size: "16px"
  graph-node-head:
    backgroundColor: "{colors.mint}"
    rounded: "{rounded.node}"
    size: "16px"
  log-panel:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.panel}"
  form-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "40px"
---

# Design System: LAESA

## Overview

**Creative North Star: "Grafo de Commits"**

O site da LAESA é um repositório vivo lido de cima para baixo. Uma linha contínua de 2px, a "main" (o traço do logo), desce pela coluna esquerda de todas as seções e marca cada uma com um nó circular, como um `git log --graph`. As portas de entrada são branches que saem dessa linha e terminam nos botões. O resto da página fica quieto: a linha é o único movimento autoral.

A hierarquia vem por inversão de campos inteiros, não por cartões: seções off-white (`ground`) alternam com seções navy (`navy`, `navy-deep`) de borda a borda. Dentro delas, a densidade é editorial e listada: linhas separadas por fios finos (`rule`), dados de estatuto em números condensados, metadados em mono pequena. Uma só voz de display, Bebas Neue em caixa alta, ecoa o wordmark do logo.

A direção recusa o hero de foto escurecida com cartões de missão/visão/valores, gradientes e glass. Profundidade é rara e difusa, reservada para os poucos painéis que flutuam sobre o campo (o terminal do log, o formulário).

**Key Characteristics:**
- Espinha vertical de 2px com nós de 16px em todas as seções, alinhada a uma coluna fixa da grade.
- Campos de seção inteira alternando off-white e navy; a cor do grafo troca de azul para ciano no navy.
- Menta só para o que está aberto, ativo ou é HEAD.
- Display único condensado em caixa alta; texto em Geist; metadados em Geist Mono.
- Controles retos (4px), sem gradiente, sem glass, com ícone de seta em traço.
- Movimento ligado ao scroll somente na espinha; nada mais anima com o scroll.

## Colors

Paleta fria de duas superfícies (off-white e navy) com um azul de interface e dois acentos de luz (ciano e menta) com papéis estritos.

### Primary
- **Azul Interface** (`blue`): botão primário, linha de branch e preenchimento da espinha em fundo claro, borda de nó pendente, anel de foco, checkbox marcado. Definido pela equipe no Figma; o azul elétrico do logo (#0A2BFF) fica só nos arquivos de logo.
- **Azul Interface Profundo** (`blue-hover`): hover do botão primário.
- **Azul de Texto** (`blue-text`, mesmo valor do hover): todo texto pequeno em azul (links, rótulos mono de assunto, flags de manifesto, opção ativa). O azul de interface fica perto de 4,2:1 sobre `ground` e não passa AA em texto pequeno.

### Secondary
- **Ciano Circuito** (`cyan`): o "azul" do mundo navy. Preenchimento da espinha, bordas de nó, ênfase `<em>` dos títulos, links e anel de foco quando o fundo é navy; brilho de energia sobre fundo claro; cor de seleção de texto.

### Tertiary
- **Menta HEAD** (`mint`): estado aberto, ativo ou HEAD. Tag "Edital aberto", referência HEAD no log, nó HEAD que respira, etapa atual do edital, projeto ativo.

### Neutral
- **Navy LAESA** (`navy`): campos de seção invertidos, títulos de display em fundo claro, botão de contorno, painel do log e do edital.
- **Navy Profundo** (`navy-deep`): seções mais fundas (chamada de entrada, rodapé), texto sobre menta, fundo do `html` para o overscroll continuar o rodapé.
- **Off-white Chão** (`ground`): fundo padrão da página.
- **Papel** (`paper`): seções e painéis claros elevados (formulário, regras, manifesto).
- **Tinta** (`ink`), **Tinta 2** (`ink-2`), **Tinta 3** (`ink-3`): texto principal, texto corrido, e metadados/placeholder/dicas. `ink-3` foi ajustado para AA; o Figma ainda tem #5E7487.
- **Fio** (`rule`) e **Fio Forte** (`rule-strong`): divisores de lista e bordas de campo; `spine` (mesmo valor de `rule-strong`) é o trilho da espinha em fundo claro.
- **Sobre-navy** (`on-navy`, `on-navy-2`, `on-navy-rule`): texto principal, texto secundário e fios dentro das seções navy. `spine-navy` é o trilho da espinha no navy.
- **Erro** (`error`): borda e mensagem de campo inválido. Hoje é valor literal no CSS, junto com o fundo do banner (#FBEDED), o texto do banner (#A32222) e o erro sobre navy (#FFB4B4).

### Named Rules
**The Mint Means Now Rule.** Menta aparece só em estado aberto, ativo ou HEAD. Estados encerrados ou em andamento usam a tag neutra (papel, `ink-2`, borda `rule-strong`, ponto azul). A energia da espinha nunca usa menta.

**The Field Swap Rule.** Em seção navy, todo papel azul passa para ciano (linha, nó, ênfase, link, foco) e todo texto passa para `on-navy`/`on-navy-2`. Azul de interface nunca aparece como linha ou texto sobre navy.

**The Small Blue Rule.** Texto azul menor que 18px usa `blue-text`, nunca `blue`.

## Typography

**Display Font:** Bebas Neue (com Oswald, Arial Narrow)
**Body Font:** Geist (com Helvetica Neue, Arial)
**Label/Mono Font:** Geist Mono (com SFMono-Regular, Menlo)

**Character:** Uma grotesca condensada de letreiro em caixa alta carrega toda a voz de título e ecoa o wordmark; Geist, neutra e técnica, carrega a leitura; Geist Mono marca o que é dado de repositório (hashes, datas, referências de artigo).

### Hierarchy
- **Display 1** (400, 96px, 0.92; tablet 80px; mobile 60px): título único do hero de cada página. Parte final em `<em>` azul (ciano no navy), sem itálico.
- **Display 2** (400, 64px, 0.94; tablet 54px; mobile 46px): título de seção, mesmo padrão de ênfase.
- **Display 3** (400, 34px, 1; mobile 30px): eixos, nomes de projeto, título do edital (44px no painel do edital), números do estatuto (40px, algarismos tabulares).
- **Title** (600, 18–20px, 1.3, -0.01em): títulos de etapa, pessoa, pergunta do FAQ, item do manifesto, em Geist.
- **Lead** (400, 19px, 1.55, máx. 54ch; mobile 17px): subtítulo do hero e aberturas de seção.
- **Body** (400, 16px, 1.6): texto corrido; textos longos (privacidade) a 16,5px/1.65 em 72ch.
- **Label** (600, 14px): rótulos de campo e cabeçalhos de painel; links e botões a 16px/600.
- **Meta** (Geist Mono 400, 12.5px, 1.4): hashes e datas do log, artigos do estatuto, rótulos de fato do edital, status. Variantes de 11–12px para tags pequenas.

### Named Rules
**The One Display Rule.** Só Bebas Neue faz display, sempre em caixa alta e peso 400. Títulos internos de componente (etapa, pessoa, FAQ) são Geist 600, nunca uma segunda face de display.

**The Mono Is Data Rule.** Geist Mono só para o que seria saída de terminal ou referência verificável: hash, data, "Art. N", status, identificador. Nunca para rótulo decorativo acima de título.

## Layout

A grade de toda seção é `gutter + coluna da espinha + conteúdo`, com largura máxima de 1440px. A espinha é um traço absoluto de 2px posicionado a `gutter + spine-x` e o conteúdo começa na segunda coluna. Branches (hero, `/novidades`) e nós de lista recuam para a coluna da espinha com margem negativa para nascer da linha.

| Breakpoint | gutter | coluna da espinha | x da espinha |
| --- | --- | --- | --- |
| Desktop (> 1100px) | 96px | 56px | 27px |
| Tablet (641–1100px) | 40px | 48px | 15px |
| Mobile (≤ 640px) | 20px | 32px | 7px |

- Ritmo vertical: seções a 112px (72px no mobile); hero a 88px/104px (40px/64px no mobile); rodapé 72px/40px.
- Grades de duas colunas assimétricas: texto fluido à esquerda e painel fixo à direita (log e edital 470px, regras 480px, formulário 640px, FAQ 720px), separados por 72–80px. No tablet e no mobile tudo vira uma coluna; painéis do hero limitam a 560px no tablet.
- Sequências horizontais (eixos, fluxo do edital) correm sobre uma linha horizontal com nós no desktop e viram coluna com linha vertical à esquerda no tablet/mobile.
- Listas em vez de cartões: projetos, editais anteriores, canais, assuntos e regras são linhas separadas por `rule`.
- Navegação: barra de 80px (68px no mobile) com fio inferior; a espinha não passa por ela.

## Elevation & Depth

O sistema é plano por padrão e ganha profundidade por inversão de campo (off-white contra navy) e por fios. Sombras existem só sob painéis que flutuam sobre o campo, sempre difusas, com spread negativo e tingidas de navy; nunca sombra dura deslocada.

### Shadow Vocabulary
- **Painel escuro** (`box-shadow: 0 24px 48px -24px rgba(4, 63, 99, 0.45)`): terminal do log e painel do edital.
- **Painel claro** (`box-shadow: 0 24px 48px -32px rgba(4, 63, 99, 0.25)`): formulário de contato e manifesto de inscrição.
- **Sobreposição** (`box-shadow: 0 18px 36px -18px rgba(4, 63, 99, 0.35)`; menu mobile `0 24px 40px -24px rgba(4, 63, 99, 0.35)`): dropdown e painel do menu.
- **Halo de estado** (`box-shadow: 0 0 0 5px rgba(92, 234, 210, 0.22)`; foco de campo `0 0 0 4px rgba(0, 120, 212, 0.14)`): anel em volta do nó HEAD/etapa atual e do campo focado.

### Named Rules
**The Floating Panel Rule.** Só painel de conteúdo próprio (log, edital, formulário, manifesto, dropdown) tem sombra. Linhas de lista, chips e botões são planos.

## Shapes

Geometria de grafo: retas, cantos quase vivos e círculos. Controles e campos têm 4px; painéis 6px; tags pequenas 3px; pílulas (tag aberta, chip) 15px; nós, marcadores de lista, botões sociais e o ícone do FAQ são círculos perfeitos. Linhas do grafo têm sempre 2px; branches são curvas quadráticas que saem da vertical e terminam numa horizontal com nó de 12px. Marcadores de lista são anéis vazados de 8–12px com borda de 2px, nunca bullets tipográficos. Ícones são SVG de 24px em traço 2 (estilo Lucide). O logo é recortado da prancheta de 1080 para a caixa de tinta.

## Components

### Buttons
Retos e firmes, um só peso de fonte, seta em traço à direita.
- **Shape:** cantos levemente vivos (4px), borda de 2px, altura 52px (50px no mobile), ícone de 18px com 12px de gap.
- **Primary:** azul de interface com texto branco; é a porta "Quero entrar".
- **Outline:** contorno navy, texto navy, fundo transparente; é a porta "Tenho um projeto", com o mesmo peso visual do primário.
- **Light / Ghost-light:** versões para navy (fundo `on-navy` com texto navy; contorno `on-navy-2`).
- **Hover / Focus:** hover só em ponteiro fino, 160ms ease (primário escurece para `blue-hover`, contornos ganham véu de 7–10%); `:active` desce 1px; foco com contorno de 3px em azul (ciano no navy), deslocado 3px. Carregando: fundo #4D9FE0 com spinner.

### Chips
- **Tag aberta:** pílula menta de 30px, texto mono 12.5px navy profundo, ponto de 8px. Só para estado aberto.
- **Tag neutra:** mesma forma em papel com borda `rule-strong` e ponto azul, para "em andamento" e "encerrado".
- **Chip de área:** pílula de contorno `rule-strong`, Geist 13.5px/500, sem estado.
- **HEAD ref:** etiqueta menta de 20px, 3px de raio, mono 11px/600, junto à mensagem do commit atual.
- **Amostra (placeholder):** etiqueta tracejada mono 11px em `ink-3`, marca conteúdo ainda não fornecido.

### Cards / Containers
- **Terminal do log:** painel navy de 6px com barra de 48px e fio inferior, linhas de 62px com mini-grafo à esquerda, mensagem em Geist 15px/500 e meta mono com hash em ciano.
- **Painéis claros (regras, formulário, manifesto):** papel, borda `rule`, 6px, padding 28–40px; formulário e manifesto com sombra de painel claro.
- **Faixa de chamada:** fundo `ground` em seção papel, 6px, padding 28px 32px, sem borda.

### Inputs / Fields
- **Style:** papel, borda de 1.5px `rule-strong`, 4px, altura 50px, Geist 16px; rótulo 14px/600 com "(opcional)" em `ink-3`; select nativo com chevron navy desenhado em SVG.
- **Focus:** borda azul e halo de 4px azul a 14%; transição 160ms.
- **Error / Disabled:** borda `error` com halo de 3px a 10% e mensagem 13.5px com ícone; banner de erro no topo. Enviando: campos em `ground` com texto `ink-3`.
- **Condicional:** campos extras de "Quero um projeto" penduram de uma branch azul de 2px com nó de 14px e rótulo mono.
- **Sobre navy (inscrição em novidades):** campo translúcido (`on-navy` a 6%), borda `on-navy-rule`.

### Navigation
- Logo de 128px à esquerda, links Geist 15px/500 em `ink-2` com gap de 28px, página atual em navy 600, tag de status à direita.
- Tablet: links 14px com gap de 18px, tag escondida. Mobile: hambúrguer de 44px abre painel papel com links de 17px separados por fios e a tag no fim; página atual em `blue-text`.

### Espinha do grafo (assinatura)
Trilho de 2px em toda seção, nó de 16px (borda 2px azul, miolo da cor do campo) alinhado ao título. Comportamento completo em `design/MOTION.md`:
- O preenchimento acompanha o scroll até uma agulha a 40% da viewport (scroll-driven `view()` com fallback em `src/scripts/spine.ts`), usando `clip-path`.
- Um brilho de 64px corre em loop só no trecho preenchido, a 420px/s (mínimo 1,6s), e pausa fora da tela; um só brilho no mobile.
- O nó vira commit quando a agulha passa: miolo cresce em 280ms `cubic-bezier(0.23, 1, 0.32, 1)` com anel único de 600ms (escala 2.2; 1.8 no mobile); reverte em 180ms sem anel.
- O HEAD é menta preenchido e respira (2.4s, em loop). As branches do hero se desenham uma vez na carga (600ms, 80ms de escalonamento).
- Com movimento reduzido: sem energia, anel, respiração nem desenho; ficam o preenchimento e a troca de cor do nó em 150ms.

### Linhas de etapas
Sprint, etapas do edital e fluxo de seleção são branches secundárias: linha de 2px com nós de 16px; nó final preenchido em azul; etapa atual em menta com halo e meta em verde escuro legível (#0E7C69).

## Do's and Don'ts

### Do:
- **Do** começar toda seção nova com o componente de seção, para herdar a espinha, o preenchimento e o nó.
- **Do** alternar campos inteiros off-white e navy para criar hierarquia, trocando azul por ciano no navy.
- **Do** usar `blue-text` (#005A9E) para qualquer texto azul pequeno e `ink-3` (#5A7084) para metadados, mantendo AA.
- **Do** marcar com a etiqueta tracejada de amostra todo conteúdo ainda não fornecido pela liga.
- **Do** dar às duas portas (entrar e pedir projeto) o mesmo tamanho: primário e contorno lado a lado.
- **Do** escrever números do estatuto em Bebas Neue com algarismos tabulares e citar o artigo em mono.

### Don't:
- **Don't** usar menta para sucesso genérico, decoração, energia da espinha ou qualquer estado que não seja aberto, ativo ou HEAD.
- **Don't** usar o azul do logo (#0A2BFF) na interface.
- **Don't** animar outros elementos com o scroll (títulos subindo, cartões aparecendo); a espinha é o único movimento autoral.
- **Don't** usar `ease-in`, `transition: all`, glow pesado ou partículas na linha.
- **Don't** usar gradiente ou glass em botões e painéis, nem sombra dura deslocada.
- **Don't** montar hero de foto escurecida com cartões de missão, visão e valores.
- **Don't** colocar rótulo mono ou sobretítulo decorativo acima de títulos de display.
