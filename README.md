# app-laesa

Site da **Liga Acadêmica de Engenharia de Software Aplicada** (iCEV, Teresina-PI). É um único app Astro com site, painel de conteúdo e rotas de API, conforme o [ADR 0001](docs/adr/0001-arquitetura-do-site.md).

**Status:** protótipo validado no Figma. A implementação em Astro segue o [plano de implementação](docs/plano-implementacao.md). O deploy aguarda as respostas do iCEV sobre a hospedagem.

- Figma: [LAESA — Site v2 e Componentes](https://www.figma.com/design/xBth5y7AzKE2UxvbGaXuzf?node-id=3046-758)
- Direção visual: *Grafo de Commits*. A página é um `git log --graph`: a linha principal atravessa as seções e as branches são as portas de entrada.

## Rodar localmente

```sh
npm install
cp .env.example .env   # contatos, redes e domínio (ver comentários no arquivo)
npm run dev       # site em http://localhost:4321 e painel em http://localhost:4321/keystatic
npm run build     # checa tipos e gera dist/
npm run design    # regera o protótipo HTML (design/dist) usado no Figma
npm run dev:limpo # painel em branco ou erro de cache? reinicia o dev limpando o cache do Vite
```

## Estrutura

```
.
├── LICENSE             uso exclusivo da LAESA, todos os direitos reservados
├── PRODUCT.md            contexto do produto: público, objetivos, regras de conteúdo
├── src/
│   ├── pages/            /, /processos-seletivos, /processos-seletivos/[slug], /contato, /privacidade, 404
│   ├── components/       componentes portados do protótipo (Nav, GitLog, EditalPage, ContactForm…)
│   ├── lib/content.ts    lê content/*.yaml com o schema do painel
│   ├── data/             conteúdo fixo do estatuto e tipos
│   ├── styles/global.css tokens e estilos (portados de design/src/styles.css)
│   └── icons/            ícones 24px
├── keystatic.config.ts   schema do painel (fonte única do modelo de conteúdo)
├── content/              conteúdo editável pelo painel (YAML)
├── public/               favicon e uploads do painel (public/uploads)
├── docs/
│   ├── estatuto-2026.md  estatuto da liga, fonte de toda regra citada no site
│   ├── adr/              decisões de arquitetura (0001: repositório único, Keystatic, iCEV)
│   ├── plano-implementacao.md
│   └── contrato-contato.md  campos e respostas do formulário de contato
├── brand/
│   ├── logo/
│   │   ├── horizontal/   laesa-horizontal-<cor>.svg|png
│   │   ├── vertical/     laesa-vertical-<cor>.svg|png
│   │   └── icone/        laesa-icone-<cor>.svg|png
│   └── avatar/           fotos de perfil para redes sociais
├── design/               protótipo em HTML/CSS, a fonte das telas do Figma
│   ├── src/              páginas, partials, ícones e styles.css
│   ├── build.py          gera design/dist/ (desktop + mobile)
│   ├── MOTION.md         spec da animação da linha de commit
│   └── README.md
└── .impeccable/          contrato da direção visual (surfaces/site.md)
```

Contato e redes não ficam no código nem no painel: vêm de variáveis de ambiente (`.env`, modelo em `.env.example`).

Cores dos logos: `azul` #0A2BFF · `menta` #5CEAD2 · `ciano` #1DD0F8 · `navy` #043F63 · `degrade-navy` · `degrade-azul` · `branco` · `preto`.

## Conteúdo pendente

Nas telas, os itens provisórios estão marcados com um selo tracejado ("exemplo", "confirmar", "[data]"):

- [x] E-mail, Instagram, LinkedIn e GitHub (em `.env`)
- [ ] Transferir este repositório para a organização [LAESAicev](https://github.com/LAESAicev)
- [ ] Datas, número de vagas e links do edital 2026.2
- [ ] Projetos realizados: nome, descrição, tipo e ano
- [ ] Nomes e fotos da Vice-Presidência, da Diretoria de Projetos e do(a) Professor(a) Orientador(a)
- [ ] Respostas do iCEV sobre hospedagem, subdomínio e backups (ADR 0001)

## Licença

Uso exclusivo da LAESA, com todos os direitos reservados. Ninguém tem permissão para copiar, modificar, distribuir ou usar comercialmente este código, o design, a marca ou o conteúdo sem autorização por escrito da Mesa Diretora. Veja [LICENSE](LICENSE).

## Editar o conteúdo

Rode `npm run dev` e abra `/keystatic`. O painel edita os arquivos de `content/`; o site atualiza na hora.

| No painel | O que muda no site |
| --- | --- |
| Configurações e status da seleção | tag do menu, seção "Quer entrar?" da home e a página de processos seletivos; redes e e-mail |
| Hero: git log | painel do topo da home (o primeiro commit é o HEAD) |
| Mesa Diretora | nomes e fotos dos cargos |
| Perguntas frequentes | FAQ da página de processos seletivos |
| Projetos | lista "O que já saiu do papel" (marque "Mostrar na home" e defina a ordem) |
| Editais | uma página por edital, com datas, vagas, PDF e modelo da carta |

Depois de editar, faça commit das mudanças em `content/` e `public/uploads/`. Na Fase 5 o painel passa a commitar sozinho no GitHub.
