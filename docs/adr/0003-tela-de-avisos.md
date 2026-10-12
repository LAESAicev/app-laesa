# ADR 0003: Tela de avisos com login por link para a caixa da LAESA

- **Status:** aceita
- **Data:** 2026-10-11
- **Contexto da decisão:** plano aprovado pela Bea em 2026-10-11, implementado com testes e com revisão de segurança prevista antes do merge.

## Contexto

O ADR 0001 deixou os avisos aos inscritos num comando no servidor (`scripts/avisar.ts`) e a tela "para depois". Na prática, mandar um aviso exigia SSH e um terminal. Isso deixava o envio na mão de uma ou duas pessoas, e a Mesa troca todo ano.

O que a tela precisava resolver:
- preparar, testar e enviar sem SSH;
- não abrir um caminho mais fraco que o do comando: as mesmas travas (teste do mesmo conteúdo, bloqueios, contagem de destinatários, proteção contra repetir aviso) e nenhum e-mail de inscrito na tela;
- não depender de conta pessoal de aluno (ADR 0001, decisão 7).

## Decisões

1. **Entrada por link de uso único, sempre para a caixa da LAESA.**
   - Quem pede o link não escolhe o destino: ele vai para `PUBLIC_CONTACT_EMAIL`. Ter acesso à caixa é a credencial.
   - O link vale 15 minutos, serve uma vez e só funciona no navegador que pediu (cookie de pré-sessão). Abrir o link não consome nada: um scanner de e-mail que segue links não gasta o acesso. Entrar é um POST.
   - Pedidos têm limite (3 a cada 15 minutos por IP, 20 por dia, 5 links valendo) e a resposta é sempre a mesma.

2. **Sessão guardada no servidor.** Cookie `__Host-` com um id aleatório; o banco guarda só o hash. Vale 30 minutos sem uso e 2 horas no total. Dá para sair de um navegador, de todos pela tela, ou de todos pelo comando (`avisar.ts sair-todos`).

3. **Nome declarado.** Ao entrar, a pessoa digita o nome, que fica nos envios que ela fizer. Como a caixa é compartilhada, o nome é um registro de boa-fé e não identifica ninguém com certeza.

4. **O envio roda no próprio servidor.** A tela cria o envio e dispara o processamento dentro do processo do site, com a mesma fila, o mesmo registro (`AVISOS_LOG`) e a mesma vez de processador do comando. Dois processamentos nunca rodam juntos, venha o envio da tela ou do comando.

5. **Sem aviso livre na primeira versão.** A tela só prepara avisos com modelo, com o conteúdo do site publicado, e não edita assunto nem texto. Texto livre fica no comando, onde o acesso é mais restrito.

6. **Código no e-mail de teste.** O teste vai para a caixa da LAESA com um código no topo. Para enviar, a tela pede esse código e o número de destinatários. O código vale 24 horas e para um envio. Isso obriga a abrir o teste antes de mandar para todo mundo.

7. **Flag.** Sem `PAINEL_AVISOS=true` (e `INSCRITOS_STORE=sqlite`), `/mesa` responde 404. O site sobe sem a tela até alguém ligar de propósito.

8. **Defesas da área `/mesa`.** O `checkOrigin` do Astro está desligado no site (ADR 0001, notas da fase 4), então o middleware confere a origem de todo POST contra `SITE_URL`. As respostas saem com `no-store` e `noindex`, e a CSP estrita das páginas públicas continua valendo (sem script inline).

## Alternativas descartadas

- **Login com GitHub.** Já é o login do painel. Mas parte da Mesa não usa GitHub, e o envio para todos os inscritos ficaria preso a quem tem escrita no repositório, que pode mexer no código. Editar o site e mandar e-mail para os inscritos virariam a mesma permissão.
- **Login com Google (OAuth) da conta da LAESA.** Exige criar e manter um projeto no Google Cloud com a conta institucional, tela de consentimento e segredos a mais no servidor. Na prática, quem entraria seria a mesma conta compartilhada: o resultado é o mesmo do link por e-mail, com mais peças.
- **Keystatic.** O painel só edita arquivos do repositório e salva como commit. Não roda ações no servidor (enviar e-mail, consultar a fila, contar inscritos) e não alcança o banco. Fazer o aviso passar por ele exigiria um disparo a partir de commit, sem teste nem confirmação.
- **Contas individuais com senha no site.** Seria um cadastro de usuários para no máximo 15 pessoas trocadas todo ano: senhas para guardar, recuperação de conta e mais dados pessoais no banco.

## Consequências

- A Mesa manda avisos pelo navegador. O comando continua valendo para o aviso livre, para trocar o texto e para operar com a tela desligada.
- A tela e o comando usam as mesmas funções (`src/lib/avisos/acoes.ts`, `src/lib/painel.ts`). Uma regra nova vale para os dois.
- O banco ganha duas tabelas (`painel_links`, `painel_sessoes`) e os códigos de teste. A limpeza diária (`avisar.ts limpar`) apaga os vencidos.
- Atualizar o site no meio de um envio iniciado pela tela interrompe o envio, que fica parado até alguém clicar em Retomar.
- O smoke do CI confere o portão: 404 com a flag desligada; com ela ligada, 303 sem sessão e 403 em POST sem `Origin`.

## Risco aceito

- **A caixa da LAESA vira credencial de envio em massa.** Quem lê essa caixa consegue entrar na tela e mandar um aviso para todos os inscritos. O teste com código não muda isso: o código chega na mesma caixa.
- **A senha da caixa é compartilhada entre alunos.** Não dá para saber quem entrou, só o nome que a pessoa digitou.
- Para conviver com esses dois riscos:
  - a verificação em duas etapas da caixa é obrigatória, presa ao(à) orientador(a);
  - a senha é trocada sempre que um membro sai da Mesa, e as sessões são encerradas (`avisar.ts sair-todos`);
  - filtros, encaminhamentos e delegações da caixa são revisados na passagem de mandato ([passagem-de-mandato.md](../passagem-de-mandato.md)): um encaminhamento esquecido levaria links e códigos para fora;
  - pela tela não se escreve texto: ela só prepara avisos com modelo e conteúdo do site publicado. Quem entra sem autorização não consegue mandar um texto qualquer aos inscritos.
- **A entrada pode ficar travada (disponibilidade).** Os limites de pedido de link (20 por dia somando todo mundo, 5 links valendo) protegem a caixa e a cota de envio do Workspace, mas quem pedir links demais bloqueia a entrada de todos por até 24 horas. Aceitamos: quem cuida do servidor libera na hora reiniciando o app e rodando `avisar.ts sair-todos` ([operacao.md](../operacao.md#quando-algo-der-errado)), e o comando continua mandando avisos.
- **Reabrir esta decisão** se a Mesa crescer, se a caixa deixar de ter verificação em duas etapas ou se houver um acesso indevido. O próximo passo seria login individual (Google da conta institucional de cada membro, com lista de quem pode entrar).
