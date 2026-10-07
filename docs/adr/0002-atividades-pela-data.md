# ADR 0002: Atividades ordenadas e com status pela data, sem banco de dados

- **Status:** aceita
- **Data:** 2026-10-07
- **Contexto da decisão:** um agente de arquitetura e um de UX analisaram o pedido, e a decisão foi validada com a Mesa.

## Contexto

A seção "O que já saiu do papel" passou a listar todas as atividades da liga: oficinas, workshops, cursos, eventos, pesquisas e projetos. Com isso surgiram três pedidos:
- ordenar pela data, com o que está mais perto de hoje em cima;
- uma página com todas as atividades e uma busca;
- avaliar se valia trocar o YAML por um banco Postgres.

A escala esperada é de 10 a 40 atividades por ano.

## Decisões

1. **A ordem vem em três grupos, nunca pela distância pura até hoje.**
   - Os grupos são, nesta ordem:
     - acontecendo agora (ou um projeto em andamento);
     - em breve, com o mais próximo antes;
     - já aconteceu, com o mais recente antes.
   - Itens sem data vão para o fim.
   - Pela distância pura, um evento de ontem ficaria entre dois futuros, e a linha de commits perderia a leitura cronológica.

2. **O status sai da data.**
   - O padrão do painel é "Automático", que mostra:
     - "em breve · 14 out 2026" antes do evento;
     - "inscrições abertas" quando há link de inscrição, com o botão Inscrever-se, que some depois da data;
     - "acontecendo agora" entre o início e o fim;
     - "concluído · out 2026" depois.
   - "Em andamento" e "Concluído" manuais servem só para projetos longos.

3. **"Hoje" é recalculado no navegador.**
   - As páginas são geradas no build, então sem ajuste o "hoje" seria a data da última publicação.
   - A lógica fica em `src/lib/atividades.ts`, em funções puras usadas pelo build e por `src/scripts/atividades.ts`. Ao carregar a página, o script refaz estados, ordem e grupos com a data do dia no fuso de Teresina (`America/Fortaleza`).
   - Sem JS fica a ordem do dia do build.
   - Para que o corte de 5 itens continue certo, a home recebe no build todas as atividades futuras e as 5 passadas mais recentes. Com o tempo, um item só pode passar de futuro para passado, e aí ele é o passado mais recente.
   - Renderizar a home no servidor foi descartado: colocaria a página inteira e o recorte das fotos no caminho do Node só para trocar um rótulo por dia.
   - Quando a atualização automática do servidor estiver pronta (ADR 0001, P4), vale ligar um build diário no CI como reforço, para o HTML sem JS e os buscadores.

4. **A página `/atividades` busca no navegador.**
   - A busca cobre nome, descrição, tags e eixos, sem diferenciar acento nem maiúsculas.
   - O filtro usa os **eixos do estatuto** (Ensino, Pesquisa, Extensão, Projetos; Art. 3º). Uma atividade pode ter mais de um eixo. As tags ficam livres para o tema.
   - O estado da busca vai para a URL (`?q=&eixo=`). Sem JS, a página mostra a lista completa.
   - Não há biblioteca de busca nem endpoint: abaixo de algumas centenas de itens, filtrar a página é instantâneo.

5. **Sem banco de dados para o conteúdo.**
   - O conteúdo continua em YAML no git, editado pelo Keystatic.
   - Um Postgres exigiria:
     - um painel próprio, com login e permissões;
     - um contêiner a mais na VM do iCEV, com backup, migrações e atualizações;
     - páginas renderizadas no servidor ou builds disparados pelo banco.
   - E tiraria o que o git já dá: histórico, autor de cada mudança, desfazer.
   - As atividades são conteúdo público, então um banco não ajuda na LGPD.
   - **Reabrir quando** o site passar a receber dados em volume: inscrição própria em oficinas com vagas, check-in, certificados, área de membros. Mesmo assim, o primeiro passo é ampliar o SQLite que já guarda os inscritos (mesmo volume, mesmo backup). O conteúdo editorial continua no git.

## Consequências

- No painel, a coleção "Atividades e projetos" ganhou:
  - `eixos`;
  - `data` (início);
  - `dataFim`;
  - `status` com "Automático";
  - `linkInscricao`.
- `destaque` passou a significar "pode aparecer na home", e `ordem` só desempata.
- Os testes da ordem e dos estados estão em `tests/atividades.test.ts`.
