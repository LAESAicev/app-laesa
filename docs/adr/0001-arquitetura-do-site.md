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
   - Hero, projetos, Mesa, FAQ, status da seleção e editais ficam como arquivos YAML em `content/`. O schema vive só em `keystatic.config.ts`; as páginas leem o conteúdo pelo leitor do Keystatic (`src/lib/content.ts`) durante o build. Se o plano B (Sveltia) vencer, o YAML continua o mesmo e a leitura passa a usar Content Collections com zod.
   - Imagens e PDFs ficam em `public/uploads/`.
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
   - Um checklist de passagem de mandato fica em `docs/`.

6. **Contas e acessos da LAESA, nunca de um aluno.**
   - Inclui a organização no GitHub, a conta Workspace, os segredos e o acesso ao servidor.
   - O repositório vai para a organização LAESA no GitHub.

## Pendente: respostas do iCEV

Perguntas enviadas ao iCEV em 2026-10-05.

| # | Pergunta | Resposta | Impacto |
| --- | --- | --- | --- |
| 1 | Tipo de hospedagem: pasta estática, VM com Docker ou plataforma de contêineres? Limites de RAM/CPU? | **pendente** | Define o plano A ou o B (abaixo) |
| 2 | Subdomínio `laesa.icev.edu.br`? Quem cuida do HTTPS? | **pendente** | Configuração de DNS e TLS (Caddy ou proxy deles) |
| 3 | SMTP / e-mail | **Google Workspace** | Envio pela conta da LAESA no Gmail |
| 4 | O servidor pode baixar do GitHub/GHCR? Como a aplicação é atualizada? | **pendente** | Deploy por pull (Watchtower/cron), SSH a partir do CI ou SFTP |
| 5 | Há backup da VM/volumes? | **pendente** | Se não houver, rotina de backup própria do SQLite |
| 6 | Quem administra a infraestrutura? | **Setor de tecnologia do iCEV** | A LAESA cuida só da aplicação |
| 7 | Acesso em conta da liga? | **Sim, conta da LAESA** | Passagem de mandato sem depender de aluno |

**Plano A (VM ou contêiner com Docker):**
- um contêiner com Astro em `@astrojs/node`, modo standalone;
- páginas pré-renderizadas, painel `/keystatic` e rotas `/api/*`;
- inscritos em SQLite num volume.

**Plano B (só hospedagem estática):**
- o build estático é enviado por SFTP/rsync;
- o painel passa a ser o Sveltia CMS, que roda no navegador e usa a mesma estrutura de `content/`;
- contato e inscrição passam para o Google Forms da conta LAESA.

Nos dois planos, o modelo de conteúdo e o repositório são os mesmos.

## Outras pendências

- **P1:** criar a organização LAESA no GitHub e transferir o `app-laesa`, opcionalmente renomeando para `site-laesa`. Precisa da conta da LAESA.
- **P2:** onde ficam os inscritos dos avisos.
  - (a) SQLite no servidor, com disparo pelo site. Exige o plano A.
  - (b) Google Groups da LAESA. Falta verificar se quem não tem conta Google consegue se inscrever.
- **P3:** confirmar se a conta Workspace da LAESA permite SMTP (senha de app ou relay) e qual é o limite diário de envio.
- **P4:** arquivar o repositório `api-laesa` no GitHub. O contrato do formulário já foi trazido para `docs/contrato-contato.md`.

## Consequências

- Uma stack só: TypeScript e Astro.
- Um pipeline e um README de onboarding.
- Editar conteúdo exige conta GitHub no time da organização. É aceitável para estudantes de Engenharia de Software, mas precisa estar no onboarding.
- Publicar uma edição leva cerca de 1 a 2 minutos, porque há rebuild. Aceitável para a frequência de edição.
