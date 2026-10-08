# Site da LAESA

[![CI](https://github.com/LAESAicev/app-laesa/actions/workflows/ci.yml/badge.svg)](https://github.com/LAESAicev/app-laesa/actions/workflows/ci.yml)

Site da **Liga Acadêmica de Engenharia de Software Aplicada** (iCEV, Teresina-PI).

O design segue a direção *Grafo de Commits*: a página funciona como um `git log --graph`. A linha principal atravessa as seções, cada seção "faz commit" ao passar por ela, e as branches são as portas de entrada: entrar na liga, propor um projeto, receber as novidades.

- **Design:** [Figma: LAESA Site v2 e Componentes](https://www.figma.com/design/xBth5y7AzKE2UxvbGaXuzf?node-id=3046-758) · sistema visual em [DESIGN.md](DESIGN.md)
- **Arquitetura:** [ADR 0001](docs/adr/0001-arquitetura-do-site.md). É um único app Astro com o site, o painel de conteúdo e as rotas de API. Atividades pela data e sem banco: [ADR 0002](docs/adr/0002-atividades-pela-data.md).
- **Imagem Docker:** `ghcr.io/laesaicev/app-laesa`, publicada pelo CI a cada push na `main`.

**Status:** as fases 1 a 5 estão prontas (páginas, painel, animação, formulários, Docker e CI). Para publicar, faltam as respostas do iCEV sobre a hospedagem. Detalhes em [docs/plano-implementacao.md](docs/plano-implementacao.md).

## Começar

Requisitos: Node 24 e npm. Docker é opcional para desenvolver e necessário para o deploy.

```sh
npm install
cp .env.example .env   # contato, redes, domínio e e-mail (veja os comentários no arquivo)
npm run dev            # site em http://localhost:4321 e painel em http://localhost:4321/keystatic
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento, com o painel em `/keystatic` |
| `npm run dev:limpo` | reinicia o dev limpando o cache do Vite (painel em branco? use este) |
| `npm test` | testes: validação, rotas de contato e inscrição, links assinados, SQLite, ordem das atividades |
| `npm run build` | checa os tipos e gera `dist/` (páginas estáticas e servidor das rotas de API) |
| `npm run design` | regera o protótipo HTML (`design/dist`) usado no Figma |

O Astro 7 deixa o servidor de desenvolvimento rodando em segundo plano. Depois de mudar o `astro.config.mjs` ou o `.env`, reinicie com `npx astro dev stop && npm run dev`.

## Editar o conteúdo

Com `npm run dev` no ar, abra `/keystatic`. O painel edita os arquivos de `content/`, e o site atualiza na hora.

| No painel | O que muda no site |
| --- | --- |
| Configurações e status da seleção | aberto, em andamento ou finalizado: tag do menu, seção "Quer entrar?" da home e página de processos seletivos. Também o edital atual e o link do estatuto |
| Hero: git log | painel do topo da home (o primeiro commit é o HEAD) |
| Mesa Diretora | nome e foto de cada cargo (a foto é recortada sozinha no quadro 4:5) |
| Perguntas frequentes | FAQ da página de processos seletivos |
| Atividades e projetos | oficinas, cursos, eventos, pesquisas e projetos. A ordem e o status ("em breve", "inscrições abertas", "concluído") saem da **data**. A home mostra as 5 mais perto de hoje, e `/atividades` mostra todas, com busca e filtro por eixo ([ADR 0002](docs/adr/0002-atividades-pela-data.md)) |
| Editais | uma página por edital, com datas, vagas, PDF e modelo da carta |

Depois de editar, faça commit das mudanças em `content/`, `src/assets/uploads/` e `public/uploads/`. O CI publica a nova versão. Com o modo GitHub ligado, o painel também fica no site publicado, com login pelo GitHub, e cada edição vira um commit. Como ligar: [docs/operacao.md](docs/operacao.md#painel-em-produção).

Contato e redes sociais não ficam no código nem no painel: vêm de variáveis de ambiente (`PUBLIC_*` no `.env`).

## E-mails em desenvolvimento

O formulário de contato e a inscrição nas novidades enviam e-mail de verdade. Para testar sem mandar nada, use o [Mailpit](https://mailpit.axllent.org), que mostra numa página os e-mails que o site enviaria:

```sh
docker run -d --name laesa-mailpit -p 8025:8025 -p 1025:1025 \
  -e MP_SMTP_AUTH_ACCEPT_ANY=1 -e MP_SMTP_AUTH_ALLOW_INSECURE=1 axllent/mailpit
```

No `.env`: `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_USER=dev` e `SMTP_PASS=dev`. Para a inscrição, defina também `INSCRICAO_SECRET` (`openssl rand -hex 32`) e `INSCRITOS_STORE=memoria`. A caixa de entrada fica em http://localhost:8025.

O `.env` local deve apontar para o Mailpit. Fora de produção, o site recusa qualquer SMTP que não seja local, para um `.env` copiado do servidor não mandar e-mail de verdade. Para testar um envio real de propósito, defina `ENVIO_REAL=true` e apague a linha depois.

Para o envio real, use a conta Google Workspace da LAESA com uma senha de app (`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`). Redes de faculdade e empresa costumam bloquear as portas 465 e 587; nesse caso, teste em outra rede.

## Deploy (Docker)

Produção usa `compose.yaml` com dois contêineres:
- o app, que não expõe porta;
- o Caddy, que cuida do HTTPS automático, dos cabeçalhos de segurança e do IP real dos visitantes.

Os inscritos das novidades ficam em SQLite, num volume.

```sh
SITE_URL=https://localhost SITE_DOMAIN=localhost docker compose up -d --build   # testar localmente em https://localhost
```

Instalação no servidor, atualização, como desfazer uma mudança, backup (`deploy/backup.sh`), troca de mandato e painel em produção: [docs/operacao.md](docs/operacao.md). Checklist anual da nova Mesa: [docs/passagem-de-mandato.md](docs/passagem-de-mandato.md).

Mandar avisos por e-mail para os inscritos (comando no servidor): [docs/avisos.md](docs/avisos.md).

## Estrutura

```
.
├── src/
│   ├── pages/            /, /atividades, /processos-seletivos(/[slug]), /contato, /novidades, /privacidade, 404
│   │   ├── api/          contato.ts e inscricao.ts (rodam no servidor)
│   │   └── avisos/       confirmar e descadastrar inscrição (rodam no servidor)
│   ├── components/       Nav, GitLog, Section (espinha do grafo), EditalPage, ContactForm, SubscribeForm…
│   ├── lib/              conteúdo, validação compartilhada, e-mail, inscrição, SQLite, limite de envios
│   ├── scripts/          spine.ts (animação da linha de commit) e atividades.ts (ordem do dia e busca)
│   ├── data/             conteúdo fixo do estatuto e tipos
│   ├── styles/global.css tokens e estilos
│   ├── assets/uploads/   fotos enviadas pelo painel (recortadas no build)
│   └── icons/            ícones 24px
├── content/              conteúdo editável pelo painel (YAML)
├── public/               favicon e PDFs enviados pelo painel (public/uploads)
├── keystatic.config.ts   schema do painel
├── tests/                testes (Vitest)
├── Dockerfile · compose.yaml · deploy/   imagem, Caddy e script de backup
├── .github/workflows/ci.yml              testes, build e imagem
├── docs/
│   ├── adr/                              0001: arquitetura e pendências com o iCEV · 0002: atividades pela data
│   ├── plano-implementacao.md            o que falta
│   ├── operacao.md                       deploy, backup, troca de mandato
│   ├── avisos.md                         e-mails para os inscritos
│   ├── passagem-de-mandato.md            checklist anual da Mesa
│   ├── contrato-contato.md               campos e respostas das rotas de API
│   └── estatuto-2026.md                  estatuto da liga (fonte de toda regra citada no site)
├── design/               protótipo HTML/CSS (origem das telas do Figma) e MOTION.md (spec da animação)
├── brand/                logos oficiais (horizontal, vertical, ícone) e avatares
├── DESIGN.md · PRODUCT.md                sistema visual e contexto do produto
└── .impeccable/          contrato da direção visual
```

Cores dos logos (`brand/logo`): `azul` #0A2BFF · `menta` #5CEAD2 · `ciano` #1DD0F8 · `navy` #043F63 · `degrade-navy` · `degrade-azul` · `branco` · `preto`. O azul da interface do site é #0078D4 (ver DESIGN.md).

## Pendências

No site, o conteúdo provisório aparece com um selo tracejado ("exemplo", "[data]").

**Conteúdo (LAESA, pelo painel)**
- [ ] Edital 2026.2: link de inscrição e PDF do edital (datas, vagas e modelo da carta já estão no painel)
- [ ] Mesa Diretora: Vice-Presidência ainda marcada como provisória e sem foto; Diretoria de Projetos sem nome e sem foto
- [ ] Editais anteriores reais (ou remover os de exemplo)
- [ ] Prazo de retenção das mensagens e revisão da página de privacidade pelo iCEV

**Infraestrutura**
- [ ] Respostas do iCEV: DNS de `laesa.icev.edu.br`, portas 80 e 443, saída para o Gmail (porta 465), proxy na frente do servidor ([ADR 0001](docs/adr/0001-arquitetura-do-site.md))
- [x] Imagem `ghcr.io/laesaicev/app-laesa` pública (o servidor baixa sem login)
- [ ] Painel em produção: criar o GitHub App e ligar no servidor. O código está pronto, mas isso fica **para depois do domínio e do servidor do iCEV**. Passo a passo em [docs/operacao.md](docs/operacao.md#painel-em-produção)
- [x] Repositório na organização [LAESAicev](https://github.com/LAESAicev)
- [x] E-mail, Instagram, LinkedIn e GitHub da LAESA (variáveis de ambiente)

## Contribuir

- Mensagens de commit no formato `tipo: descrição`, em português: `feat: adiciona filtro de atividades`, `fix: corrige validação do formulário`, `docs: atualiza instruções de instalação`.
- Rode `npm test` e `npm run build` antes do push.
- Só atualize o servidor com o CI verde no commit que vai para o ar.
- Na troca da Mesa, siga [docs/passagem-de-mandato.md](docs/passagem-de-mandato.md).

## Licença

Uso exclusivo da LAESA, com todos os direitos reservados. Ninguém tem permissão para copiar, modificar, distribuir ou usar comercialmente este código, o design, a marca ou o conteúdo sem autorização por escrito da Mesa Diretora. Veja [LICENSE](LICENSE).
