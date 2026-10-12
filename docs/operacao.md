# Operação: deploy, atualização e backup

O site roda com Docker, a pedido da coordenação (ADR 0001, plano A). São dois contêineres definidos em `compose.yaml`:

| Serviço | O que faz |
| --- | --- |
| `app` | o site: páginas pré-geradas, as rotas `/api/*` e `/avisos/*` e, se ligada, a tela de avisos (`/mesa`), em Node. Guarda os inscritos das novidades em SQLite, no volume `dados`. |
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

Depois de mudar qualquer valor no `.env`, rode `docker compose up -d`: ele recria o contêiner com o ambiente novo. `docker compose restart` **não** relê o `env_file` e o app continua com os valores antigos.

Se o iCEV já tiver um proxy próprio com HTTPS, remova o serviço `proxy` e publique o app só para a máquina local (`ports: ["127.0.0.1:4321:4321"]`). Esse proxy precisa:
- **sobrescrever** `X-Forwarded-For` com o IP real (no Nginx: `proxy_set_header X-Forwarded-For $remote_addr;`);
- limitar o corpo a 64 KB (`client_max_body_size 64k;`).

## Checklist para pedir ao iCEV

Perguntas para o setor de tecnologia antes da instalação:
- **Máquina:** uma VM dedicada ao site ou um host de contêineres compartilhado? Docker e Docker Compose são permitidos?
- **Acesso:** SSH só por chave, e para quais pessoas? Quem entrar no grupo `docker` tem, na prática, root na máquina (e lê o `.env`). Prefira o mínimo de pessoas, de preferência um(a) professor(a) e alguém do iCEV.
- **Firewall:** entrada só nas portas 80 e 443 (TCP, e 443/UDP para HTTP/3) e no SSH; saída para `ghcr.io` (imagens) e `smtp.gmail.com:465` (e-mails).
- **Atualizações de segurança automáticas** do sistema operacional (ex.: `unattended-upgrades`), e quem reinicia a máquina quando precisar.
- **Recursos:** quanta RAM e CPU sobram. O site usa cerca de 150 MB em repouso; o `compose.yaml` limita o app a 384 MB e 0,5 CPU, e o proxy a 128 MB. Com 1 GB de RAM livre há folga.
- **Backup:** o iCEV inclui o volume Docker `dados` no backup do servidor? Se sim, com retenção de no máximo 30 dias (são dados pessoais, ver [Backup](#backup)).
- **DNS:** o domínio do site (ex.: `laesa.icev.edu.br`) apontando para o servidor, e o registro CAA, se existir, liberando o Let's Encrypt.
- **E-mail (`somosicev.com`):** SPF, DKIM e DMARC configurados no domínio. O Gmail exige os três de quem envia em volume, e os avisos das novidades vão para muitos inscritos de uma vez; sem eles, os avisos caem no spam ou são recusados.
- **Proxy ou NAT na frente do servidor:** se houver, o IP dele (para `trusted_proxies` no `deploy/Caddyfile`).

## Atualizar o site

Toda mudança na `main`, inclusive uma edição de conteúdo feita pelo painel, passa pelo CI (`.github/workflows/ci.yml`). Ele testa, gera o site e publica a imagem em `ghcr.io/laesaicev/app-laesa` com a tag do commit (`:<sha>`) e `latest`. O servidor não usa nenhuma das duas: ele segue a tag **`aprovada`** (decisão no [ADR 0004](adr/0004-deploy-automatico-de-conteudo.md)).
- **Só conteúdo:** se, desde a última versão aprovada, mudaram apenas arquivos que o painel grava, o próprio CI move `aprovada` para a imagem nova (job "Promover se for só conteúdo").
- **Qualquer outra coisa** (código, dependências, configuração, workflows): o CI não promove e escreve no resumo do run "Há mudança de código desde a última versão aprovada: promova à mão", com a lista dos arquivos. Alguém revisa e promove ([Promover à mão](#promover-à-mão)).

Conta como conteúdo, comparando com a última versão aprovada (e não com o commit anterior):
- `content/**/*.yaml`;
- `src/assets/uploads/**` em `jpg`, `jpeg`, `png`, `webp` ou `avif` (fotos);
- `public/uploads/**` em `pdf`, `doc`, `docx`, `odt`, `xls`, `xlsx`, `ods`, `ppt`, `pptx`, `odp`, `txt`, `csv`, `jpg`, `jpeg`, `png`, `webp`, `avif` ou `gif`.

SVG, HTML e qualquer outro tipo enviado pelo painel vão ao ar só promovidos à mão. Link simbólico, arquivo executável e arquivo renomeado de fora dessas pastas também. A regra está em `scripts/so-conteudo.mjs`, e o CI usa a cópia do commit aprovado: mudar a regra exige uma promoção manual.

No servidor:

```sh
docker compose pull && docker compose up -d   # baixa a imagem "aprovada"
```

O caminho sem o registry (`git pull && docker compose up -d --build`) gera a imagem com o código da `main` como estiver, sem passar pela aprovação. Use só depois de revisar o diff.

### Promover à mão

1. Descubra a versão aprovada: está no resumo do último run do CI, ou rode
   `docker buildx imagetools inspect --raw ghcr.io/laesaicev/app-laesa:aprovada | jq -r '.annotations["org.opencontainers.image.revision"]'`.
2. Revise o diff em `https://github.com/LAESAicev/app-laesa/compare/<sha-aprovado>...main` e confira o CI verde do commit a promover.
3. Em Actions → **Promover para produção** → Run workflow, com a branch `main`. O campo SHA vazio promove o último commit da `main`; para outro commit, use o SHA completo (40 caracteres).
4. Um revisor do environment `producao` aprova o run. O workflow confere o CI verde e a imagem do commit e move `aprovada`, sem gerar a imagem de novo.
5. O servidor pega a versão nova no próximo cron, ou na hora com `docker compose pull && docker compose up -d`.

**Primeira vez:** enquanto `aprovada` não existir, o CI não promove nada sozinho, e o `docker compose pull` do servidor falha. Faça uma promoção manual antes de instalar o servidor.

### Configurar a aprovação (uma vez, precisa de admin)

Em Settings → Environments → **New environment**, crie `producao`:
- **Required reviewers:** uma ou duas pessoas de confiança, de preferência o(a) orientador(a) e quem cuida do código. Evite pôr o time inteiro da Mesa: a aprovação é a barreira contra um token de editor roubado.
- **Prevent self-review:** ligado. Quem disparou o workflow não aprova o próprio run.
- **Allow administrators to bypass:** desligado.
- **Deployment branches and tags:** "Selected branches and tags", só `main`.

Crie o environment antes do primeiro uso: se ele não existir, o GitHub cria um vazio na primeira execução, sem revisor nenhum. Revisores obrigatórios em repositório privado podem exigir um plano pago do GitHub; em repositório público, estão em todos os planos (confira na tela, ao criar).

### De onde vêm `SITE_URL` e as variáveis `PUBLIC_*` da imagem

Esses valores entram no HTML **no build**. A imagem publicada pelo CI usa as Variables do repositório (Settings → Secrets and variables → Actions → **Variables**): `SITE_URL`, `PUBLIC_CONTACT_EMAIL` e as `PUBLIC_*` das redes. O `.env` do servidor **não muda** uma imagem baixada com `docker compose pull`: ele só vale para os segredos em tempo de execução, ou para um build local com `docker compose up -d --build`.

Enquanto o domínio não estiver definido, o CI publica com o fallback do `ci.yml` (`https://laesa.icev.edu.br`) e deixa um aviso amarelo no run ("SITE_URL não definido"). Quando o domínio sair:
1. crie `SITE_URL` e `PUBLIC_CONTACT_EMAIL` nas Variables do repositório (precisa de admin);
2. para tornar obrigatório, no passo "Confere variáveis do GitHub" do `ci.yml` troque cada linha pelo formato `[ -n "$VAR_SITE_URL" ] || { echo "::error::defina SITE_URL"; exit 1; }`. Assim o CI não publica mais imagem sem elas.

### Atualizar sozinho ou à mão

Como o servidor segue `aprovada`, um cron no host vale com o painel ligado ou desligado: código novo só chega lá depois de uma promoção manual. Exemplo, com `crontab -e` do usuário do deploy, a cada 30 minutos:

```sh
*/30 * * * * cd /opt/app-laesa && (docker compose pull -q && docker compose up -d) 2>&1 | logger -t atualiza-laesa
```

O resultado sai em `journalctl -t atualiza-laesa`. Sem cron, atualize à mão com os mesmos dois comandos.

Não use Watchtower nem outro serviço que atualize contêineres: ele precisa do socket do Docker (equivale a root). Também não aponte o servidor para `latest`: ela é a última imagem da `main`, sem revisão nenhuma.

## Desfazer uma mudança

O conteúdo vive no git. Para voltar uma edição, reverta o commit no GitHub (`git revert <commit>`). Se a edição só mexia em conteúdo, o revert também vai ao ar sozinho; se o código já promovido estava envolvido, o revert é mudança de código e precisa de [promoção manual](#promover-à-mão).

Para voltar uma versão inteira do site, há dois caminhos, ambos pelo SHA completo de um commit bom (40 caracteres, aparece no commit do GitHub e no CI):
- **Pelo GitHub:** rode **Promover para produção** com esse SHA. A tag `aprovada` volta para ele, e o servidor pega no próximo cron (ou na hora, com `docker compose pull && docker compose up -d`).
- **Pelo servidor**, quando não dá para esperar o GitHub ou a aprovação: fixe a imagem no `.env`.
  ```sh
  # no .env:  IMAGE=ghcr.io/laesaicev/app-laesa:<sha-completo-do-commit>
  docker compose pull app && docker compose up -d
  ```
  Deixe o `IMAGE` no `.env` até a `aprovada` estar boa de novo. Só com `IMAGE=... docker compose up -d` na linha de comando, o próximo `pull` (manual ou do cron) volta para a `aprovada`. Resolvido, apague a linha `IMAGE` do `.env` e rode `docker compose pull && docker compose up -d`.

## Backup

Os únicos dados que não estão no git são os inscritos das novidades, no volume `dados` (`/data/laesa.db`). Eles são dados pessoais (LGPD): o backup **nunca** vai para dentro do repositório. O `.gitignore` bloqueia `*.db` e `backup-*`, mas salve fora da pasta do projeto mesmo assim.

```sh
deploy/backup.sh   # salva em ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db (pasta e arquivo só seus) e imprime o caminho
gpg --symmetric --cipher-algo AES256 ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db && rm ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db
```

Use no `gpg` o caminho exato que o script imprimiu: ele já mostra o comando pronto. Guarde a senha do `gpg` no cofre da LAESA, junto com o `.env`.

O script faz uma cópia consistente com o site no ar: o `VACUUM INTO` lê um retrato do banco sem bloquear quem escreve. Se falhar no meio, ele apaga o arquivo parcial e a cópia temporária dentro do contêiner.

**Retenção de 30 dias (LGPD):** a cada backup bem-sucedido, o script apaga da pasta de destino os `laesa-*.db` e `laesa-*.db.gpg` com mais de 30 dias. Cópias levadas para outro lugar (Drive, HD externo, backup do iCEV) precisam seguir a mesma regra, apagadas à mão ou combinadas com quem cuida delas.

**Agendar no servidor (cron do host):** rode `crontab -e` com o usuário do deploy e acrescente estas linhas (backup todo dia às 3h15 e limpeza dos avisos às 3h30; troque `/opt/app-laesa` pela pasta do projeto):

```sh
15 3 * * * cd /opt/app-laesa && deploy/backup.sh 2>&1 | logger -t backup-laesa
30 3 * * * cd /opt/app-laesa && docker compose exec -T app node scripts/avisar.ts limpar 2>&1 | logger -t avisos-laesa
```

O resultado aparece em `journalctl -t backup-laesa` (ou em `/var/log/syslog`). A segunda linha aplica a retenção de 30 dias dos registros de entrega dos avisos ([avisos.md](avisos.md#dados-guardados)) e dos códigos de descadastro mesmo em semanas sem nenhum comando de aviso nem inscrição; o resultado sai em `journalctl -t avisos-laesa`. O cron não criptografa, porque o `gpg` pediria a senha: os `.db` ficam na pasta `~/backups-laesa` (permissão 700) e devem ser criptografados antes de sair do servidor. Sem cron, faça o backup pelo menos uma vez por mês, ou peça ao iCEV para incluir o volume no backup do servidor. Os certificados HTTPS (volume `caddy_data`) se recriam sozinhos.

**Restaurar:**

```sh
gpg -d -o ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db.gpg   # se estiver criptografado
docker compose stop app
docker run --rm -v app-laesa_dados:/data -v ~/backups-laesa:/b alpine cp /b/laesa-AAAA-MM-DD-HHMM.db /data/laesa.db
docker run --rm -v app-laesa_dados:/data alpine sh -c 'rm -f /data/laesa.db-wal /data/laesa.db-shm; chown 1000:1000 /data/laesa.db'
docker compose start app
rm ~/backups-laesa/laesa-AAAA-MM-DD-HHMM.db   # se você decriptou só para restaurar
```

O nome do volume segue o padrão `<pasta-do-projeto>_dados`; confira com `docker volume ls`. Use sempre o volume nomeado: com uma pasta montada (`./dados:/data`), ela nasce com dono root e o SQLite não consegue escrever.

## Troca de mandato (rotatividade)

Os acessos são da LAESA, nunca de um aluno. A cada nova Mesa Diretora:

- **`.env` do servidor:**
  - a cópia oficial fica num cofre institucional (Bitwarden da organização ou uma pasta restrita do Drive do Workspace);
  - o dono fixo é o(a) orientador(a) ou o setor de tecnologia;
  - no servidor, `chmod 600 .env`, com dono sendo o usuário do deploy.
- **Senha de app do Gmail:** revogar a antiga em https://myaccount.google.com/apppasswords, gerar outra e atualizar o `SMTP_PASS`. A recuperação e a verificação em duas etapas da conta `laesa@somosicev.com` ficam presas ao(à) orientador(a), não ao celular de um aluno.
- **`INSCRICAO_SECRET`:** só troque se ele vazar, porque trocar invalida os links de descadastro já enviados por e-mail. Também deixa irreconhecíveis os códigos de quem se descadastrou nos últimos 30 dias, então um link de confirmação emitido antes do descadastro (vale 7 dias) volta a funcionar até vencer. Se precisar trocar, avise os inscritos no próximo envio. Antes de trocar, conclua ou cancele os avisos em andamento (`avisar.ts status`): com o segredo novo, o `retomar` recusa um envio começado com o antigo ([avisos.md](avisos.md#trocar-o-inscricao_secret)).
- **Organização no GitHub:** pelo menos dois donos, um deles professor. Atualize o time `mesa-diretora`.
- **Tela de avisos:** quem tem a senha da caixa da LAESA consegue entrar e mandar avisos. Troque a senha (e confira a verificação em duas etapas) quando alguém sai, e encerre as sessões com `avisar.ts sair-todos` ([Tela de avisos](#tela-de-avisos)).
- **Servidor:** revise quem tem SSH e quem está no grupo `docker`. Estar nesse grupo equivale a ter root na máquina, inclusive para ler o `.env` com `docker inspect`.
- **Imagem no GitHub Container Registry:**
  - deixe o pacote `app-laesa` **público** (ele não contém segredos), para a VM baixar sem login;
  - se precisar ser privado, use um token de uma conta institucional, nunca de aluno.

## Quando algo der errado

Um sintoma por linha, com o primeiro comando a rodar na pasta do site no servidor.

- Site fora do ar: `docker compose ps` (o app precisa estar `healthy`; o proxy só sobe depois disso), `docker compose logs --tail=100 app` e o resultado do healthcheck com `docker inspect --format '{{json .State.Health}}' $(docker compose ps -q app)`. Se `docker inspect --format '{{.State.OOMKilled}}' $(docker compose ps -q app)` der `true`, suba o `mem_limit` do app para `512m` no `compose.yaml`.
- Formulário responde 503: falta variável no `.env` (`SMTP_USER` e `SMTP_PASS`; na inscrição, também `INSCRICAO_SECRET`). Confira com `docker compose logs app | grep -i indispon`, corrija o `.env` e rode `docker compose up -d`.
- Formulário responde 500: a senha de app está errada ou a porta 465 está bloqueada (nesse caso a resposta demora uns 10 segundos). `docker compose logs app | grep "falha ao enviar"` mostra o código do erro, e `nc -vz smtp.gmail.com 465` testa a saída do servidor.
- Certificado HTTPS não sai: `docker compose logs proxy`. Confira se `dig +short laesa.icev.edu.br` devolve o IP do servidor, se `dig +short CAA icev.edu.br` vem vazio ou inclui `letsencrypt.org` e se as portas 80 e 443 estão abertas para a internet.
- `/mesa` responde 404: a tela está desligada (`PAINEL_AVISOS` sem `true`) ou o app não está com `INSCRITOS_STORE=sqlite`. No segundo caso, `docker compose logs app | grep "\[mesa\]"` mostra o aviso. Ver [Tela de avisos](#tela-de-avisos).
- Na tela de avisos, todo botão responde 403 ("Pedido recusado."): a origem do navegador não bate com o `SITE_URL` da imagem. Acontece com a imagem gerada com o fallback do CI num domínio diferente, com `http` em vez de `https`, com `www` ou porta diferente, ou com um proxy que apaga o cabeçalho `Origin`. Corrija o `SITE_URL` nas Variables do GitHub e gere a imagem de novo (ver [De onde vêm `SITE_URL`…](#de-onde-vêm-site_url-e-as-variáveis-public_-da-imagem)).
- O link de entrada da tela não chega: `docker compose logs app | grep "\[mesa\]"`. "barrado pelo limite por IP" e "já há 5 links valendo" passam em 15 minutos; "barrado pelo limite diário" pode durar até 24 horas; "falha ao enviar o link de entrada" é problema no SMTP (mesmas causas do formulário com 500). Para liberar a entrada na hora, rode `docker compose restart app` (zera os limites, que ficam na memória) e `docker compose exec app node scripts/avisar.ts sair-todos` (apaga os links pendentes e também encerra as sessões abertas). Reiniciar interrompe um envio em andamento, que depois precisa de Retomar. Até lá, o comando continua mandando avisos ([avisos.md](avisos.md#pelo-comando-no-servidor)).
- Aviso pausado: `docker compose exec app node scripts/avisar.ts status` mostra o motivo. Resolvido o problema, `docker compose exec app node scripts/avisar.ts retomar <envio>` ([avisos.md](avisos.md#acompanhar-pausar-e-cancelar)).
- O `.env` vazou: troque todos os segredos dele, seguindo [Troca de mandato](#troca-de-mandato-rotatividade) (inclusive o `INSCRICAO_SECRET`, com os efeitos descritos lá) e, se o painel estiver ligado, [Vazamento ou suspeita](#3-quem-pode-editar). Depois rode `docker compose up -d`.

## Tela de avisos

A tela (`/mesa`) deixa a Mesa preparar, testar e enviar avisos pelo navegador, sem SSH. O uso está em [avisos.md](avisos.md#pela-tela-de-avisos) e a decisão, com os riscos aceitos, no [ADR 0003](adr/0003-tela-de-avisos.md).

### Ligar e desligar

Antes de ligar, confira:
- o envio de e-mail funciona (o formulário de contato envia): o link de entrada vai por e-mail;
- a imagem foi gerada com o `SITE_URL` do domínio real. A tela recusa todo formulário que não venha dessa origem;
- `PUBLIC_CONTACT_EMAIL` é a caixa da LAESA: é para ela que vão os links de entrada e os testes;
- a conta da caixa tem verificação em duas etapas.

No `.env` do servidor:

```sh
PAINEL_AVISOS=true
```

Depois, `docker compose up -d`. O `compose.yaml` já define `INSCRITOS_STORE=sqlite`, que a tela exige (sessões e links ficam no mesmo banco dos inscritos). Para conferir:

```sh
curl -sI https://laesa.icev.edu.br/mesa/entrar   # 200, com cache-control: no-store e x-robots-tag: noindex, nofollow
```

Para desligar, apague a linha (ou use `false`) e rode `docker compose up -d`. Com a tela desligada, `/mesa` responde 404 e o comando `avisar.ts` continua funcionando.

O envio feito pela tela roda dentro do processo do site. Atualizar o site no meio de um envio interrompe o envio, que fica parado até alguém clicar em Retomar ([avisos.md](avisos.md#acompanhar-pausar-retomar-e-cancelar)). Se der, atualize sem envio em andamento.

### Encerrar todas as sessões

Na saída de um membro ou em qualquer suspeita de acesso indevido:

```sh
docker compose exec app node scripts/avisar.ts sair-todos
```

Encerra todas as sessões e invalida os links de entrada ainda não usados. O botão "Sair de todos os navegadores", no topo da tela, faz o mesmo. Quem ainda tem a senha da caixa da LAESA consegue pedir um link novo, então troque a senha também ([passagem-de-mandato.md](passagem-de-mandato.md)).

### Proxy

O `deploy/Caddyfile` põe `Cache-Control: no-store` e `X-Robots-Tag: noindex, nofollow` em `/mesa`, e a tela segue com a mesma CSP estrita das páginas públicas. O app manda esses dois cabeçalhos por conta própria. Um proxy do iCEV no lugar do Caddy precisa repassar os cabeçalhos `Origin` e `Sec-Fetch-Site` sem mexer, senão todo formulário da tela responde 403.

### Testar na sua máquina

Use o Mailpit ([README](../README.md#e-mails-em-desenvolvimento)): o link de entrada e o teste aparecem em http://localhost:8025. A tela lê a lista do que está publicado (`dist/client/avisos/itens.json`), que só existe depois de um build.

Com `npm run dev`, no `.env` local:

```sh
PAINEL_AVISOS=true
INSCRITOS_STORE=sqlite
INSCRITOS_DB=./data/laesa.db
INSCRICAO_SECRET=...   # openssl rand -hex 32
# e o SMTP do Mailpit (SMTP_HOST=localhost, SMTP_PORT=1025, SMTP_USER=dev, SMTP_PASS=dev)
```

```sh
npm run build   # gera dist/client/avisos/itens.json
npm run dev     # abra http://localhost:4321/mesa/entrar
```

Em dev, a origem aceita é a do próprio servidor. Os cookies da tela são `Secure`; Chrome e Firefox aceitam esse tipo de cookie em `http://localhost`. No Safari não testamos.

Com o servidor gerado, a origem aceita é a do `SITE_URL` usado no build. Gere com o endereço local e passe as variáveis no ambiente (`env` funciona no bash, no zsh e no fish):

```sh
env SITE_URL=http://localhost:4321 npm run build
env PAINEL_AVISOS=true INSCRITOS_STORE=sqlite INSCRITOS_DB=./data/laesa.db INSCRICAO_SECRET=... \
  SMTP_HOST=localhost SMTP_PORT=1025 SMTP_USER=dev SMTP_PASS=dev HOST=localhost PORT=4321 node dist/server/entry.mjs
```

Abra em `http://localhost:4321` (não em `127.0.0.1`: a origem precisa ser igual à do `SITE_URL`). Um build com o `SITE_URL` de produção recusa os formulários com 403 nesse teste.

O smoke do CI (`node scripts/smoke.mjs`) confere só o portão: 404 com a tela desligada e, ligada, 303 sem sessão e 403 em POST sem `Origin`.

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
- **Quando aparece no site:** o commit passa pelo CI, que gera uma imagem nova e, se desde a última versão aprovada só mudou conteúdo, a promove sozinho. O servidor pega no próximo cron, em até uns 30 minutos (ver [Atualizar o site](#atualizar-o-site)). Se houver código esperando promoção, a edição fica parada junto com ele até alguém promover.

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
- **O token vale para o repositório inteiro, não só para o conteúdo.** Quem tem o token de um editor consegue mudar o código e mover tags do git também. Por isso:
  - código só vai ao ar promovido à mão, com aprovação no environment `producao` ([Atualizar o site](#atualizar-o-site)). A versão aprovada fica registrada na imagem do GHCR, que o token do painel não alcança, e não numa tag do git;
  - o App do Keystatic é criado só com `contents: write`, `metadata: read` e `pull_requests: read`. Não acrescente `workflows`, `actions` nem `administration`: com `workflows`, o token mudaria a regra de promoção; com `actions`, dispararia workflows.
- **Vazamento ou suspeita:**
  - nas configurações do App, use **Advanced → Revoke all user tokens**. Um token já roubado vale no máximo 8 horas;
  - confira os commits recentes da `main` e reverta o que não foi feito por vocês. Conteúdo malicioso pode ter ido ao ar sozinho; código, só se alguém promoveu;
  - se entrou código estranho na `main`, mesmo sem promoção, ele rodou no CI: apague os caches do Actions (Actions → Caches, ou `gh cache delete --all`) antes da próxima promoção;
  - troque `KEYSTATIC_SECRET` no `.env` e rode `docker compose up -d`; quem estava logado só entra de novo;
  - se o `KEYSTATIC_GITHUB_CLIENT_SECRET` vazar, gere outro nas configurações do App e atualize o `.env` do servidor.
- **Proteções no site:**
  - as páginas públicas têm uma CSP que só roda scripts do próprio site, porque o token do editor fica legível no navegador, no mesmo domínio;
  - os arquivos enviados pelo painel (`/uploads`, SVGs) abrem em sandbox (`deploy/Caddyfile`).
- **Risco aceito:** o login do Keystatic não confere o parâmetro `state` do OAuth. Um atacante conseguiria deixar alguém logado no painel com a conta *dele*, mas não ganha acesso a nada. Se uma versão nova do Keystatic corrigir isso, atualize.

### Usar o modo local de novo

Para editar sem internet ou sem conta no GitHub, comente `PUBLIC_KEYSTATIC_GITHUB_REPO` no `.env` do seu computador. O painel volta a editar os arquivos da máquina, e depois é preciso fazer commit e push.
