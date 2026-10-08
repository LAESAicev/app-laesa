# Contrato: formulário de contato e inscrição em avisos

Derivado das telas de Contato validadas no Figma (`design/src/contato.html`). Implementado como rotas do próprio app Astro (`src/pages/api/contato.ts` e `src/pages/api/inscricao.ts`), ver ADR 0001.

## `POST /api/contato`

Corpo em JSON. Os campos comuns valem para todos os assuntos; os específicos só para o assunto indicado.

### Campos comuns

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `assunto` | `"duvida" \| "feedback" \| "projeto" \| "colaborar"` | sim | define quais campos específicos valem |
| `nome` | string | sim, exceto feedback anônimo | 2–120 caracteres |
| `email` | string | sim, exceto feedback anônimo | e-mail válido |
| `mensagem` | string | sim | 10–4000 caracteres |

### `assunto: "feedback"`

| Campo | Tipo | Obrigatório | Valores |
| --- | --- | --- | --- |
| `atividade` | string | não | `evento`, `oficina`, `processo-seletivo`, `site`, `outro` (valor fora da lista gera 422) |
| `anonimo` | boolean | não (padrão `false`) | se `true`, `nome` e `email` são descartados e não há resposta |

### `assunto: "projeto"`

| Campo | Tipo | Obrigatório | Valores |
| --- | --- | --- | --- |
| `organizacao` | string | sim | 2–160 caracteres |
| `tipoProjeto` | string | sim | `sistema-web`, `aplicativo`, `pesquisa`, `oficina-curso`, `outro` |
| `prazo` | string | não | até 60 caracteres; a interface oferece "Este semestre", "Próximo semestre" e "Ainda este ano" |

### `assunto: "colaborar"`

| Campo | Tipo | Obrigatório | Valores |
| --- | --- | --- | --- |
| `formaColaboracao` | string | sim | `palestra`, `mentoria`, `oficina`, `apoio-evento`, `outro` |
| `area` | string | sim | área de atuação, 2–120 caracteres |
| `link` | string (URL) | não | LinkedIn ou portfólio; sem `https://`, o prefixo é completado |

## Respostas

| Status | Quando | Corpo |
| --- | --- | --- |
| `201` | mensagem enviada para a caixa da LAESA | `{ "id": "..." }` |
| `400` | corpo ilegível, `null` ou array | `{ "erro": "..." }` |
| `403` | pedido vindo de outro site (cabeçalho `Sec-Fetch-Site` diferente de `same-origin` ou `none`) | `{ "erro": "Pedido recusado." }` |
| `415` | corpo que não é `application/json` | `{ "erro": "..." }` |
| `422` | validação falhou | `{ "erros": { "<campo>": "mensagem que diz o problema e como corrigir" } }` |
| `429` | mais de 5 envios do mesmo IP em 10 minutos, mais de 10 mensagens do mesmo IP em 24h, ou mais de 100 mensagens de todo o site em 24h (contadores em memória, zeram ao reiniciar). IPv6 conta por prefixo /64. Mensagem que não chegou a sair (`500`/`503`) não gasta a vaga diária do IP | `{ "erro": "..." }`; nos tetos diários, `"... escreva direto para <e-mail da LAESA>"` |
| `500` | falha ao enviar | `{ "erro": "... escreva para <e-mail da LAESA>" }` |
| `503` | SMTP não configurado (`SMTP_USER` ou `SMTP_PASS` vazio) ou envio real bloqueado fora de produção (ver `ENVIO_REAL` no `.env.example`) | `{ "erro": "... escreva direto para <e-mail da LAESA>" }` |

Corpo sempre em JSON (pedidos cross-site com JSON exigem preflight, o que protege contra CSRF). O formulário precisa de JavaScript.

Campo extra `nao_preencher`: honeypot. Se vier preenchido, a resposta é `201` e nada é enviado.

Implementação: `src/pages/api/contato.ts`. A validação é a mesma no navegador e no servidor (`src/lib/contato.schema.ts`).

## `POST /api/inscricao`

Pede a inscrição nos avisos e envia um e-mail de confirmação (confirmação dupla).

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `email` | string | sim | e-mail válido (normalizado para minúsculas) |
| `consentimento` | `true` | sim | caixa "Autorizo a LAESA a me enviar avisos…" marcada |
| `nao_preencher` | string | não | honeypot |

| Status | Quando |
| --- | --- |
| `202` | e-mail de confirmação enviado (link válido por 7 dias). Também responde 202, sem reenviar, se o mesmo e-mail pediu nas últimas 24h ou se o site já mandou 300 confirmações em 24h (contador em memória), e quando o honeypot vem preenchido (nada é enviado) |
| `400` | corpo ilegível, `null` ou array |
| `403` | pedido vindo de outro site (`Sec-Fetch-Site`) |
| `415` | corpo que não é `application/json` |
| `422` | validação falhou (`{ "erros": … }`) |
| `429` | mais de 5 tentativas do mesmo IP em 10 minutos, ou mais de 20 confirmações pedidas pelo mesmo IP em 24h (IPv6 por prefixo /64; pedido que não envia nada não conta). O limite do IP vem antes do teto de 300, então um IP barrado não gasta a cota do site |
| `500` | falha ao enviar o e-mail de confirmação. A cota do e-mail é devolvida, então dá para tentar de novo na hora |
| `503` | `INSCRICAO_SECRET` ou `INSCRITOS_STORE` não definido, ou SMTP indisponível (mesmos casos do contato). O corpo diz que as inscrições abrem em breve |

Os erros vêm em `{ "erro": "..." }`, exceto o `422`. O `202` responde `{ "ok": true }`.

Links assinados (HMAC com `INSCRICAO_SECRET`):
- `/avisos/confirmar?t=…`: o GET mostra o botão "Confirmar inscrição"; o POST confirma. Um link emitido antes de um descadastro não reinscreve.
- `/avisos/descadastro?t=…`: o GET mostra o botão; o POST apaga o e-mail da lista. Fica só um código irreversível dele (HMAC), por 30 dias, para o link de confirmação antigo não reinscrever. Também aceita o descadastro de um clique do Gmail (RFC 8058). Todo aviso enviado leva esse link e os cabeçalhos `List-Unsubscribe`.

As mensagens de erro de `422` aparecem direto na tela, então seguem o tom do site. Exemplo: "Esse e-mail parece incompleto. Use o formato nome@exemplo.com."

## Requisitos

- Proteção contra spam: honeypot ou captcha leve, mais limite de envios por IP.
- Dados pessoais usados só para responder a mensagem (texto já exibido no formulário). Nada de compartilhar com terceiros.
- A resposta de sucesso não promete prazo de retorno; o site não define SLA.
