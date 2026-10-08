# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 7 with the Node adapter, in one Docker image. Pages are prerendered; only `/api/*` and `/avisos/*` run on the server. Content is YAML in `content/`, edited through the Keystatic panel (`/keystatic`). Architecture: `docs/adr/0001-arquitetura-do-site.md`.

## Users

- **Estudantes do iCEV (técnico e superior)** que querem entrar na liga: precisam entender o que a LAESA faz, como é a rotina (Sprints, Squads, 75% de frequência, certificado de 45h) e quando abre o próximo processo seletivo.
- **Organizações, empresas e projetos sociais** que querem a LAESA desenvolvendo um projeto: precisam ver o que a liga já entregou e abrir uma conversa.
- **Comunidade acadêmica e profissionais** que querem colaborar (palestras, mentorias, oficinas) ou mandar dúvidas e feedback.

## Product Purpose

Site institucional da Liga Acadêmica de Engenharia de Software Aplicada (LAESA). Apresenta a liga, seus quatro eixos (ensino, pesquisa, extensão, projetos), projetos realizados, a Mesa Diretora, os processos seletivos e um canal de contato. Sucesso: candidaturas qualificadas nos editais e pedidos de projeto reais chegando pelo formulário.

## Positioning

Liga acadêmica sem fins lucrativos, fundada em 2023 por alunos de Engenharia de Software do iCEV em Teresina (PI), que trabalha como um time de mercado: metodologia ágil, Sprints com atas, Squads por competência. Atua sobre demandas reais da sociedade.

## Operating Context

- Mesa Diretora: Presidente, Vice-Presidente, Diretor(a) de Projetos (estatuto); Diretor(a) de Marketing (faz parte da Mesa; o estatuto de 2026 está desatualizado nesse ponto); Professor(a) Orientador(a) como apoio. Mandatos de 2 semestres, eleição em novembro.
- Máximo 15 membros; seleção anual com no mínimo 2 vagas, conduzida por comissão.
- Inscrição: carta de apresentação (modelo no edital), atividades complementares opcionais, até 3 cartas de recomendação de professores do iCEV. Resultado em até 48h; aceite por e-mail em até 24h.
- Certificados: 60h Mesa Diretora, 45h efetivos, carga da atividade para convidados; exige 75% de frequência.
- Colaboradores externos (palestrantes, mentores, voluntários, egressos) podem receber certificado.

## Capabilities and Constraints

- Contact form with a type select: dúvida, feedback, contratar/propor projeto (project requests ask for extra fields). Submissions go to the app's own route (`POST /api/contato`), which e-mails the LAESA inbox; nothing is stored. Contract: `docs/contrato-contato.md`.
- Processos Seletivos page: current edital, stages, requirements, past editions.
- Admin panel for the Mesa Diretora/members (non-devs included) to edit: hero "git log" highlight items, featured projects, Mesa Diretora names/photos, selection status (aberto / em andamento / finalizado), new edital pages from one template (dates, vagas, PDF, modelo da carta, resultado), FAQ.
- Visitors can subscribe to LAESA notifications (e.g. new edital): double opt-in, one-click unsubscribe, LGPD consent record; the Mesa sends announcements.
- Hosting and domain: provided by iCEV; infrastructure administered by iCEV's technology sector. Deployment is Docker (requested by the coordenação, 2026-10-06). Subdomain, outbound access to GitHub and backups still pending. The app must be reproducible from the repo.
- Access and accounts belong to the LAESA institutional account, never a student's personal account.
- E-mail: iCEV uses Google Workspace; the LAESA Workspace account sends notifications and receives contact messages (contact messages are not stored elsewhere).
- Decided: Keystatic as the panel (local mode now, GitHub mode in production after the iCEV server exists) and Gmail SMTP from the LAESA Workspace account. Announcements to subscribers are sent by a server command (`docs/avisos.md`); there is no web UI for that yet.

## Brand Commitments

- Logo: brain + circuit mark with "LAESA" condensed wordmark, files in `brand/logo/{horizontal,vertical,icone}/` named `laesa-<layout>-<cor>` (azul, menta, ciano, navy, degradê, branco, preto) and profile-photo variants in `brand/avatar/`.
- Palette from the logo files: navy `#043F63`, electric blue `#0A2BFF`, cyan `#1DD0F8`, mint `#5CEAD2`.
- Site UI blue (buttons, links, graph line) is `#0078D4`, hover `#005A9E`: chosen by the team in Figma (2026-10-05). The logo files keep `#0A2BFF`.
- Language: Portuguese (Brazil).

## Evidence on Hand

- Estatuto 2026 (`docs/estatuto-2026.md`): source of truth for structure, rules and numbers.
- The team has: social links and official e-mail, an open edital, past projects. Not yet provided to the design; placeholders must be clearly marked, never invented as fact.
- No director photos supplied yet. No real partners, testimonials or metrics: do not fabricate.

## Product Principles

1. Every rule shown on the site comes from the estatuto or a published edital.
2. Two front doors with equal weight: "quero entrar" (students) and "quero um projeto" (organizations).
3. Show work, not adjectives: projects and process over marketing claims.
4. Transparency is a feature: selection criteria, certification rules and governance are public.
