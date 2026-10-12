# ADR 0001: Arquitetura do site e do painel

- **Status:** aceita, com pendências de infraestrutura (ver "Pendente: respostas do iCEV")
- **Data:** 2026-10-05
- **Contexto da decisão:** análise de três agentes (arquiteto pragmático, advogado de repositórios separados e pesquisa de ferramentas), revisada para a infraestrutura do iCEV.

## Contexto

O site precisa de:
- conteúdo editável por membros da LAESA, inclusive quem não é dev, por um painel. O painel cobre o "git log" do hero, os projetos em destaque, a Mesa Diretora, o status da seleção, as páginas de edital a partir de um template e o FAQ;
- inscrição de visitantes para receber avisos por e-mail;
- formulário de contato.

Restrições:
- liga sem fins lucrativos, com no máximo 15 membros e Mesa Diretora trocada todo ano;
- infraestrutura e domínio do iCEV, administrados pelo setor de tecnologia;
- Google Workspace institucional;
- LGPD.

## Decisões

1. **Um repositório, um app.** O `app-laesa` é o projeto inteiro: front, painel e rotas de API num único app Astro.
   - O `api-laesa` sai de uso.
   - Repositórios separados só se justificariam com times diferentes, deploys independentes, linguagens diferentes, mais de um cliente da API ou exigência de separar acessos. Nenhum desses casos se aplica. A troca anual da Mesa é o maior risco, e cada repositório ou deploy a mais aumenta esse risco.
   - Reabrir esta decisão se o setor de tecnologia exigir separar acessos ou segredos do back-end.

2. **Conteúdo no git, editado pelo Keystatic.**
   - Hero, projetos, Mesa, FAQ, status da seleção e editais ficam como arquivos YAML em `content/`. O schema vive em `keystatic.config.ts`. As páginas leem os YAML no build com `import.meta.glob` (`src/lib/content.ts`), sem o leitor do Keystatic.
   - Fotos enviadas pelo painel ficam em `src/assets/uploads/` (recortadas no build). PDFs e documentos ficam em `public/uploads/`.
   - Salvar no painel gera um commit, então há histórico, revisão e reversão.
   - Cada edital é um arquivo renderizado pelo mesmo template (`/processos-seletivos/[slug]`).
   - O status da seleção (`aberto | em-andamento | finalizado`) e o edital atual ficam num arquivo só. A tag menta do nav, a seção da home e a página de processos leem dele.
   - Acesso ao painel: modo GitHub, liberado só para o time da organização LAESA no GitHub. A troca da Mesa é tirar e pôr pessoas no time.
   - Descartado: CMS com banco (Payload, Directus, Strapi). Traria banco, migrações, usuários e backups para conteúdo que muda poucas vezes por mês.

3. **Dados pessoais nunca vão para o git.**
   - Mensagens de contato não são armazenadas: vão por e-mail para a caixa da LAESA no Google Workspace.
   - Inscritos dos avisos: ver pendência P2.

4. **E-mail pela conta Google Workspace da LAESA.**
   - O envio usa o SMTP do Gmail com a conta institucional da liga.
   - A mesma caixa recebe o contato, então nada se perde na troca da Mesa.
   - Listmonk está descartado por enquanto: seria mais um contêiner com Postgres para poucos envios por ano.

5. **Reprodutível a partir do repositório.**
   - O build roda no GitHub Actions.
   - O artefato é uma imagem Docker (app Astro com adapter Node) ou, no plano B, a pasta `dist/`.
   - Nenhuma configuração manual no servidor depende da memória de alguém.
   - O checklist de passagem de mandato está em [docs/passagem-de-mandato.md](../passagem-de-mandato.md).

6. **Configuração por ambiente.** Contatos, redes e domínio vêm de variáveis de ambiente validadas pelo `astro:env` (`.env.example`), sem valores no código. Credenciais (SMTP, `INSCRICAO_SECRET`, painel) seguem o mesmo caminho como segredos, só no `.env` do servidor.

7. **Contas e acessos da LAESA, nunca de um aluno.**
   - Inclui a organização no GitHub, a conta Workspace, os segredos e o acesso ao servidor.
   - O repositório vai para a organização LAESA no GitHub.

## Pendente: respostas do iCEV

Perguntas enviadas ao iCEV em 2026-10-05.

| # | Pergunta | Resposta | Impacto |
| --- | --- | --- | --- |
| 1 | Tipo de hospedagem: pasta estática, VM com Docker ou plataforma de contêineres? Limites de RAM/CPU? | **Docker** (pedido da coordenação, 2026-10-06); limites de RAM/CPU pendentes | **Plano A confirmado.** Plano B descartado |
| 2 | Subdomínio `laesa.icev.edu.br`? Quem cuida do HTTPS? | **pendente** | Configuração de DNS e TLS (Caddy ou proxy deles) |
| 3 | SMTP / e-mail | **Google Workspace** | Envio pela conta da LAESA no Gmail |
| 4 | O servidor pode baixar do GitHub/GHCR? Como a aplicação é atualizada? | **pendente** | Deploy por pull (Watchtower/cron), SSH a partir do CI ou SFTP |
| 5 | Há backup da VM/volumes? | **pendente** | Se não houver, rotina de backup própria do SQLite |
| 8 | O servidor tem saída liberada para `smtp.gmail.com` nas portas 465 ou 587? | **pendente** (2026-10-06: a rede local de desenvolvimento bloqueia as duas; HTTPS funciona) | Sem essa saída, trocar o envio para a API do Gmail via HTTPS (porta 443, OAuth da conta da LAESA) |
| 6 | Quem administra a infraestrutura? | **Setor de tecnologia do iCEV** | A LAESA cuida só da aplicação |
| 7 | Acesso em conta da liga? | **Sim, conta da LAESA** | Passagem de mandato sem depender de aluno |

