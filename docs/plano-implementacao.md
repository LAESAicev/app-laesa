# Plano de implementação

Base: [ADR 0001](adr/0001-arquitetura-do-site.md). O design aprovado está no Figma (abas "LAESA — Site v2" e "Componentes") e no protótipo `design/src`.

Legenda: ✅ dá para fazer agora · ⏸ depende das respostas do iCEV (ADR 0001, "Pendente") · 👤 depende de alguém da LAESA

## Fase 0: Preparação
- 👤 Criar a organização LAESA no GitHub com a conta da liga e transferir o `app-laesa` (P1). Criar os times `mesa-diretora` e `membros`.
- 👤 Arquivar o `api-laesa` (P4).
- 👤 Confirmar se a conta Google Workspace da LAESA permite SMTP com senha de app e qual o limite diário (P3).
- 👤 Juntar o conteúdo real: redes, e-mail, edital 2026.2, projetos, nomes e fotos da Mesa (lista no README).

## Fase 1: Projeto Astro e páginas estáticas ✅ concluída (2026-10-05)
1. Criar o projeto Astro (TypeScript strict) na raiz do repositório, mantendo `design/`, `brand/` e `docs/`.
2. Levar os tokens de `design/src/styles.css` para `src/styles/`:
   - cores, inclusive o azul `#0078D4`;
   - fontes self-hosted: Bebas Neue, Geist e Geist Mono, sem depender do Google Fonts em produção.
3. Componentes portados do protótipo:
   - layout: `Nav`, `Footer`;
   - grafo: `Spine` (espinha + nós), `GitLog` (painel do hero);
   - controles: `Button` (4 estilos), `Tag`, `Field` (input, select e textarea, com estados);
   - blocos: `SectionHead`, `ProjectRow`, `PersonCard`, `StageList`, `Faq` (acordeão acessível).
4. Páginas: `/`, `/processos-seletivos`, `/processos-seletivos/[slug]`, `/contato` e `/privacidade`. A última é nova e explica o uso dos e-mails, conforme a LGPD.
5. Responsivo com media queries (o protótipo usa container queries só para gerar o Figma).
6. Acessibilidade:
   - foco visível;
   - contraste. Atenção: links azuis sobre o fundo `#F3F6F9` ficam em ~4.2:1, abaixo do mínimo para texto pequeno. Ajustar tom ou peso;
   - navegação por teclado no menu mobile e no FAQ.

## Fase 2: Conteúdo editável ✅ concluída (2026-10-05)
1. Schemas em `keystatic.config.ts` (fonte única: as páginas leem com o leitor do Keystatic em `src/lib/content.ts`, sem duplicar em zod) para cada parte do conteúdo:

   | Conteúdo | Arquivo | Campos |
   | --- | --- | --- |
   | Status da seleção | `site.yaml` | `aberto \| em-andamento \| finalizado` e o edital atual |
   | Hero | `hero-log.yaml` | lista ordenada de commits; o primeiro é o HEAD |
   | Projetos | `projetos/*.yaml` | nome, descrição, tags, status, ano, link, imagem, ordem |
   | Mesa Diretora | `mesa/*.yaml` | cargo, nome, foto |
   | FAQ | `faq/*.yaml` | pergunta, resposta |
   | Editais | `editais/<ano-semestre>.yaml` | etapas com datas, vagas, PDF, modelo da carta, resultado, links |

2. As páginas passam a ler esses arquivos. Mudar `site.yaml` atualiza a tag do nav, a seção da home e a página de processos.
3. Keystatic em **modo local** com esses schemas, para editar em `localhost:4321/keystatic`. O modo GitHub fica para a Fase 5.
4. 👤 Validar com um membro que não é dev: editar o hero e criar um edital sem ajuda.

## Fase 3: Movimento ✅ concluída (2026-10-05)
Implementar `design/MOTION.md`:
- espinha preenchendo com o scroll (scroll-driven, com fallback);
- energia em loop no trecho preenchido;
- nós que se preenchem;
- HEAD respirando;
- branches do hero desenhadas na carga;
- `prefers-reduced-motion`.

## Fase 4: Formulários ✅ código concluído (2026-10-06) / 👤 senha de app SMTP / ⏸ armazenamento dos inscritos
1. Schema zod compartilhado (`src/lib/contato.schema.ts`) a partir de `docs/contrato-contato.md`. O mesmo schema valida no navegador e no servidor.
2. Formulário de contato com select e campos condicionais, e todos os estados do Figma: erro, enviando, sucesso.
3. `POST /api/contato`: validação, honeypot, limite por IP e envio por SMTP (nodemailer) para a caixa da LAESA. Testável já com um servidor SMTP local (Mailpit).
4. Inscrição em avisos: formulário, double opt-in, descadastro e registro de consentimento. A implementação depende da P2 (SQLite ou Google Groups) ⏸, mas o formulário e a página de confirmação dá para fazer agora.

## Fase 5: Infraestrutura e deploy
- ✅ `build.yml` no GitHub Actions: lint, checagem de tipos, validação dos schemas de conteúdo e build a cada PR.
- ✅ `Dockerfile` e `compose.yaml` para o plano A, testados localmente. Saem baratos e não se perdem se o plano B vencer.
- ⏸ `deploy.yml` para o alvo que o iCEV definir: pull do GHCR, SSH ou SFTP.
- ⏸ Keystatic em modo GitHub (GitHub App da organização) no plano A, ou Sveltia CMS no plano B.
- ⏸ DNS, HTTPS e backups.

## Fase 6: Documentação de passagem de mandato ✅
- `docs/onboarding.md`: "editar o site em 10 minutos" (painel, onde fica cada coisa).
- `docs/passagem-de-mandato.md`: checklist anual com times do GitHub, segredos, senha da conta Workspace, contato do setor de tecnologia e quem tem acesso ao servidor.
- `docs/operacao.md`: como fazer deploy, restaurar backup e desfazer uma edição. Preenchido depois do ⏸.

## O que está bloqueado, de fato
Só a parte final da Fase 5 (deploy, DNS/HTTPS, modo do painel em produção) e a decisão P2. Todo o resto pode andar agora e roda localmente.
