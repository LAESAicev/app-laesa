# Site da LAESA

[![CI](https://github.com/LAESAicev/app-laesa/actions/workflows/ci.yml/badge.svg)](https://github.com/LAESAicev/app-laesa/actions/workflows/ci.yml)

Site da Liga Acadêmica de Engenharia de Software Aplicada (iCEV, Teresina-PI). Versão 1.0.0.

É um único app Astro com o site, o painel de conteúdo (Keystatic), as rotas de API dos formulários e a tela de avisos da Mesa (`/mesa`). O conteúdo fica em arquivos YAML no repositório; só os inscritos nas novidades ficam num banco SQLite.

O visual segue a direção *Grafo de Commits*: a página funciona como um `git log --graph`, e as branches são as portas de entrada (entrar na liga, propor um projeto, receber as novidades).

- Design: [Figma: LAESA Site v2 e Componentes](https://www.figma.com/design/xBth5y7AzKE2UxvbGaXuzf?node-id=3046-758) e [DESIGN.md](DESIGN.md). Contexto do produto: [PRODUCT.md](PRODUCT.md).
- Decisões: [ADR 0001](docs/adr/0001-arquitetura-do-site.md) (arquitetura), [0002](docs/adr/0002-atividades-pela-data.md) (atividades pela data), [0003](docs/adr/0003-tela-de-avisos.md) (tela de avisos) e [0004](docs/adr/0004-deploy-automatico-de-conteudo.md) (deploy).
- O site está pronto. A publicação depende do domínio e do servidor do iCEV; o que falta está em [docs/plano-implementacao.md](docs/plano-implementacao.md).

## Rodar localmente

Pré-requisitos: Node 24 ou mais novo e npm. Docker é opcional no desenvolvimento (Mailpit e teste da imagem).

```sh
npm install
cp .env.example .env   # os comentários do arquivo explicam cada variável
npm run dev            # site em http://localhost:4321 e painel em http://localhost:4321/keystatic
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento, com o painel em `/keystatic` |
| `npm run dev:limpo` | reinicia o dev limpando o cache do Vite (use se o painel abrir em branco) |
| `npm test` | testes (Vitest) |
| `npm run build` | checa os tipos e gera `dist/` (páginas estáticas e servidor das rotas dinâmicas) |
| `npm run design` | regera o protótipo HTML (`design/dist`) usado no Figma; precisa de Python 3 |

O Astro 7 deixa o servidor de desenvolvimento rodando em segundo plano. Depois de mudar o `astro.config.mjs` ou o `.env`, reinicie com `npx astro dev stop && npm run dev`.

### E-mails em desenvolvimento

O formulário de contato, a inscrição nas novidades e a tela de avisos enviam e-mail. Na sua máquina, use o [Mailpit](https://mailpit.axllent.org), que recebe os e-mails e mostra numa página em vez de enviar:

```sh
docker run -d --name laesa-mailpit -p 8025:8025 -p 1025:1025 \
  -e MP_SMTP_AUTH_ACCEPT_ANY=1 -e MP_SMTP_AUTH_ALLOW_INSECURE=1 axllent/mailpit
```

O `.env.example` já aponta para ele (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_USER=dev`, `SMTP_PASS=dev`). Para a inscrição, defina também `INSCRICAO_SECRET` (gere com `openssl rand -hex 32`) e `INSCRITOS_STORE=memoria`. A caixa de entrada fica em http://localhost:8025.

Fora de produção, o site recusa SMTP que não seja local, para que um `.env` copiado do servidor não mande e-mail de verdade. "Produção" quer dizer o processo rodando com `NODE_ENV=production`, que a imagem Docker define; `npm run preview` e `node dist/server/entry.mjs` na sua máquina também recusam. Para testar um envio real de propósito, defina `ENVIO_REAL=true` e apague a linha depois.

O envio real usa a conta Google Workspace da LAESA com senha de app (`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`). Redes de faculdade e de empresa costumam bloquear as portas 465 e 587; se o envio falhar, teste em outra rede.

## Editar o conteúdo

Com `npm run dev` no ar, abra `/keystatic`. O painel grava nos arquivos de `content/`, e o site atualiza na hora.

| No painel | O que muda no site |
| --- | --- |
| Configurações e status da seleção | status do processo seletivo (aberto, em andamento ou finalizado), que muda a tag do menu, a seção "Quer entrar?" da home e a página de processos seletivos; também o edital atual e o link do estatuto |
| Hero: git log | painel do topo da home (o primeiro commit é o HEAD) |
| Mesa Diretora | nome e foto de cada cargo (a foto é recortada sozinha no quadro 4:5) |
| Perguntas frequentes | FAQ da página de processos seletivos |
| Atividades e projetos | oficinas, cursos, eventos, pesquisas e projetos. A ordem e o status ("em breve", "inscrições abertas", "concluído") saem da data. A home mostra as 5 mais perto de hoje, e `/atividades` mostra todas, com busca e filtro por eixo |
| Editais | uma página por edital, com datas, vagas, PDF e modelo da carta |

Depois de editar, faça commit das mudanças em `content/`, `src/assets/uploads/` e `public/uploads/`. Itens marcados como "Conteúdo provisório" aparecem no site com um selo tracejado "exemplo".

Contato e redes sociais não ficam no painel: vêm das variáveis `PUBLIC_*` do `.env` (na imagem publicada, das Variables do repositório no GitHub).

O painel tem dois modos. Sem `PUBLIC_KEYSTATIC_GITHUB_REPO`, ele só existe em `npm run dev` e edita os arquivos da sua máquina. Com a variável definida (modo GitHub), ele também fica no site publicado, com login pelo GitHub, e cada edição vira um commit na `main`. O modo GitHub ainda não está ligado; como ligar: [docs/operacao.md](docs/operacao.md#painel-em-produção).

## Avisos para os inscritos

A Mesa manda e-mails para quem se inscreveu nas novidades pela tela de avisos (`/mesa`) ou por comando no servidor (`scripts/avisar.ts`). A tela vem desligada: sem `PAINEL_AVISOS=true`, `/mesa` responde 404.

- Como usar: [docs/avisos.md](docs/avisos.md).
- Como ligar no servidor e testar na sua máquina: [docs/operacao.md](docs/operacao.md#tela-de-avisos).

## Testar

```sh
npm test                  # testes
npm run build             # tipos (astro check) e build
node scripts/smoke.mjs    # depois do build: sobe o servidor gerado e confere rotas, links internos e scripts inline
```

O CI roda os três em todo push e pull request. Para testar a imagem Docker com HTTPS local, em `https://localhost`:

```sh
SITE_URL=https://localhost SITE_DOMAIN=localhost docker compose up -d --build
docker compose down   # para encerrar
```

## Como vai para produção

Produção usa o `compose.yaml` com dois contêineres: o app, sem porta exposta, e o Caddy, que cuida do HTTPS, dos cabeçalhos de segurança e do IP real dos visitantes. Os inscritos ficam em SQLite, num volume.

O caminho de uma mudança até o ar:

1. Push na `main`, inclusive as edições feitas pelo painel. O CI (`.github/workflows/ci.yml`) checa tipos, roda testes, build e smoke e publica a imagem `ghcr.io/laesaicev/app-laesa` com a tag do commit e `latest`.
2. Se, desde a última versão aprovada, mudou só conteúdo do painel, o próprio CI move a tag `aprovada` para a imagem nova. A regra do que conta como conteúdo está em `scripts/so-conteudo.mjs`.
3. Se mudou código, dependência ou configuração, o CI não promove. Alguém revisa o diff e roda o workflow "Promover para produção" (`.github/workflows/promover.yml`), que precisa da aprovação de um revisor do environment `producao`.
4. O servidor segue a tag `aprovada` e atualiza com `docker compose pull && docker compose up -d`, por cron ou à mão. Ele nunca usa `latest`.

Enquanto `aprovada` não existir, nada é promovido sozinho: a primeira promoção é manual.

O porquê dessa divisão está no [ADR 0004](docs/adr/0004-deploy-automatico-de-conteudo.md). Instalação no servidor, promoção, como desfazer uma mudança, backup e incidentes: [docs/operacao.md](docs/operacao.md). Checklist anual da nova Mesa: [docs/passagem-de-mandato.md](docs/passagem-de-mandato.md).

## Estrutura

```
.
├── src/
│   ├── pages/            /, /atividades, /processos-seletivos(/[slug]), /contato, /novidades, /privacidade, 404
│   │   ├── api/          contato.ts e inscricao.ts (rodam no servidor)
│   │   ├── avisos/       confirmar e descadastrar inscrição; itens.json (manifesto do que dá para avisar)
│   │   └── mesa/         tela de avisos da Mesa (roda no servidor; 404 sem PAINEL_AVISOS=true)
│   ├── components/       Nav, GitLog, Section (espinha do grafo), EditalPage, ContactForm, SubscribeForm…
│   ├── lib/              conteúdo, validação, e-mail, inscrição, SQLite, avisos, limite de envios
│   ├── scripts/          spine.ts (animação da linha de commit) e atividades.ts (ordem do dia e busca)
│   ├── data/             conteúdo fixo do estatuto e tipos
│   ├── styles/global.css tokens e estilos
│   ├── assets/uploads/   fotos enviadas pelo painel (recortadas no build)
│   └── icons/            ícones 24px
├── content/              conteúdo editável pelo painel (YAML)
├── public/               favicon, og.png e arquivos enviados pelo painel (public/uploads)
├── keystatic.config.ts   schema do painel
├── scripts/              avisar.ts (avisos no servidor), smoke.mjs (smoke test), so-conteudo.mjs (regra da promoção automática)
├── tests/                testes (Vitest)
├── Dockerfile · compose.yaml · deploy/   imagem, Caddy e script de backup
├── .github/workflows/    ci.yml (testes, build, imagem e promoção de conteúdo) e promover.yml (promoção manual)
├── docs/
│   ├── adr/                    0001 arquitetura · 0002 atividades · 0003 tela de avisos · 0004 deploy
│   ├── plano-implementacao.md  o que falta para publicar
│   ├── operacao.md             deploy, atualização, backup, troca de mandato, incidentes
│   ├── avisos.md               e-mails para os inscritos
│   ├── passagem-de-mandato.md  checklist anual da Mesa
│   ├── contrato-contato.md     campos e respostas das rotas de API
│   └── estatuto-2026.md        estatuto da liga (fonte de toda regra citada no site)
├── design/               protótipo HTML/CSS (origem das telas do Figma) e MOTION.md (spec da animação)
├── brand/                logos oficiais (horizontal, vertical, ícone) e avatares
├── DESIGN.md · PRODUCT.md                sistema visual e contexto do produto
└── .impeccable/          contrato da direção visual
```

Cores dos logos (`brand/logo`): `azul` #0A2BFF, `menta` #5CEAD2, `ciano` #1DD0F8, `navy` #043F63, `degrade-navy`, `degrade-azul`, `branco` e `preto`. O azul da interface é #0078D4 (ver DESIGN.md).

## Contribuir

- Mensagens de commit no formato `tipo: descrição`, em português: `feat: adiciona filtro de atividades`, `fix: corrige validação do formulário`, `docs: atualiza instruções de instalação`.
- Rode `npm test` e `npm run build` antes do push.
- Mudança de código só vai ao ar pelo workflow "Promover para produção", com o CI verde no commit promovido.
- Na troca da Mesa, siga [docs/passagem-de-mandato.md](docs/passagem-de-mandato.md).

## Licença

Uso exclusivo da LAESA, com todos os direitos reservados. Ninguém pode copiar, modificar, distribuir ou usar comercialmente este código, o design, a marca ou o conteúdo sem autorização por escrito da Mesa Diretora. Veja [LICENSE](LICENSE).
