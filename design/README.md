# design/: protótipo

O HTML/CSS desta pasta é a fonte das telas do Figma. Cada página renderiza em duas larguras a partir do mesmo markup: 1440 (desktop) e 390 (mobile). Os estilos usam container queries em `.page`, então basta trocar a largura da página para mudar de layout.

```
src/
  styles.css             tokens (cores, fontes, espinha do grafo) e todos os componentes
  home.html              Início
  processos-seletivos.html
  contato.html           Contato + quadro "Estados do formulário"
  partials/              nav, footer, contact (bloco de contato da Home)
  icons/                 ícones 24px, traço 2 (estilo Lucide)
build.py                 resolve partials/ícones/logos e gera dist/<página>-desktop|mobile.html
```

Os logos vêm de `../brand/logo/`; não há cópias aqui.

## Gerar

```sh
python3 design/build.py
```

Abra os arquivos de `design/dist/` no navegador para conferir.

## Levar para o Figma

1. Gere o build. Ele também cria `dist/<página>-figma.html`, com desktop e mobile lado a lado.
2. Envie esse arquivo com a ferramenta `html_to_figma` (Figma MCP), usando `cssSelector: .page`. Cada `.page` vira um frame.
3. No Figma, troque as camadas importadas por instâncias da aba **Componentes**:
   - `Image - icon/<nome>` → `Icon/<nome>`
   - `Image - logo/<variante>` → `Logo/…`
   - botões → `Botão`, com o estilo deduzido pela cor.

   O conversor quebra ícones de traço e descarta o SVG do logo; por isso os nomes ficam marcados via `aria-label` no build.

## Template

- `{{> nome}}` inclui um partial.
- `{{icon:arrow}}` inclui um ícone.
- `{{logo-h}}` / `{{logo-h:#EAF4FA}}` inclui o logo horizontal; `{{logo-icon:#hex}}` inclui o ícone.
- `{{on:processos}}` marca o link ativo do nav.
- Classes `.dk` / `.mb` mostram um trecho só no desktop ou só no mobile.
- `.sample` é o selo tracejado de conteúdo provisório; `.tag-open` (menta) é reservado para o estado "aberto/ativo".
