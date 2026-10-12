# Passagem de mandato

Checklist para a troca anual da Mesa Diretora (eleição em novembro). Faça junto com quem sai e quem entra, numa conversa só, e marque cada item.

Regra geral: todo acesso é da LAESA, nunca de um aluno (ADR 0001, decisão 7). Os detalhes de cada troca de segredo estão em [operacao.md](operacao.md#troca-de-mandato-rotatividade).

## Acessos

Preencha os campos `<...>` na primeira passagem e mantenha a tabela atualizada. Não escreva senhas aqui: só onde elas estão guardadas.

| Acesso | Dono fixo | Onde está guardado |
| --- | --- | --- |
| Organização [LAESAicev](https://github.com/LAESAicev) no GitHub (pelo menos dois donos, um deles professor) | `<nome>` | contas pessoais do GitHub dos donos |
| Time `mesa-diretora` da organização (escrita no `app-laesa`) | `<nome>` | https://github.com/orgs/LAESAicev/teams |
| GitHub App do painel, se estiver ligado | `<nome>` | configurações do App na organização; credenciais no `.env` do servidor |
| Conta Google Workspace da LAESA (verificação em duas etapas e recuperação presas ao(à) orientador(a)) | `<nome>` | `<onde está guardado>` |
| Senha de app do Gmail (`SMTP_PASS`) | `<nome>` | cofre da LAESA, junto com o `.env` |
| `.env` do servidor (todos os segredos) | `<nome>` | `<cofre: Bitwarden da organização ou pasta restrita do Drive>` |
| Senha do `gpg` dos backups | `<nome>` | cofre da LAESA, junto com o `.env` |
| SSH no servidor do iCEV e grupo `docker` | `<nome>` | `<lista de quem tem acesso>` |
| Contato do setor de tecnologia do iCEV | `<nome>` | `<onde está o contato>` |
| Domínio e DNS (`laesa.icev.edu.br`, administrado pelo iCEV) | `<nome>` | `<quem no iCEV responde>` |
| Figma (arquivo "LAESA Site v2") | `<nome>` | `<conta dona do arquivo>` |

## Passos

1. Transferir a posse. Para cada linha da tabela, quem entra recebe acesso e confere que consegue entrar. Quem sai só perde o acesso depois disso.
2. Trocar os segredos (como fazer em [operacao.md](operacao.md#troca-de-mandato-rotatividade)):
   - [ ] senha de app do Gmail: revogar a antiga, gerar outra e atualizar o `SMTP_PASS` no `.env` do servidor e no cofre;
   - [ ] `KEYSTATIC_SECRET`, se o painel estiver ligado em produção. Quem estava logado no painel só precisa entrar de novo;
   - [ ] `INSCRICAO_SECRET`: **não** troque por rotina, só se vazar. Trocar invalida os links de descadastro já enviados (efeitos em operacao.md);
   - [ ] depois de mudar o `.env`, rode `docker compose up -d` no servidor (`restart` não relê o arquivo).
3. Tirar quem saiu:
   - [ ] do time `mesa-diretora` e, se for o caso, da organização no GitHub;
   - [ ] do SSH e do grupo `docker` no servidor (estar no grupo equivale a ter root e ler o `.env`);
   - [ ] do cofre e da pasta do Drive;
   - [ ] do arquivo no Figma.
4. Conferir backups e cron:
   - [ ] `journalctl -t backup-laesa` mostra backups recentes;
   - [ ] a pasta `~/backups-laesa` não tem arquivos com mais de 30 dias;
   - [ ] `crontab -l` do usuário do deploy ainda tem as linhas de backup e, se o painel estiver desligado, de atualização ([operacao.md](operacao.md#backup)).
5. Combinar a revisão semanal dos PRs do Dependabot. As imagens Docker e as actions do CI estão fixadas por digest ou SHA, então correções de segurança só chegam por esses PRs. Alguém da nova Mesa precisa olhar os PRs abertos toda semana e fazer merge quando o CI estiver verde.
6. Atualizar o conteúdo pelo painel (`/keystatic`):
   - [ ] Mesa Diretora: nomes e fotos dos novos cargos;
   - [ ] desmarcar "Conteúdo provisório" de quem já tem dados reais.
7. Atualizar este arquivo: a tabela de acessos com os novos donos, num commit `docs: atualiza passagem de mandato <ano>`.
