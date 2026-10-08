# Operação: deploy, atualização e backup

O site roda com Docker, a pedido da coordenação (ADR 0001, plano A). São dois contêineres definidos em `compose.yaml`:

| Serviço | O que faz |
| --- | --- |
| `app` | o site: páginas pré-geradas e as rotas `/api/*` e `/avisos/*` (Node). Guarda os inscritos das novidades em SQLite, no volume `dados`. |
| `proxy` | Caddy: HTTPS automático (Let's Encrypt), compressão, cabeçalhos de segurança e limite de 64 KB nos formulários. Sobrescreve `X-Forwarded-For` com o IP real do visitante. |

O app não expõe porta: só o proxy (80 e 443) fica acessível de fora.

## Primeira instalação no servidor

Pré-requisitos (confirmar com o setor de tecnologia do iCEV, ADR 0001):
- Docker e Docker Compose instalados;
- portas 80 e 443 liberadas;
- o DNS de `laesa.icev.edu.br` apontando para o servidor;
- saída para `smtp.gmail.com` na porta 465;
- se houver registro CAA em `icev.edu.br`, ele precisa permitir o Let's Encrypt;
- se o iCEV tiver um proxy ou NAT na frente do servidor, informe o IP dele: o Caddy precisa de `trusted_proxies`. Sem isso, todos os visitantes dividiriam o mesmo limite de envios.

```sh
git clone https://github.com/LAESAicev/app-laesa.git && cd app-laesa
cp .env.example .env    # preencha: SITE_URL, SITE_DOMAIN, SMTP_PASS, INSCRICAO_SECRET…
openssl rand -hex 32    # gera o INSCRICAO_SECRET
docker compose up -d --build
docker compose ps       # app "healthy" e proxy "running"
```

O `.env` do servidor é o único lugar com segredos: a senha de app do Gmail e o `INSCRICAO_SECRET`. Ele não vai para o git nem para a imagem. Guarde uma cópia com a Mesa Diretora.

Se o iCEV já tiver um proxy próprio com HTTPS, remova o serviço `proxy` e publique o app só para a máquina local (`ports: ["127.0.0.1:4321:4321"]`). Esse proxy precisa:
- **sobrescrever** `X-Forwarded-For` com o IP real (no Nginx: `proxy_set_header X-Forwarded-For $remote_addr;`);
- limitar o corpo a 64 KB (`client_max_body_size 64k;`).

## Atualizar o site

Toda mudança na `main`, inclusive uma edição de conteúdo feita pelo painel, passa pelo CI (`.github/workflows/ci.yml`). Ele testa, gera o site e publica a imagem em `ghcr.io/laesaicev/app-laesa`. No servidor:

```sh
docker compose pull && docker compose up -d   # usa a imagem publicada pelo CI
# ou, sem o registry: git pull && docker compose up -d --build
```

Para atualizar sozinho, um cron com o primeiro comando, ou o [Watchtower](https://containrrr.dev/watchtower/), resolve. A escolha depende do que o iCEV permitir.

## Desfazer uma mudança

O conteúdo vive no git. Para voltar uma edição, reverta o commit no GitHub (`git revert <commit>`) e atualize o servidor. Para voltar uma versão inteira do site:

```sh
IMAGE=ghcr.io/laesaicev/app-laesa:<sha-do-commit> docker compose up -d
```

## Backup

Os únicos dados que não estão no git são os inscritos das novidades, no volume `dados` (`/data/laesa.db`). Eles são dados pessoais (LGPD): o backup **nunca** vai para dentro do repositório. O `.gitignore` bloqueia `*.db` e `backup-*`, mas salve fora da pasta do projeto mesmo assim.

```sh
deploy/backup.sh                 # salva em ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db (pasta só sua)
gpg --symmetric --cipher-algo AES256 ~/backups-laesa/laesa-*.db   # recomendado antes de guardar em outro lugar
```

O script faz uma cópia consistente com o site no ar: o `VACUUM INTO` lê um retrato do banco sem bloquear quem escreve.

Faça isso pelo menos uma vez por mês, ou peça ao iCEV para incluir o volume no backup do servidor. Os certificados HTTPS (volume `caddy_data`) se recriam sozinhos.

**Restaurar:**

```sh
docker compose stop app
docker run --rm -v app-laesa_dados:/data -v ~/backups-laesa:/b alpine cp /b/laesa-AAAA-MM-DD.db /data/laesa.db
docker run --rm -v app-laesa_dados:/data alpine sh -c 'rm -f /data/laesa.db-wal /data/laesa.db-shm; chown 1000:1000 /data/laesa.db'
docker compose start app
```

O nome do volume segue o padrão `<pasta-do-projeto>_dados`; confira com `docker volume ls`. Use sempre o volume nomeado: com uma pasta montada (`./dados:/data`), ela nasce com dono root e o SQLite não consegue escrever.

## Troca de mandato (rotatividade)

Os acessos são da LAESA, nunca de um aluno. A cada nova Mesa Diretora:

- **`.env` do servidor:**
  - a cópia oficial fica num cofre institucional (Bitwarden da organização ou uma pasta restrita do Drive do Workspace);
  - o dono fixo é o(a) orientador(a) ou o setor de tecnologia;
  - no servidor, `chmod 600 .env`, com dono sendo o usuário do deploy.
- **Senha de app do Gmail:** revogar a antiga em https://myaccount.google.com/apppasswords, gerar outra e atualizar o `SMTP_PASS`. A recuperação e a verificação em duas etapas da conta `laesa@somosicev.com` ficam presas ao(à) orientador(a), não ao celular de um aluno.
- **`INSCRICAO_SECRET`:** só troque se ele vazar, porque trocar invalida os links de descadastro já enviados por e-mail. Também deixa irreconhecíveis os códigos de quem se descadastrou nos últimos 30 dias, então um link de confirmação emitido antes do descadastro (vale 7 dias) volta a funcionar até vencer. Se precisar trocar, avise os inscritos no próximo envio.
- **Organização no GitHub:** pelo menos dois donos, um deles professor. Atualize o time `mesa-diretora`.
- **Servidor:** revise quem tem SSH e quem está no grupo `docker`. Estar nesse grupo equivale a ter root na máquina, inclusive para ler o `.env` com `docker inspect`.
- **Imagem no GitHub Container Registry:**
  - deixe o pacote `app-laesa` **público** (ele não contém segredos), para a VM baixar sem login;
  - se precisar ser privado, use um token de uma conta institucional, nunca de aluno.

## Testar localmente com Docker

```sh
SITE_DOMAIN=localhost docker compose up -d --build   # https://localhost (certificado local do Caddy)
docker compose logs -f app
docker compose down
```

## Painel em produção

> **Pendente (2026-10-07):** o código está pronto. A configuração abaixo fica para depois que o iCEV entregar o domínio e o servidor. Até lá, o painel roda só em `npm run dev`, no modo local.

Com o modo GitHub, o painel também fica no site publicado (`https://laesa.icev.edu.br/keystatic`):
- **Login:** é feito com a conta do GitHub, com a senha e a verificação em duas etapas da própria pessoa. O site não guarda senha nenhuma.
- **Quem salva:** cada edição vira um commit com o nome de quem editou, e só salva quem tem escrita no repositório `LAESAicev/app-laesa`. Um curioso consegue entrar, mas não consegue salvar nada.
- **Quando aparece no site:** o commit passa pelo CI, que gera uma imagem nova. A mudança aparece quando o servidor atualiza (`docker compose pull && docker compose up -d`, manual ou por cron).

Sem `PUBLIC_KEYSTATIC_GITHUB_REPO` no build, a imagem sai sem painel, e o painel continua só em `npm run dev`, no modo local.

### 1. Criar o GitHub App (uma vez, uns 10 minutos)

Faça com uma conta que seja **dona (Owner)** da organização LAESAicev, de preferência a conta institucional da LAESA, nunca a de um aluno. Confira em https://github.com/orgs/LAESAicev/people.

1. No seu computador, com o repositório clonado, coloque no `.env`:
   ```sh
   PUBLIC_KEYSTATIC_GITHUB_REPO=LAESAicev/app-laesa
   ```
2. Rode `npm run dev` e abra http://127.0.0.1:4321/keystatic. Aparece a tela **Keystatic Setup**:
   - **Deployed App URL:** `https://laesa.icev.edu.br`, ou o domínio que o iCEV confirmar;
   - **GitHub organization:** `LAESAicev`;
   - clique em **Create GitHub App**.
3. No GitHub, dê um nome ao App (ex.: `LAESA Painel`; o nome precisa ser único no GitHub) e confirme.
4. O GitHub volta para o painel, e o Keystatic grava no seu `.env`:
   - `KEYSTATIC_GITHUB_CLIENT_ID`
   - `KEYSTATIC_GITHUB_CLIENT_SECRET`
   - `KEYSTATIC_SECRET`
   - `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`

   O `.env` não vai para o git.
5. Reinicie (`npx astro dev stop && npm run dev`), abra `/keystatic` de novo e clique em **Install**. Escolha **Only select repositories → app-laesa**.
6. Nas configurações do App (https://github.com/organizations/LAESAicev/settings/apps):
   - **Advanced → Make private**, para que só a organização possa instalá-lo. Com o App público, o token de quem edita alcançaria outros repositórios onde terceiros o instalassem.
   - **Callback URL:** quando o site estiver no ar, deixe só `https://<domínio>/api/keystatic/github/oauth/callback` e apague as de `http://127.0.0.1`. Elas servem só para testar no computador.
7. Depois de copiar as credenciais para o servidor e para o cofre, **apague `KEYSTATIC_GITHUB_CLIENT_SECRET` do `.env` do seu computador.**

### 2. Ligar no site publicado

1. **Variáveis do repositório:** em Settings → Secrets and variables → Actions → **Variables**. Precisa de admin no repositório.
   - `PUBLIC_KEYSTATIC_GITHUB_REPO` = `LAESAicev/app-laesa`
   - `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` = o valor que o Keystatic gravou

   Elas são públicas. O próximo push gera a imagem com o painel.
2. **`.env` do servidor:** copie as três credenciais do passo 1.4 (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`) e as duas variáveis públicas acima. Depois rode `docker compose up -d`.
   - **Elas não vão para o GitHub Actions:** só o servidor as usa.
   - **Guarde uma cópia no cofre da LAESA,** junto com o resto do `.env`.
3. **O compose precisa de `TRUST_PROXY=1`, que é o padrão.** Sem isso, o retorno do login sai com `http://` e o GitHub recusa (`redirect_uri_mismatch`).

### 3. Quem pode editar

- **Time no GitHub:** crie o time `mesa-diretora` em https://github.com/orgs/LAESAicev/teams, com papel **Write** no `app-laesa`. Quem edita entra no time.
- **Primeiro acesso:** cada pessoa entra em `/keystatic`, clica em **Log in with GitHub** e autoriza o App uma vez.
- **Troca de mandato:** tire do time quem saiu e ponha quem entrou. Não há senha para trocar.
- **Proteção da organização:**
  - exija verificação em duas etapas de todos os membros (Settings → Authentication security);
  - bloqueie force-push e exclusão da `main` (Settings → Rules).

  Não exija PR na `main`, senão o painel não consegue salvar.
- **O token vale para o repositório inteiro, não só para o conteúdo.** Quem tem o token de um editor consegue mudar o código também. Por isso:
  - atualize o servidor só depois do CI verde, sem `pull` automático de qualquer commit;
  - não ligue a permissão `workflows` no App.
- **Vazamento ou suspeita:**
  - nas configurações do App, use **Advanced → Revoke all user tokens**. Um token já roubado vale no máximo 8 horas;
  - troque `KEYSTATIC_SECRET` e reinicie; quem estava logado só entra de novo;
  - se o `KEYSTATIC_GITHUB_CLIENT_SECRET` vazar, gere outro nas configurações do App e atualize o `.env` do servidor.
- **Proteções no site:**
  - as páginas públicas têm uma CSP que só roda scripts do próprio site, porque o token do editor fica legível no navegador, no mesmo domínio;
  - os arquivos enviados pelo painel (`/uploads`, SVGs) abrem em sandbox (`deploy/Caddyfile`).
- **Risco aceito:** o login do Keystatic não confere o parâmetro `state` do OAuth. Um atacante conseguiria deixar alguém logado no painel com a conta *dele*, mas não ganha acesso a nada. Se uma versão nova do Keystatic corrigir isso, atualize.

### Usar o modo local de novo

Para editar sem internet ou sem conta no GitHub, comente `PUBLIC_KEYSTATIC_GITHUB_REPO` no `.env` do seu computador. O painel volta a editar os arquivos da máquina, e depois é preciso fazer commit e push.
