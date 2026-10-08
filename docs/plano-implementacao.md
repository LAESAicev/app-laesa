# Plano de implementação: o que falta

Base: [ADR 0001](adr/0001-arquitetura-do-site.md). As fases 1 a 5 (páginas, painel local, animação, formulários, Docker e CI) estão prontas e rodam localmente. O histórico de cada fase está no git (`git log --oneline`) e nas notas de implementação do ADR 0001.

Este arquivo lista só as pendências. Marque e apague o item quando ele for resolvido.

## Depende do iCEV

- [ ] Domínio (`laesa.icev.edu.br`) e servidor com Docker, portas 80 e 443 e saída para `smtp.gmail.com:465`. Perguntas prontas em [operacao.md](operacao.md#checklist-para-pedir-ao-icev).
- [ ] SPF e DKIM (e DMARC) do domínio de envio, para os avisos não caírem no spam ([avisos.md](avisos.md#pendente-spf-e-dkim)).
- [ ] Itens da página de privacidade (`src/pages/privacidade.astro`): controlador dos dados, encarregado (nome e contato) e base legal. A página inteira ainda está marcada como rascunho para revisão do iCEV.

## Depende da LAESA

- [ ] GitHub App do painel em produção, depois do domínio e do servidor. Passo a passo em [operacao.md](operacao.md#painel-em-produção).
- [ ] Prazo de retenção das mensagens de contato na caixa da LAESA (também aparece na página de privacidade).
- [ ] Decidir se os avisos saem por uma conta de envio dedicada no Workspace, separada da caixa que recebe o contato.
- [ ] Conteúdo pendente: lista em [README](../README.md#pendências).
- [ ] Preencher a tabela de acessos em [passagem-de-mandato.md](passagem-de-mandato.md).

## Depois de publicar

- [ ] Criar `SITE_URL` e `PUBLIC_CONTACT_EMAIL` nas Variables do GitHub e tornar a checagem do `ci.yml` obrigatória ([operacao.md](operacao.md#de-onde-vêm-site_url-e-as-variáveis-public_-da-imagem)).
- [ ] Agendar o backup no cron do servidor ([operacao.md](operacao.md#backup)).
