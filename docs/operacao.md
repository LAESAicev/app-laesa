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
- **`INSCRICAO_SECRET`:** só troque se ele vazar, porque trocar invalida os links de descadastro já enviados por e-mail. Se precisar trocar, avise os inscritos no próximo envio.
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

## Painel em produção (pendente)

Hoje o painel (`/keystatic`) roda em `npm run dev`, editando os arquivos da máquina. Para a Mesa editar direto no site publicado:

1. Transferir este repositório para a organização [LAESAicev](https://github.com/LAESAicev).
2. Criar um GitHub App da organização para o Keystatic ([guia oficial](https://keystatic.com/docs/github-mode)) e instalá-lo só neste repositório.
3. Definir `PUBLIC_KEYSTATIC_GITHUB_REPO=LAESAicev/app-laesa`. Isso já troca o painel para o modo GitHub (`keystatic.config.ts`).
4. Ligar o painel no build de produção, lendo as credenciais do App (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`) em **tempo de execução**. Elas não podem ficar gravadas na imagem; esse ajuste no código entra junto com o passo 2.

Quem edita precisa estar no time da organização com acesso ao repositório. Na troca de mandato, basta tirar e pôr pessoas no time.
