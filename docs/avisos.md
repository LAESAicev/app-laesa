# Avisos para os inscritos

Guia para a Mesa Diretora mandar um e-mail a quem se inscreveu nas novidades da LAESA (editais, atividades, projetos). O envio é feito por um comando no servidor, dentro do contêiner do site. Não há tela no site para isso.

Qualquer pessoa da Mesa com acesso SSH ao servidor pode enviar. O comando registra o nome de quem enviou, informado em `--por`.

## Antes de começar

Todos os comandos rodam na pasta do site no servidor, a mesma do `docker compose up`. O formato é sempre este:

```sh
docker compose exec app node scripts/avisar.ts <comando>
```

Para encurtar, crie um atalho na sessão: `alias avisar='docker compose exec app node scripts/avisar.ts'`. Os exemplos abaixo usam o comando completo.

## O passo a passo

### 1. Cadastre no painel

Abra o painel (`/keystatic`) e preencha o edital ou a atividade:

- datas: "Inscrições até" no edital, "Data (ou início)" na atividade;
- link de inscrição, quando houver;
- desmarque "Conteúdo provisório".

Para um edital, coloque também "Status do processo seletivo" como "Inscrições abertas" (em Configurações e status da seleção).

### 2. Publique

O aviso usa o que está no site publicado, e não o que está no painel. Depois de salvar, espere o CI gerar a imagem nova e atualize o servidor (`docker compose pull && docker compose up -d`, veja [operacao.md](operacao.md#atualizar-o-site)). O manifesto que o comando lê é gerado nesse build.

### 3. Veja o que dá para avisar

```sh
docker compose exec app node scripts/avisar.ts itens
```

Para cada edital e atividade, o comando mostra a situação no site, o aviso sugerido, se já foi avisado e o que está bloqueando.

### 4. Prepare o aviso

```sh
docker compose exec app node scripts/avisar.ts preparar edital-aberto 2026-2
```

O comando monta o e-mail, confere os bloqueios, salva um rascunho numerado e mostra como ele vai ficar e para quantas pessoas vai.

Os eventos possíveis:

| Evento | Assunto (exemplo) |
| --- | --- |
| `edital-aberto` | Edital 2026.2 aberto: inscrições até 23 out |
| `edital-prorrogado` | Edital 2026.2: inscrições prorrogadas até 30 out |
| `atividade-inscricoes` | Inscrições abertas: Oficina de Figma, 12 nov |
| `atividade-breve` | Em breve na LAESA: Oficina de Figma, 12 nov |
| `projeto` | Saiu do papel: Sistema de monitoria |
| `livre` | o que você escrever |

O item pode ser o código mostrado em `itens` (`edital:2026-2`) ou só a parte final (`2026-2`).

Para trocar o assunto ou o texto do modelo, use `--assunto "…"` e `--texto-arquivo arquivo.txt`. Para colar o texto direto no terminal, use `--texto-arquivo -` e termine com Ctrl+D. O aviso livre não tem item e precisa dos dois:

```sh
docker compose exec -T app node scripts/avisar.ts preparar livre --assunto "Reunião aberta na quinta" --texto-arquivo - < texto.txt
```

O rodapé (por que a pessoa recebe e o link para sair) entra sozinho em todo aviso. Cada mudança no texto gera um rascunho novo, que precisa de um teste novo.

### 5. Teste

```sh
docker compose exec app node scripts/avisar.ts teste 3
```

O teste vai só para a caixa da LAESA. Abra o e-mail e confira assunto, datas e links.

### 6. Envie

```sh
docker compose exec app node scripts/avisar.ts enviar 3 --por "Seu nome"
```

O comando mostra o assunto e o total de inscritos e pede que você digite esse número. Se o número digitado for diferente, nada é enviado. Depois disso, o envio continua em segundo plano: pode fechar o terminal.

O envio é recusado quando:

- o rascunho não teve teste com exatamente este conteúdo;
- este aviso (mesmo item e mesmo evento) já foi enviado. Para mandar de novo de propósito, use `--reenviar`;
- o terminal não é interativo. Não use `-T` no `enviar`.

## Acompanhar, pausar e cancelar

```sh
docker compose exec app node scripts/avisar.ts status       # os últimos envios
docker compose exec app node scripts/avisar.ts status 5     # um envio
docker compose exec app node scripts/avisar.ts retomar 5    # continua um envio pausado
docker compose exec app node scripts/avisar.ts cancelar 5   # para um envio; quem já recebeu, recebeu
```

Situações possíveis de um envio: `enviando`, `pausado` (com o motivo), `concluido` e `cancelado`.

O envio pausa sozinho quando o SMTP falha várias vezes seguidas (o comando espera 1, 5 e 15 minutos entre as tentativas) ou quando chega ao teto diário. Resolvido o problema, use `retomar`. Quem já recebeu não recebe de novo, e quem se descadastrou no meio do envio fica de fora.

Quando a conexão com o Gmail cai no meio de uma mensagem, não dá para saber se ela saiu. Nesse caso o comando conta uma falha para aquela pessoa e segue, sem reenviar: é melhor alguém ficar sem o aviso do que receber dois. Três falhas seguidas desse tipo (ou de endereços recusados) pausam o envio.

Se o processo que envia cair (o contêiner reiniciou, por exemplo), a vez dele na fila continua ocupada até vencer sozinha: no máximo uns 17 minutos, o tempo da espera mais longa depois de uma falha do SMTP. O `status` mostra até que horas a vez está ocupada e desde quando nenhum e-mail sai. Se nada mudar até esse horário, rode `retomar`. Antes disso, o `retomar` não atrapalha: se o processo ainda estiver vivo, o novo sai sem enviar nada.

O registro do processamento fica em `/data/avisos.log`, no volume do contêiner (`docker compose exec app tail /data/avisos.log`). O registro não guarda e-mails.

### Trocar o INSCRICAO_SECRET

Conclua ou cancele os envios antes de trocar o segredo. Cada envio reconhece quem já recebeu por um código feito com ele; com outro segredo, todo mundo pareceria pendente. Por isso o `retomar` recusa um envio começado com o segredo antigo. Para terminá-lo, volte o segredo antigo, ou cancele o envio. A mesma recusa aparece, por engano, no caso raro de todos que já receberam terem se descadastrado; aí também é só cancelar.

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
- Entregas (quem já recebeu cada envio): só um código gerado a partir do e-mail, do qual não dá para recuperar o endereço. Elas são apagadas 30 dias depois do fim do envio e ficam só os totais. Um envio pausado e esquecido por 30 dias é cancelado e apagado do mesmo jeito.

Tudo isso fica no mesmo banco dos inscritos (`/data/laesa.db`) e entra no backup (`deploy/backup.sh`).
