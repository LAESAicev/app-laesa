# ADR 0004: Conteúdo vai ao ar sozinho; código, só promovido à mão

- **Status:** aceita
- **Data:** 2026-10-12
- **Contexto da decisão:** "opção 2" de deploy, aprovada pela Bea em 2026-10-12. Uso em [operacao.md](../operacao.md#atualizar-o-site).

## Contexto

Com o painel em produção (modo GitHub, ADR 0001), cada edição vira um commit na `main`. O token do editor tem `contents: write` no repositório inteiro: quem o roubar muda código também. Até aqui a regra era atualizar o servidor à mão, depois de revisar o diff. Funcionava, mas toda edição de texto ou PDF ficava esperando alguém com SSH.

Queríamos que uma mudança só de conteúdo fosse ao ar sozinha e que uma mudança de código continuasse exigindo uma pessoa.

## Decisões

1. **O servidor segue a tag `aprovada` da imagem no GHCR.** O `compose.yaml` usa `ghcr.io/laesaicev/app-laesa:aprovada` por padrão. Com isso, o cron de atualização volta a valer com o painel ligado. `IMAGE=<sha>` no `.env` continua fixando uma versão.

2. **O CI promove sozinho quando só mudou conteúdo.** Depois do build, dos testes, do smoke e da imagem publicada, o job "Promover se for só conteúdo" compara a árvore do commit novo com a do **último commit aprovado** (`git diff --raw -z --no-renames`). Comparar com o commit anterior deixaria um commit de conteúdo carregar junto um commit de código ainda não revisado. Se todos os arquivos estão na lista do painel, a imagem do commit é retagueada como `aprovada`, sem gerar de novo.
   - A lista (YAML em `content/`, fotos em `src/assets/uploads/`, documentos em `public/uploads/`) e a decisão ficam em `scripts/so-conteudo.mjs`, testado em `tests/so-conteudo.test.ts`.
   - O CI roda o script **como estava no commit aprovado**. Um commit novo nunca decide sobre si mesmo, e nada da decisão lê arquivo de `content/` ou `public/`.
   - Link simbólico, executável, submódulo e SVG/HTML/JS em uploads ficam de fora. `--no-renames` faz um arquivo movido de `src/` para `content/` aparecer como apagado em `src/`.
   - Sem versão aprovada ainda, não promove: a primeira promoção é manual.

3. **Código vai ao ar pelo workflow "Promover para produção".** Ele recebe um SHA (padrão: o último da `main`), exige o CI verde de um push na `main` e a imagem publicada, e passa pelo environment `producao`, com revisores obrigatórios e sem autoaprovação (configurados na interface do GitHub). Serve também para voltar a uma versão anterior.

4. **A versão aprovada fica registrada na própria imagem, e não numa tag do git.** A promoção grava o SHA como anotação do índice (`org.opencontainers.image.revision`) e o CI lê dali. O desenho inicial usava uma tag `deploy/aprovada` no git, mas `contents: write`, que o token do painel tem, move tags: o atacante apontaria a tag para o próprio commit e o próximo commit de conteúdo seria promovido junto. No GHCR, quem publica é o `GITHUB_TOKEN` dos workflows.

5. **Sem segredo novo.** Tudo usa o `GITHUB_TOKEN`, com `packages: write` só nos jobs que retagueiam e `actions: read` só para conferir o CI. Nenhum job precisa de `contents: write`.

## Alternativas descartadas

- **Tag do git como marcador:** movível pelo token do editor (decisão 4). Proteger com um ruleset de tags depende de o GitHub Actions entrar na lista de exceções, e esse é mais um ajuste manual que se perde fácil.
- **Repositório só de conteúdo:** separaria os acessos de verdade, mas traz um segundo repositório e um segundo pipeline. O ADR 0001 já descartou isso pelo custo na troca de mandato.
- **Exigir PR na `main`:** o painel deixaria de salvar direto.

## Hipóteses

- O token do painel não alcança o GHCR: o App do Keystatic é criado só com `contents: write`, `metadata: read` e `pull_requests: read` (conferido no código do `@keystatic/core` 0.6), e o GHCR aceita `GITHUB_TOKEN` ou token pessoal clássico, não token de usuário de GitHub App. Também não muda workflows (falta `workflows`), não dispara workflows (falta `actions`) e não aprova deploy em environment.
- Quem acrescentar permissões ao App nas configurações do GitHub desfaz essas garantias ([operacao.md](../operacao.md#3-quem-pode-editar)).

## Risco que sobra

Com um token roubado, **conteúdo malicioso ainda vai ao ar sozinho**. O que limita o estrago:
- o YAML passa pelo schema (zod) no build; campo estranho ou tipo errado derruba o CI e nada é promovido;
- links passam por `linkSeguro` (só `http(s)`, `mailto` e caminho do próprio site);
- `/uploads/*` e SVGs são servidos com CSP `sandbox` (`deploy/Caddyfile`), e as páginas só rodam scripts do próprio site. Um proxy do iCEV no lugar do Caddy precisa repetir esses cabeçalhos;
- as fotos passam pelo `sharp` no build. Uma imagem feita para explorar uma falha dele rodaria código no build; dependemos de manter o `sharp` atualizado (Dependabot).

Outros riscos:
- código malicioso commitado e não promovido roda no CI da `main` e pode envenenar o cache do Actions, usado nos builds seguintes. Depois de reverter, apague os caches antes de promover ([operacao.md](../operacao.md#3-quem-pode-editar));
- as Variables do repositório entram no build sem passar pela regra. Mudá-las exige admin.

O que fazer: reverter o commit no GitHub. O revert de conteúdo também vai ao ar sozinho; se precisar ser na hora, `IMAGE=<sha-bom>` no `.env` do servidor ([Desfazer uma mudança](../operacao.md#desfazer-uma-mudança)).

## Consequências

- Edição pelo painel chega ao site em uns 30 minutos (CI e cron), sem ninguém no servidor.
- Mudança de código, inclusive PR do Dependabot, precisa de alguém que revise e promova. Enquanto houver código esperando, as edições de conteúdo ficam paradas junto com ele.
- O servidor precisa de uma promoção manual antes da primeira instalação.
