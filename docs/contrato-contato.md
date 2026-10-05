# Contrato: formulário de contato (rascunho)

Derivado das telas de Contato validadas no Figma (`design/src/contato.html`). Implementado como rota do próprio app Astro (`src/pages/api/contato.ts`), ver ADR 0001. Os nomes de campo ainda podem mudar na implementação.

## `POST /contato`

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
| `atividade` | string | não | `evento`, `oficina`, `processo-seletivo`, `site`, `outro` |
| `anonimo` | boolean | não (padrão `false`) | se `true`, `nome` e `email` são descartados e não há resposta |

### `assunto: "projeto"`

| Campo | Tipo | Obrigatório | Valores |
| --- | --- | --- | --- |
| `organizacao` | string | sim | 2–160 caracteres |
| `tipoProjeto` | string | sim | `sistema-web`, `aplicativo`, `pesquisa`, `oficina-curso`, `outro` |
| `prazo` | string | não | texto livre (ex.: "Próximo semestre") |

### `assunto: "colaborar"`

| Campo | Tipo | Obrigatório | Valores |
| --- | --- | --- | --- |
| `formaColaboracao` | string | sim | `palestra`, `mentoria`, `oficina`, `apoio-evento`, `outro` |
| `area` | string | sim | área de atuação, 2–120 caracteres |
| `link` | string (URL) | não | LinkedIn ou portfólio |

## Respostas

| Status | Quando | Corpo |
| --- | --- | --- |
| `201` | mensagem registrada | `{ "id": "..." }` |
| `422` | validação falhou | `{ "erros": { "<campo>": "mensagem que diz o problema e como corrigir" } }` |
| `429` | excesso de envios do mesmo IP | `{ "erro": "..." }` |
| `500` | falha ao registrar ou encaminhar | `{ "erro": "..." }` |

As mensagens de erro de `422` aparecem direto na tela, então seguem o tom do site. Exemplo: "Esse e-mail parece incompleto. Use o formato nome@exemplo.com."

## Requisitos

- Proteção contra spam: honeypot ou captcha leve, mais limite de envios por IP.
- Dados pessoais usados só para responder a mensagem (texto já exibido no formulário). Nada de compartilhar com terceiros.
- A resposta de sucesso não promete prazo de retorno; o site não define SLA.