**Plano A (VM ou contêiner com Docker) — confirmado:**
- um contêiner com Astro em `@astrojs/node`, modo standalone;
- páginas pré-renderizadas, painel `/keystatic` e rotas `/api/*`;
- inscritos em SQLite num volume.

**Plano B (só hospedagem estática):**
- o build estático é enviado por SFTP/rsync;
- o painel passa a ser o Sveltia CMS, que roda no navegador e usa a mesma estrutura de `content/`;
- contato e inscrição passam para o Google Forms da conta LAESA.

Nos dois planos, o modelo de conteúdo e o repositório são os mesmos.

## Outras pendências

- **P1:** resolvida (2026-10-06): repositório transferido para [LAESAicev/app-laesa](https://github.com/LAESAicev/app-laesa). Imagem `ghcr.io/laesaicev/app-laesa` pública e time da Mesa Diretora com acesso.
- **P2:** resolvida (2026-10-06): inscritos das novidades em SQLite (`node:sqlite`, sem dependência nativa) num volume do contêiner (`/data/laesa.db`). Backup em `docs/operacao.md`.
  - Google Groups foi descartado.
- **P3:** confirmar se a conta Workspace da LAESA permite SMTP (senha de app ou relay) e qual é o limite diário de envio.
- **P4:** arquivar o repositório `api-laesa` no GitHub. O contrato do formulário já foi trazido para `docs/contrato-contato.md`.

## Notas de implementação

- Fase 4: segurança revisada por agente. Proxy do iCEV deve sobrescrever `X-Forwarded-For` com o IP real (`$remote_addr`) e limitar o corpo a 64 KB; o app confia nos cabeçalhos só para o domínio de `SITE_URL` (`security.allowedDomains`). Confirmar/descadastrar exigem POST (scanners de link fazem GET).
- Fase 4: o app usa o adaptador `@astrojs/node` (standalone). As páginas são pré-geradas e só `/api/*` e `/avisos/*` rodam no servidor. Build em formato de diretórios (`/processos-seletivos/index.html`): o formato `file` gerava `processos-seletivos.html` ao lado da pasta `processos-seletivos/`, e o servidor de arquivos do adaptador respondia 404.

- Fase 5: o conteúdo de `content/*.yaml` é embutido no build (`import.meta.glob` + `yaml`), sem o leitor do Keystatic em tempo de execução. As rotas renderizadas sob demanda (`/avisos/*`) quebravam no contêiner, que não tem a pasta `content/`. Keystatic e React continuam em `dependencies`, porque o painel em produção (modo GitHub) precisa deles.
- Fase 5: Docker (`Dockerfile` multi-stage, `compose.yaml` com app + Caddy), CI no GitHub Actions publicando a imagem no GHCR. Painel em produção (modo GitHub) pronto no código desde 2026-10-07: entra no build quando `PUBLIC_KEYSTATIC_GITHUB_REPO` está definido, e as credenciais do GitHub App são lidas em tempo de execução. Falta criar o App (docs/operacao.md).

## Atualizações (out/2026)

Registro de 2026-10-08. As decisões acima continuam valendo; isto só acrescenta o que mudou na revisão geral.

- Avisos aos inscritos por comando no servidor. O envio é feito pelo `scripts/avisar.ts`, que lê o manifesto dos itens publicados (`/avisos/itens.json`) e exige teste antes de enviar. Uma tela no site para isso fica para depois. Guia: [docs/avisos.md](../avisos.md).
- LGPD nos inscritos. Quem se descadastra tem o e-mail apagado; fica só um código HMAC dele por 30 dias, para um link de confirmação antigo não reinscrever. As entregas dos avisos também guardam só HMAC. Os backups seguem a mesma retenção de 30 dias.
- Trava contra envio real. Fora de produção (sem `NODE_ENV=production` no processo em execução, que a imagem Docker define), o app só envia por SMTP local (Mailpit), a não ser que `ENVIO_REAL=true`. Um `.env` de produção copiado para uma máquina de desenvolvimento não manda e-mail de verdade.
- Armazenamento em desenvolvimento. `INSCRITOS_STORE=memoria` usa o mesmo SQLite, em memória (`:memory:`), no lugar de uma implementação separada.

## Consequências

- Uma stack só: TypeScript e Astro.
- Um pipeline e um README de onboarding.
- Editar conteúdo exige conta GitHub no time da organização. É aceitável para estudantes de Engenharia de Software, mas precisa estar no onboarding.
- Publicar uma edição leva cerca de 1 a 2 minutos, porque há rebuild. Aceitável para a frequência de edição.
