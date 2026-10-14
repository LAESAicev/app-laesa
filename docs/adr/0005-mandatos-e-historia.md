# ADR 0005: Um registro por mandato da Mesa e uma página de história

- **Status:** aceita
- **Data:** 2026-10-13
- **Contexto da decisão:** plano da v1.1.0, aprovado pela Bea em 2026-10-13. Uso em [passagem-de-mandato.md](../passagem-de-mandato.md).

## Contexto

Até a v1.0.0, a Mesa Diretora era um singleton (`content/mesa.yaml`) com um campo fixo por cargo. Na troca anual, alguém sobrescrevia os nomes e as fotos, e a Mesa anterior sumia do site.

A v1.1.0 cria a página `/historia`, com a origem da liga, os fundadores e todas as Mesas que já conduziram a LAESA. Ela precisava de:
- guardar cada Mesa sem que a troca apagasse a anterior;
- aceitar mandatos antigos, de quando o estatuto tinha outros cargos (Financeiro, Comunicação, Ensino, Pesquisa);
- mostrar foto e LinkedIn só de quem autorizou;
- deixar a troca da Mesa como mudança só de conteúdo, que vai ao ar sozinha ([ADR 0004](0004-deploy-automatico-de-conteudo.md)).

## Decisões

1. **Coleção `mandatos`, um arquivo por ano.** Cada mandato fica em `content/mandatos/<ano>.yaml`. O endereço (slug) é o ano com quatro dígitos, e o build recusa qualquer outro formato. A Mesa de `content/mesa.yaml` virou `content/mandatos/2026.yaml`.

2. **O mandato atual é o de maior ano.** Não há ponteiro "mandato atual" nem comparação com a data de hoje. Trocar a Mesa é criar o mandato do ano novo na posse (última reunião interna do ano, Art. 35 do estatuto). A home mostra esse mandato, e `/historia` lista todos, do mais recente para o mais antigo.

3. **Membros numa lista ordenada, com cargo livre.** Cada membro tem cargo, nome, foto, LinkedIn e o selo de conteúdo provisório. O cargo é texto livre porque os estatutos antigos tinham outros cargos; a descrição do campo no painel lista os cargos do estatuto atual. A ordem da lista é a ordem no site.

4. **Orientador(a) num campo à parte.** O(a) professor(a) orientador(a) não faz parte da Mesa. Por isso fica fora da lista de membros, num objeto próprio com os mesmos dados (nome, foto, LinkedIn, selo). Aparece se qualquer campo estiver preenchido; sem nome, como "Nome a confirmar", igual aos membros.

5. **Foto e LinkedIn são opcionais e dependem de autorização.** Valem para qualquer mandato. Só entra foto ou LinkedIn de quem autorizou, e o registro da autorização fica fora do site (cofre ou Drive da LAESA). Sem foto, o site mostra as iniciais no quadro 4:5. Sem LinkedIn, não mostra nada.

6. **LinkedIn só como perfil, em duas camadas.** O painel guarda o campo como texto com padrão: aceita vazio ou um perfil do LinkedIn em `https` (com ou sem `www`, com subdomínio de país como `br.linkedin.com`, com ou sem `?utm_...`/`#...` no fim) e mostra o erro no próprio campo. O build normaliza antes de validar: tira `?...`, `#...` e a barra final, troca o subdomínio de país (ou a falta de `www`) por `www.linkedin.com` e codifica letras acentuadas do perfil (`joão` vira `jo%C3%A3o`). Depois valida estrito, `https://www.linkedin.com/in/<perfil>`, com o perfil feito só de letras, números, `_`, `-` ou percent-encoding de caracteres não ASCII (`%2e%2e`, `%00`, `%2f` são recusados). Recusa outro esquema, outro domínio, usuário ou porta na URL e outras páginas do LinkedIn; o erro derruba o build com uma mensagem clara. O endereço normalizado é o que vai para o HTML, e o link abre em nova aba com `rel="noopener noreferrer"`. O painel aceitava qualquer URL e o build recusava os formatos que o app do LinkedIn copia, o que travava o deploy de conteúdo; por isso a limpeza fica no build e a recusa aparece no painel.

7. **Estatuto da época, opcional, por mandato.** Cada mandato pode ter o PDF do estatuto em vigor naquele ano, enviado pelo painel para `public/uploads/mandatos/<ano>/`. Em `/historia`, o mandato com PDF mostra o link "Estatuto em vigor na época"; sem PDF, não mostra nada. O mandato atual não herda o estatuto do site: o link só aparece se o campo estiver preenchido. O build aceita só caminho do próprio site que comece com `/uploads/` e termine em `.pdf`.

8. **Singleton `historia`.** Um texto livre, com parágrafos separados por linha em branco, e a lista de fundadores (nome e papel, sem foto). Não modelamos as fases da liga: uma pausa e a retomada cabem no texto.

## Alternativas descartadas

- **Manter o singleton e copiar a Mesa antiga para um histórico à mão:** depende de alguém lembrar de copiar antes de sobrescrever, e um esquecimento perde a Mesa anterior.
- **Mandato vigente pela data (início e fim):** o site é gerado no build, então trocaria de Mesa na data do último build, e não na da posse. Também obrigaria a preencher datas que o estatuto não fixa com precisão.
- **Ponteiro `mandatoAtual` nas configurações:** é um campo a mais para esquecer na troca, e ele pode apontar para um mandato que não existe. **Reconsiderar** se a Mesa precisar cadastrar o mandato novo antes da posse sem que ele apareça na home. Hoje, quem cria o mandato do ano seguinte antes da hora coloca essa Mesa no site.

## Consequências

- A troca da Mesa vira um passo da [passagem de mandato](../passagem-de-mandato.md): criar o mandato do ano no painel, sem editar o anterior.
- Criar um mandato muda só YAML em `content/`, fotos em `src/assets/uploads/` e o PDF do estatuto em `public/uploads/`, então continua sendo conteúdo promovido sozinho (ADR 0004). A v1.1.0 em si é código e precisa de promoção manual.
- **Limite:** o modelo guarda uma Mesa por ano. Se alguém for substituído no meio do mandato e o item for editado, quem saiu some do histórico. Se isso começar a acontecer, um caminho possível é registrar o período de cada membro (ainda não avaliado).
- Os mandatos anteriores a 2026 só entram com dados confirmados. Não há Mesa antiga inventada no site.
