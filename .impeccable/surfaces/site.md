---
version: 1
slug: "site"
primary_target: "site"
related_targets: []
---

# Surface: site LAESA (home + Processos Seletivos + Contato)

Mode: Persuade. Design is validated in Figma first (page "LAESA — Site v2"), implemented in Astro after approval.

Audience/jobs: (1) estudante do iCEV decide se candidata e quando; (2) organização decide pedir um projeto; (3) colaborador/visitante tira dúvida ou manda feedback. Proof: estatuto (regras, números), projetos reais (a receber), edital aberto (a receber). Constraints: no invented partners, testimonials, metrics; placeholders marked.

Sitemap: Início · Sobre (eixos, como funcionamos) · Projetos · Diretoria · Processos Seletivos (página própria) · Contato (form com select: Dúvida / Feedback / Quero um projeto / Quero colaborar).

## Direction contract

THESIS: A liga é um repositório vivo: a home é um `git log --graph` vertical onde a linha main (o traço do logo, com nós circulares) atravessa a página e ramifica em branches que são as portas de entrada. Recusa o hero de foto escurecida + cards de missão/visão/valores.

OWN-WORLD: Off-white #F3F6F9 e navy #043F63 em campos de seção inteira (hierarquia por inversão). Linhas de branch 2px com nós circulares de 16px na espinha (10–14px em marcadores) em azul #0078D4 (azul da interface, definido pela equipe no Figma; #0A2BFF fica só nos arquivos de logo) e ciano #1DD0F8; menta #5CEAD2 reservado exclusivamente para estado aberto/ativo/HEAD. Display: uma só grotesca condensada em caixa alta (Bebas Neue, ecoa o wordmark); texto em face humanista de UI; metadados (hashes, datas, Art. do estatuto) em mono pequena. Botões com raio de 4px e seta; o nó circular fica na ponta da branch que leva ao botão. Sem gradiente, sem glass.

STORY: Entende o que é a LAESA (liga sem fins lucrativos, iCEV, desde 2023, trabalha em Sprints e Squads), acredita porque vê projetos e regras públicas, e escolhe uma das duas branches: candidatar-se ao edital aberto ou pedir um projeto.

FIRST VIEWPORT: Nav fina com logo e links + tag menta "Edital 2026.2 aberto". Esquerda: linha main desce do topo com nós; headline em Bebas 96px (80px tablet, 60px mobile): "ENGENHARIA DE SOFTWARE QUE SAI DO PAPEL." + subtítulo de 2 linhas. A linha se divide em duas branches que terminam nos dois CTAs lado a lado: "Quero entrar na liga" (primário azul) e "Tenho um projeto" (contorno). Direita: o grafo commit-a-commit com 5 entradas reais (2023 fundação, Sprints, projetos, editais) em mono.

FORM: Grafo de Commits (git log --graph), posição 3 da lista ordenada, seed key 5701cb99. Raises: tipografia única condensada (Letreiro), menta só para aberto (Painel de Embarque), uma linha contínua como espinha do layout (Dobra Curva). Signature interaction (spec completa em design/MOTION.md): a linha main preenche até uma agulha a 40% da viewport conforme o scroll, com um brilho de energia correndo em loop só pelo trecho preenchido; cada nó se preenche (miolo cresce + anel único) quando a agulha passa e reverte ao subir; HEAD menta respira; na página de processos, as etapas do edital são commits de uma branch com o HEAD em menta.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
