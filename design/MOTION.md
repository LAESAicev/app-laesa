# Movimento: a linha de commit

A espinha à esquerda é o `git log` da página. Conforme a pessoa rola, a linha registra o caminho já percorrido e cada seção vira um commit. Este é o único movimento autoral do site; o resto da página fica quieto.

**Por que anima:** indica estado (até onde você já leu) e explica a metáfora do site. Aparece uma vez por visita, numa página de apresentação, então cabe no orçamento de "delight".

## Anatomia

```
 │  ← trilho      2px, sempre visível (--spine / --spine-navy)
 ┃  ← preenchimento  2px, cresce com o scroll até a agulha
 ┃░ ← energia     brilho curto que desce pelo trecho preenchido, em loop
 ●  ← nó commitado (preenchido)
 ┄┄┄┄┄┄┄┄┄┄┄┄┄  ← agulha: linha imaginária a 40% da altura da viewport
 ○  ← nó pendente (vazado)
```

| Camada | Fundo claro | Fundo navy |
| --- | --- | --- |
| Trilho | `--spine` #B4C6D6 | `--spine-navy` ciano 55% |
| Preenchimento | `--blue` #0078D4 | `--cyan` #1DD0F8 |
| Energia | ciano → transparente | branco 80% → transparente |
| Nó pendente | borda `--blue`, miolo `--ground` | borda `--cyan`, miolo `--navy` |
| Nó commitado | miolo `--blue` | miolo `--cyan` |
| HEAD | `--mint` (sempre preenchido) | `--mint` |

O menta continua reservado para "aberto/agora": a energia nunca usa menta.

## Comportamento

### 1. Preenchimento acompanha o scroll
- A ponta do preenchimento fica sempre na agulha (40% da viewport). Acima dela, a linha está preenchida; abaixo, só o trilho.
- Rolar para cima desfaz o preenchimento. É uma posição, não uma conquista.
- **Implementação:** um elemento `.spine-fill` por seção, recortado com `clip-path: inset(0 … calc((1 - p) * 100%) …)`, onde `p` (0–1) é a fração da seção acima da agulha. Usa `clip-path` e não `scaleY` para a energia dentro dele não ser achatada.
  - Onde há suporte: CSS scroll-driven, com `animation-timeline: view()` e `animation-range` calibrado para a agulha. Roda fora da main thread.
  - Fallback (Firefox/Safari antigos): um listener de scroll `passive` que atualiza `--p` via `requestAnimationFrame`, uma escrita por frame.
- Nada de animar `height`/`top`: só `clip-path` e `transform`.

### 2. Energia flui pelo trecho preenchido
- Um brilho de 64px (degradê linear de 0 → cor → 0) desce pelo preenchimento em loop contínuo, como corrente passando por um circuito. É o "fluxo" do logo (as linhas do cérebro terminam em nós).
- Fica recortado pelo `clip-path` do preenchimento, então só circula pelo caminho já commitado. Abaixo da agulha a linha fica parada.
- **Implementação:** CSS animation em `transform: translateY(-64px → 100%)`, `linear`, `infinite`. A duração é proporcional à altura da seção (**420 px/s**, mínimo 1,6s), para a velocidade ser a mesma em seções curtas e altas. Dois brilhos defasados em meia duração, para a linha nunca ficar "vazia".
- Pausa quando a seção sai da tela (`animation-play-state: paused` via IntersectionObserver) para não gastar bateria.

