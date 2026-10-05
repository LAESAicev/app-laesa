# app-laesa

Site da **Liga Acadêmica de Engenharia de Software Aplicada** (iCEV, Teresina-PI). É um único app Astro com site, painel de conteúdo e rotas de API, conforme o [ADR 0001](docs/adr/0001-arquitetura-do-site.md).

**Status:** protótipo validado no Figma. A implementação em Astro segue o [plano de implementação](docs/plano-implementacao.md). O deploy aguarda as respostas do iCEV sobre a hospedagem.

- Figma: [LAESA — Site v2 e Componentes](https://www.figma.com/design/xBth5y7AzKE2UxvbGaXuzf?node-id=3046-758)
- Direção visual: *Grafo de Commits*. A página é um `git log --graph`: a linha principal atravessa as seções e as branches são as portas de entrada.

## Estrutura

```
.
├── LICENSE             uso exclusivo da LAESA, todos os direitos reservados
├── PRODUCT.md            contexto do produto: público, objetivos, regras de conteúdo
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

Cores dos logos: `azul` #0A2BFF · `menta` #5CEAD2 · `ciano` #1DD0F8 · `navy` #043F63 · `degrade-navy` · `degrade-azul` · `branco` · `preto`.

## Conteúdo pendente

Nas telas, os itens provisórios estão marcados com um selo tracejado ("exemplo", "confirmar", "[data]"):

- [ ] Instagram, LinkedIn, GitHub e e-mail oficial
- [ ] Datas, número de vagas e links do edital 2026.2
- [ ] Projetos realizados: nome, descrição, tipo e ano
- [ ] Nomes e fotos da Vice-Presidência, da Diretoria de Projetos e do(a) Professor(a) Orientador(a)
- [ ] Respostas do iCEV sobre hospedagem, subdomínio e backups (ADR 0001)

## Licença

Uso exclusivo da LAESA, com todos os direitos reservados. Ninguém tem permissão para copiar, modificar, distribuir ou usar comercialmente este código, o design, a marca ou o conteúdo sem autorização por escrito da Mesa Diretora. Veja [LICENSE](LICENSE).
