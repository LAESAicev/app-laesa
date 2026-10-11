# Avisos para os inscritos

Guia para a Mesa Diretora mandar um e-mail a quem se inscreveu nas novidades da LAESA (editais, atividades, projetos).

Há dois caminhos, que usam as mesmas regras e o mesmo banco:

- **A tela de avisos** (`/mesa`), no navegador. É o caminho normal. Entra quem tem acesso à caixa de e-mail da LAESA.
- **O comando** `scripts/avisar.ts`, no servidor. Serve para o aviso livre (texto escrito à mão), para trocar o assunto ou o texto do modelo e para quando a tela estiver desligada. Exige acesso SSH.

A tela só existe se estiver ligada no servidor (`PAINEL_AVISOS=true`, ver [operacao.md](operacao.md#tela-de-avisos)). Desligada, `/mesa` responde 404.

## Antes de avisar: cadastre e publique

### 1. Cadastre no painel

Abra o painel (`/keystatic`) e preencha o edital ou a atividade:

- datas: "Inscrições até" no edital, "Data (ou início)" na atividade;
- link de inscrição, quando houver;
- desmarque "Conteúdo provisório".

Para um edital, coloque também "Status do processo seletivo" como "Inscrições abertas" (em Configurações e status da seleção).

### 2. Publique

O aviso usa o que está no site publicado, e não o que está no painel. Depois de salvar, espere o CI gerar a imagem nova e atualize o servidor (`docker compose pull && docker compose up -d`, veja [operacao.md](operacao.md#atualizar-o-site)). A tela e o comando leem a lista do que está publicado (`avisos/itens.json`), gerada nesse build.

## Pela tela de avisos

### Entrar

1. Abra `https://<domínio do site>/mesa/entrar` e clique em **Enviar link de acesso para a caixa da LAESA**. O link vai sempre para a caixa da LAESA (`PUBLIC_CONTACT_EMAIL`), nunca para outro endereço.
2. Abra o e-mail "Link para entrar na tela de avisos da LAESA" e clique no link **no mesmo navegador** em que fez o pedido. Em outro navegador ou no celular ele não funciona. O link vale 15 minutos e serve uma vez só.
3. Escreva seu nome e clique em **Entrar**.

O nome fica registrado nos envios que você fizer ("por …"). Ele é só o que você digitou: a caixa é compartilhada, e o site não tem como saber quem está do outro lado. Ele serve de registro de boa-fé e não prova quem enviou.

A sessão acaba depois de 30 minutos sem uso ou 2 horas depois de entrar. A recarga automática da página de um envio não conta como uso: com a página aberta e ninguém mexendo, a sessão acaba do mesmo jeito. No topo de cada página há **Sair** (este navegador) e **Sair de todos os navegadores** (encerra todas as sessões e invalida os links que ainda não foram usados).

Se o link não chegar: a resposta da tela é sempre a mesma, chegue o e-mail ou não. O pedido é ignorado em silêncio depois de 3 pedidos em 15 minutos do mesmo endereço, de 20 no dia (somando todo mundo), ou com 5 links ainda valendo. O limite por endereço e os 5 links liberam em 15 minutos. O limite do dia pode levar até 24 horas. Se não der para esperar, avise quem cuida do servidor: dá para liberar a entrada na hora ([operacao.md](operacao.md#quando-algo-der-errado)). Enquanto isso, o aviso pode sair [pelo comando](#pelo-comando-no-servidor).

### Preparar

Na página `/mesa/avisos` (a primeira depois de entrar) aparecem o número de inscritos, os últimos envios e, para cada edital e atividade publicados, o aviso sugerido, se ele já foi enviado e o que está bloqueando.

Em **Tipo de aviso**, escolha o aviso do item e clique em **Preparar aviso**. A tela monta o e-mail com o conteúdo do site publicado e abre o rascunho. Se houver bloqueio, nada é criado e a tela mostra os motivos ([o que é bloqueado](#o-que-é-bloqueado-e-por-quê)).

Na tela não dá para trocar o assunto nem o texto, e não há aviso livre. Para isso, use [o comando](#pelo-comando-no-servidor).

### Testar

No rascunho, confira a prévia e clique em **Mandar teste para a caixa da LAESA**. Abra o e-mail de teste na caixa da LAESA e confira assunto, datas e links.

No topo do e-mail de teste há um código no formato `XXXX-XXXX`. Ele libera o envio deste rascunho: vale 24 horas e serve para um envio só. Depois do primeiro teste, o botão passa a se chamar **Mandar outro teste**. Cada teste gera um código novo, e o anterior deixa de valer.

### Enviar

Ainda no rascunho, na parte de envio:

1. digite o código do e-mail de teste;
2. digite o número que aparece em "Inscritos agora";
3. se este aviso já foi enviado antes, marque **Enviar de novo** (sem marcar, ele não sai);
4. clique em **Enviar para N inscritos** (N é o total de inscritos agora).

O envio é recusado, sem criar nada, quando:

- o envio de e-mail não está configurado no servidor;
- o código não é o do último teste deste rascunho, venceu ou já foi usado;
- o rascunho não teve teste com exatamente este conteúdo, ou o site publicado passou a ter um bloqueio;
- o número digitado é diferente do total de inscritos contado no servidor;
- o aviso (mesmo item e mesmo evento) já foi enviado e "Enviar de novo" não foi marcado.

### Acompanhar, pausar, retomar e cancelar

Depois de enviar, a tela abre a página do envio (`/mesa/envios/<número>`). Ela mostra a situação, quantos já receberam, as falhas e se há processamento ativo, e se atualiza sozinha a cada 15 segundos enquanto envia. Pode fechar a página: o envio roda no servidor.

- **Pausar** para o envio onde está.
- **Retomar** continua um envio pausado, ou um "enviando" sem processamento ativo. Quem já recebeu não recebe de novo.
- **Cancelar envio** para de vez e fica numa área separada, no fim da página. Antes do botão, marque "Entendo que quem ainda não recebeu não vai receber este aviso." Quem já recebeu, recebeu. Enquanto o envio está em andamento, a página recarrega a cada 15 segundos e desmarca a caixa: marque e cancele logo em seguida.

**Depois de um reinício do servidor** (atualização do site, queda do contêiner), o envio fica "enviando" mas parado. A vez do processador continua ocupada até vencer: normalmente em até 2 minutos, ou até uns 17 se ele estava esperando depois de uma falha do SMTP. Quando vencer, a página do envio mostra "Sem processamento ativo" e o botão **Retomar**. Clique nele.

## Pelo comando, no servidor

Para quem tem SSH. Todos os comandos rodam na pasta do site no servidor, a mesma do `docker compose up`:

```sh
docker compose exec app node scripts/avisar.ts <comando>
```

Para encurtar, crie um atalho na sessão: `alias avisar='docker compose exec app node scripts/avisar.ts'`. Os exemplos abaixo usam o comando completo.

### Ver o que dá para avisar

```sh
docker compose exec app node scripts/avisar.ts itens
```

Para cada edital e atividade, o comando mostra a situação no site, o aviso sugerido, se já foi avisado e o que está bloqueando.

### Preparar

```sh
docker compose exec app node scripts/avisar.ts preparar edital-aberto 2026-2
```

O comando monta o e-mail, confere os bloqueios, salva um rascunho numerado e mostra como ele vai ficar e para quantas pessoas vai. O rascunho aparece também na tela, em `/mesa/rascunhos/<número>`, e pode ser testado e enviado por lá, menos o aviso livre.

Os eventos possíveis:

| Evento | Assunto (exemplo) |
| --- | --- |
| `edital-aberto` | Edital 2026.2 aberto: inscrições até 23 out |
| `edital-prorrogado` | Edital 2026.2: inscrições prorrogadas até 30 out |
| `atividade-inscricoes` | Inscrições abertas: Oficina de Figma, 12 nov |
| `atividade-breve` | Em breve na LAESA: Oficina de Figma, 12 nov |
| `projeto` | Saiu do papel: Sistema de monitoria |
| `livre` | o que você escrever (só pelo comando) |

O item pode ser o código mostrado em `itens` (`edital:2026-2`) ou só a parte final (`2026-2`).

Para trocar o assunto ou o texto do modelo, use `--assunto "…"` e `--texto-arquivo arquivo.txt`. Para colar o texto direto no terminal, use `--texto-arquivo -` e termine com Ctrl+D. O aviso livre não tem item e precisa dos dois:

```sh
docker compose exec -T app node scripts/avisar.ts preparar livre --assunto "Reunião aberta na quinta" --texto-arquivo - < texto.txt
```

O rodapé (por que a pessoa recebe e o link para sair) entra sozinho em todo aviso. Cada mudança no texto gera um rascunho novo, que precisa de um teste novo.

### Testar

```sh
docker compose exec app node scripts/avisar.ts teste 3
```

O teste vai para a caixa da LAESA. Abra o e-mail e confira assunto, datas e links. O código no topo do e-mail só é pedido pela tela; o comando não o mostra.

### Enviar

```sh
docker compose exec app node scripts/avisar.ts enviar 3 --por "Seu nome"
```

O comando mostra o assunto e o total de inscritos e pede que você digite esse número. Se o número digitado for diferente, nada é enviado. Depois disso, o envio continua em segundo plano: pode fechar o terminal.

O envio é recusado quando:

- o rascunho não teve teste com exatamente este conteúdo;
- este aviso (mesmo item e mesmo evento) já foi enviado. Para mandar de novo de propósito, use `--reenviar`;
- o terminal não é interativo. Não use `-T` no `enviar`.

### Acompanhar, pausar e cancelar

```sh
docker compose exec app node scripts/avisar.ts status       # os últimos envios
docker compose exec app node scripts/avisar.ts status 5     # um envio
docker compose exec app node scripts/avisar.ts retomar 5    # continua um envio pausado ou parado
docker compose exec app node scripts/avisar.ts cancelar 5   # para um envio; quem já recebeu, recebeu
```

Situações possíveis de um envio: `enviando`, `pausado` (com o motivo), `concluido` e `cancelado`.

### Encerrar as sessões da tela

```sh
docker compose exec app node scripts/avisar.ts sair-todos
```

Faz o mesmo que "Sair de todos os navegadores": encerra todas as sessões da tela e invalida os links de entrada ainda não usados. Use na saída de um membro e em qualquer suspeita de acesso indevido.

## Como o envio se comporta

O envio pausa sozinho quando o SMTP falha várias vezes seguidas (o processamento espera 1, 5 e 15 minutos entre as tentativas) ou quando chega ao teto diário. Resolvido o problema, retome (pela tela ou com `retomar`). Quem já recebeu não recebe de novo, e quem se descadastrou no meio do envio fica de fora.

Quando a conexão com o Gmail cai no meio de uma mensagem, não dá para saber se ela saiu. Nesse caso o envio conta uma falha para aquela pessoa e segue, sem reenviar: é melhor alguém ficar sem o aviso do que receber dois. Três falhas seguidas desse tipo (ou de endereços recusados) pausam o envio.

Se o processo que envia cair (o contêiner reiniciou, por exemplo), a vez dele na fila continua ocupada até vencer sozinha: no máximo uns 17 minutos, o tempo da espera mais longa depois de uma falha do SMTP. A página do envio e o `status` mostram até que horas a vez está ocupada e desde quando nenhum e-mail sai. Se nada mudar até esse horário, retome. Antes disso, retomar não atrapalha: se o processo ainda estiver vivo, o novo sai sem enviar nada.

O registro do processamento fica em `/data/avisos.log`, no volume do contêiner (`docker compose exec app tail /data/avisos.log`), tanto para o que sai pela tela quanto pelo comando. O registro não guarda e-mails, links de entrada, sessões nem códigos de teste.

### Trocar o INSCRICAO_SECRET

Conclua ou cancele os envios antes de trocar o segredo. Cada envio reconhece quem já recebeu por um código feito com ele; com outro segredo, todo mundo pareceria pendente. Por isso retomar (na tela ou com `retomar`) recusa um envio começado com o segredo antigo. Para terminá-lo, volte o segredo antigo, ou cancele o envio. A mesma recusa aparece, por engano, no caso raro de todos que já receberam terem se descadastrado; aí também é só cancelar.

## O que é bloqueado e por quê

| Bloqueio | Motivo |
| --- | --- |
| Item marcado como "Conteúdo provisório" | é texto de exemplo, não informação real |
| Data faltando ou `[data]` no texto | o e-mail sairia com um buraco |
| Edital "aberto" sem link de inscrição | o botão Inscrever-se do site não levaria a lugar nenhum |
| Inscrições já encerradas | o e-mail anunciaria um prazo vencido |
| Evento que não combina com o item | por exemplo, `edital-prorrogado` sem data de prorrogação, ou "em breve" para algo que já aconteceu |
| Link que não é do site | Instagram, formulários e encurtadores ficam na página do site, e o e-mail aponta para ela. Assim todo link do e-mail é conferível e não leva a um endereço digitado errado |
| Caractere invisível no assunto ou no texto | espaço de largura zero e controles de direção do texto escondem o que um link é de verdade. Costumam vir de texto colado: digite o trecho de novo |

O filtro de links é uma heurística: reconhece qualquer endereço com `algo://`, `//`, `www.` ou `nome.dominio`, de qualquer terminação. Endereços de e-mail passam. Às vezes ele pega o que não é link, como `Node.js` ou uma frase sem espaço depois do ponto (`Oi.Tudo`); nesses casos, reescreva o trecho (`Node`, `Oi. Tudo`). Ele não substitui o teste: é na caixa da LAESA que se confere cada link.

## Limites do Gmail

A conta Google Workspace da LAESA envia cerca de 2.000 e-mails por dia. Os avisos usam no máximo 1.500 a cada 24 horas, e o resto fica para as confirmações de inscrição (300) e o formulário de contato (100). Passou disso, o envio pausa e é só retomar no dia seguinte.

O ritmo é de um e-mail a cada 2,5 segundos, cerca de 1.400 por hora. Cada pessoa recebe a própria mensagem, só em texto, com o link de descadastro dela e o cabeçalho de descadastro de um clique (o Gmail pode mostrar um botão "Cancelar inscrição" no topo).

## Pendente: SPF e DKIM

Para os avisos não caírem no spam, o domínio do remetente precisa ter SPF e DKIM configurados para o Google Workspace. Isso depende do iCEV, que administra o domínio. Até lá, peça a quem recebeu o teste que confira se ele chegou na caixa de entrada ou no spam.

## Dados guardados

- Rascunhos e envios: assunto, texto, quem enviou, quando e os totais. Não têm dados de inscritos.
- Tela de avisos: os links de entrada (15 minutos), as sessões (com o nome digitado) e o código do último teste de cada rascunho (24 horas). O banco guarda só um resumo (hash) de cada link, sessão e código, que não serve para entrar nem para enviar.
- Entregas (quem já recebeu cada envio): só um código gerado a partir do e-mail, do qual não dá para recuperar o endereço. Elas são apagadas 30 dias depois do fim do envio e ficam só os totais. Um envio parado por 30 dias (pausado e esquecido, ou travado em `enviando`) é cancelado e apagado do mesmo jeito. A limpeza roda a cada comando e todo dia pelo cron do servidor (`avisar.ts limpar`, que também apaga sessões e links vencidos da tela, ver [operacao.md](operacao.md#backup)).

Tudo isso fica no mesmo banco dos inscritos (`/data/laesa.db`) e entra no backup (`deploy/backup.sh`).