### 3. Nó é preenchido quando a agulha passa
- Quando o centro do nó cruza a agulha descendo, ele vira **commitado**:
  - o miolo cresce de `scale(0.4)` + `opacity 0` para `scale(1)` + `opacity 1`, em **280ms** com `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out forte);
  - um anel único se expande a partir do nó (pseudo-elemento de `scale(1)` para `scale(2.2)`, `opacity 0.45 → 0`) em **600ms**, ease-out forte. É o "commit registrado".
- Subindo, o nó volta a pendente: o miolo encolhe em **180ms**, sem anel. Feedback de commit só acontece na ida.
- **Implementação:** IntersectionObserver com `rootMargin: "-40% 0px -60% 0px"` (uma faixa fina na agulha) alterna `data-state="pending|committed"` no nó. A troca é uma CSS transition, que reprograma a partir do valor atual se a pessoa rolar rápido para cima e para baixo; keyframes reiniciariam do zero. O anel é a única keyframe, disparada por classe e removida no `animationend`.

### 4. HEAD
- O nó HEAD (seção do edital aberto) já nasce preenchido em menta.
- Respira devagar: um anel menta de `scale(1) → 1.8`, `opacity 0.35 → 0`, **2.4s**, ease-out, em loop. É o único nó que se mexe sozinho, porque é "agora".
- Sem edital aberto, o HEAD vira um nó comum e para de respirar.

### 5. Branches do hero (na carga da página)
- As três branches se desenham uma vez na carga: as duas portas ("Quero entrar", "Tenho um projeto") e o link terciário "Receber as novidades da LAESA". O desenho anima o `stroke-dashoffset` do comprimento até 0, em **600ms** com ease-out forte.
- Escalonamento de **80ms**: a segunda começa 80ms depois da primeira, e a terceira 80ms depois da segunda. Os nós das pontas se preenchem quando o traço chega.
- Em `/novidades`, o formulário também nasce de uma branch (ciano, sobre navy) com o mesmo desenho.
- A espinha do hero já começa preenchida até o primeiro nó, para a página nunca abrir "vazia".

## Mobile
- Mesmo comportamento, com a espinha em x = 7px.
- Um brilho só em vez de dois. O anel de commit vai a `scale(1.8)` para não encostar no texto.
- O scroll em telas de toque é rápido: o preenchimento segue a posição sem suavização extra, nunca atrasado em relação ao dedo.

## Movimento reduzido (`prefers-reduced-motion: reduce`)
- Sem energia (brilho desligado), sem anel de commit, sem respiração do HEAD, sem desenho das branches (já aparecem prontas).
- **Fica:** o preenchimento acompanhando o scroll e a troca de estado dos nós como um fade de cor de **150ms**. Isso informa e não desloca nada.

## Não fazer
- Animar outros elementos da página com scroll (títulos subindo, cards aparecendo): a linha é o único momento autoral.
- Easing `ease-in` em qualquer parte; `transition: all`.
- Linha "carregando" sozinha sem relação com o scroll, porque ela perde o significado de progresso.
- Partículas, glow ou blur pesado na linha. A energia é um brilho fino de 2px, não um neon.

## Conferir no protótipo
- Ver em 0.25× no inspetor de animações do DevTools: o anel não pode "piscar" e o miolo precisa crescer, não aparecer.
- Rolar rápido para cima e para baixo sobre um nó: ele deve reverter suave, sem reiniciar.
- Testar no celular de verdade: a ponta do preenchimento colada ao gesto, sem engasgo.

## Implementação (Fase 3)
- CSS: `src/styles/global.css`, seção "movimento: a linha de commit". Script: `src/scripts/spine.ts`, carregado no `BaseLayout`.
- Cada `Section` (e o rodapé) tem um `.spine-fill` com dois `.spine-energy`.
- O preenchimento usa `clip-path`, e não `scaleY`, para a energia dentro dele não ser achatada.
- Onde há suporte, o preenchimento é feito pelo navegador com `animation-timeline: view()` e `animation-range: cover 60vh cover calc(100% - 40vh)`. Nos outros, o script escreve `--p`.
- Atenção: a declaração `animation-timeline` fica num seletor separado (`.wrap > .spine-fill`). Se ficar no mesmo seletor, o minificador funde tudo num atalho `animation: … view()`, que é inválido e anula a animação.
- Velocidade da energia: 420 px/s (duração proporcional à altura da seção, mínimo 1,6 s).
