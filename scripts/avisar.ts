// Avisos para os inscritos nas novidades da LAESA. Roda no servidor, dentro do contêiner do site:
//   docker compose exec app node scripts/avisar.ts <comando>
// Guia da Mesa: docs/avisos.md. Nada chega aos inscritos sem "enviar", e "enviar" exige teste do mesmo
// conteúdo e a digitação do número de destinatários. Configuração pelo ambiente do contêiner:
// INSCRITOS_DB, INSCRICAO_SECRET, SMTP_*, ENVIO_REAL, AVISOS_TESTE_PARA, AVISOS_MANIFESTO, AVISOS_LOG.
import { spawn } from 'node:child_process';
import { openSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { TIMEZONE, hojeEm } from '../src/lib/atividades.ts';
import { bloqueios } from '../src/lib/avisos/bloqueios.ts';
import { ErroAviso, chaveDoItem, criarFila, type Envio, type Fila, type Rascunho } from '../src/lib/avisos/fila.ts';
import { lerManifesto, type Item, type Manifesto } from '../src/lib/avisos/manifesto.ts';
import { processar } from '../src/lib/avisos/processar.ts';
import { criarRemetente } from '../src/lib/avisos/remetente.ts';
import { estadoDa, eventoSugerido, eventoValido, mensagemPara, renderizar, rodape, EVENTOS, type Evento } from '../src/lib/avisos/templates.ts';
import { EnvioIndisponivel } from '../src/lib/smtp.ts';

const AJUDA = `Uso: node scripts/avisar.ts <comando>

  itens                                    o que está publicado e o aviso sugerido para cada item
  preparar <evento> <item> [--assunto "…"] [--texto-arquivo arquivo|-]
                                           monta o aviso, confere os bloqueios e salva um rascunho
  teste <rascunho>                         manda só para a caixa da LAESA
  enviar <rascunho> --por "Seu nome" [--reenviar]
                                           manda para todos os inscritos (pede o número de destinatários)
  status [envio]                           envios: quem, quando, quantos, situação
  retomar <envio>                          continua um envio pausado
  cancelar <envio>                         para um envio
  limpar                                   retenção (30 dias) dos registros de entrega; para o cron diário

Eventos: ${EVENTOS.join(', ')}. No evento "livre" não há item: use --assunto e --texto-arquivo.`;

const env = process.env;
const DB = env.INSCRITOS_DB || '/data/laesa.db';
const LOG = env.AVISOS_LOG || join(dirname(DB), 'avisos.log');

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    assunto: { type: 'string' },
    'texto-arquivo': { type: 'string' },
    por: { type: 'string' },
    reenviar: { type: 'boolean', default: false },
    manifesto: { type: 'string' },
    ajuda: { type: 'boolean', short: 'h', default: false },
  },
});
const [comando, ...args] = positionals;

class Uso extends Error {}

function segredo(): string {
  const s = env.INSCRICAO_SECRET ?? '';
  if (s.length < 32) throw new Uso('INSCRICAO_SECRET não está definido no ambiente (precisa ter 32 caracteres ou mais).');
  return s;
}

/** Toda execução aplica a retenção de 30 dias (avisos e descadastros, fila.limpar); o cron diário ("limpar") cobre os dias sem uso. */
async function abrirFila() {
  const fila = criarFila(DB, segredo());
  return { fila, limpeza: await fila.limpar() };
}

const manifesto = (): Manifesto => lerManifesto(resolve(op.manifesto || env.AVISOS_MANIFESTO || 'dist/client/avisos/itens.json'));

function remetente(contato: string) {
  return criarRemetente({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT || 465),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    liberado: env.NODE_ENV === 'production' || env.ENVIO_REAL === 'true',
    ambiente: env.NODE_ENV || 'development',
    contato,
  });
}

const quando = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

const hora = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, timeStyle: 'short' }).format(new Date(iso));

const numero = (v: string | undefined, o_que: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Uso(`Diga o número do ${o_que}. Exemplo: ${comando} 3`);
  return n;
};

const nomeDo = (item: Item) => (item.tipo === 'edital' ? item.titulo : item.nome);

/** "2026-2", "edital:2026-2" ou o slug de uma atividade. */
function acharItem(m: Manifesto, chave: string | undefined): Item | undefined {
  if (!chave) return undefined;
  return m.itens.find((i) => i.id === chave) ?? m.itens.find((i) => i.id.endsWith(`:${chave}`));
}

function conferir(evento: Evento, item: Item | undefined, m: Manifesto, conteudo: { assunto: string; texto: string }): void {
  const motivos = bloqueios({ evento, item, manifesto: m, conteudo });
  if (!motivos.length) return;
  throw new ErroAviso(`Bloqueado:\n${motivos.map((x) => `  - ${x}`).join('\n')}`);
}

function rascunhoOuErro(fila: Fila, v: string | undefined): Rascunho {
  const r = fila.rascunho(numero(v, 'rascunho'));
  if (!r) throw new ErroAviso(`Rascunho ${v} não existe.`);
  return r;
}

/** Revalida o rascunho com o site publicado agora (o item pode ter mudado desde o preparar). */
function revalidar(r: Rascunho): Manifesto {
  const m = manifesto();
  const item = r.item ? acharItem(m, r.item) : undefined;
  conferir(r.evento, item, m, r);
  return m;
}

/** Processamento em segundo plano: fechar o terminal não interrompe. Saída no arquivo de log. */
function iniciarProcessamento(): void {
  const saida = openSync(LOG, 'a');
  const filho = spawn(process.execPath, [fileURLToPath(import.meta.url), 'processar'], { detached: true, stdio: ['ignore', saida, saida], env });
  filho.unref();
  console.log(`Enviando em segundo plano (registro em ${LOG}). Acompanhe com: node scripts/avisar.ts status`);
}

function linhaEnvio(e: Envio): string {
  const alvo = e.item ? `${e.item} · ${e.evento}` : 'livre';
  const linhas = [`#${e.id}  ${e.status.padEnd(9)}  ${e.enviados}/${e.total_previsto} enviados, ${e.falhas} falhas  ${alvo}`, `     "${e.assunto}"`, `     por ${e.por} em ${quando(e.criado_em)}${e.finalizado_em ? `, terminou em ${quando(e.finalizado_em)}` : ''}`];
  if (e.motivo) linhas.push(`     motivo: ${e.motivo}`);
  return linhas.join('\n');
}

async function principal(): Promise<void> {
  if (!comando || op.ajuda || comando === 'ajuda') return console.log(AJUDA);

  if (comando === 'itens') {
    const m = manifesto();
    const { fila } = await abrirFila();
    const hoje = hojeEm();
    console.log(`Site publicado em ${quando(m.geradoEm)} (${m.site}). Hoje: ${hoje}.\n`);
    for (const item of m.itens) {
      const evento = eventoSugerido(item, hoje);
      const situacao = item.tipo === 'edital' ? `seleção: ${item.status}` : estadoDa(item, hoje);
      console.log(`${item.id}\n  ${nomeDo(item)} (${situacao}${item.exemplo ? ', provisório' : ''})`);
      if (!evento) {
        console.log('  nada a avisar agora');
        continue;
      }
      const antes = fila.notificacoes(item.id, evento);
      const motivos = bloqueios({ evento, item, manifesto: m, conteudo: renderizar(evento, item), hoje });
      console.log(`  sugerido: preparar ${evento} ${item.id}`);
      if (antes.length) console.log(`  já avisado: ${antes.map((a) => `envio ${a.envio_id} em ${quando(a.criado_em)}`).join(', ')}`);
      for (const x of motivos) console.log(`  bloqueado: ${x}`);
    }
    return;
  }

  if (comando === 'preparar') {
    const [ev, chave] = args;
    if (!ev || !eventoValido(ev)) throw new Uso(`Diga o evento: ${EVENTOS.join(', ')}.`);
    const m = manifesto();
    const item = ev === 'livre' ? undefined : acharItem(m, chave);
    if (ev !== 'livre' && !chave) throw new Uso('Diga o item (veja os códigos com o comando "itens").');
    const arquivo = op['texto-arquivo'];
    const texto = arquivo ? readFileSync(arquivo === '-' ? 0 : arquivo, 'utf8') : undefined;
    if (ev === 'livre' && (!op.assunto || !texto)) throw new Uso('No aviso livre, passe --assunto "…" e --texto-arquivo arquivo (ou - para colar no terminal).');
    const conteudo = renderizar(ev, item, { assunto: op.assunto, texto });
    conferir(ev, item, m, conteudo);
    const { fila } = await abrirFila();
    const r = fila.salvarRascunho({ item: item?.id ?? null, evento: ev, ...conteudo, site: m.site, contato: m.contato });
    const total = (await fila.inscritos()).length;
    console.log(`Rascunho ${r.id} salvo.\n\nAssunto: ${r.assunto}\n\n${r.texto}\n\n${rodape(r.site, '<link de descadastro de cada pessoa>')}\n`);
    console.log(`Inscritos agora: ${total}.`);
    const antes = item ? fila.notificacoes(item.id, ev) : [];
    if (antes.length) console.log(`Atenção: este aviso já foi enviado (envio ${antes.at(-1)!.envio_id}). Só sai de novo com --reenviar.`);
    console.log(`Próximo passo: node scripts/avisar.ts teste ${r.id}`);
    return;
  }

  if (comando === 'teste') {
    const { fila } = await abrirFila();
    const r = rascunhoOuErro(fila, args[0]);
    revalidar(r);
    const para = env.AVISOS_TESTE_PARA || r.contato;
    await remetente(r.contato)(mensagemPara(r, para, segredo()));
    fila.marcarTeste(r.id);
    console.log(`Teste do rascunho ${r.id} enviado para ${para}. Confira assunto, texto e links.`);
    console.log(`Estando tudo certo: node scripts/avisar.ts enviar ${r.id} --por "Seu nome"`);
    return;
  }

  if (comando === 'enviar') {
    const { fila } = await abrirFila();
    const r = rascunhoOuErro(fila, args[0]);
    if (!op.por?.trim()) throw new Uso('Diga quem está enviando: --por "Seu nome".');
    revalidar(r);
    remetente(r.contato); // falha aqui, e não em segundo plano, se o SMTP estiver mal configurado
    if (!fila.testado(r)) throw new ErroAviso(`O rascunho ${r.id} ainda não teve teste deste conteúdo. Rode "teste ${r.id}" e confira a caixa da LAESA.`);
    const antes = fila.notificacoes(chaveDoItem(r), r.evento);
    if (antes.length && !op.reenviar) {
      const u = antes.at(-1)!;
      throw new ErroAviso(`Este aviso já foi enviado (envio ${u.envio_id}, por ${u.por}, em ${quando(u.criado_em)}). Para mandar de novo, use --reenviar.`);
    }
    const total = (await fila.inscritos()).length;
    if (!total) throw new ErroAviso('Ninguém inscrito: não há para quem enviar.');
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Uso('Rode "enviar" num terminal interativo (docker compose exec, sem -T): é preciso digitar a confirmação.');
    console.log(`Assunto: ${r.assunto}\nVai para ${total} inscritos, um e-mail por pessoa (~${Math.ceil((total * 2.5) / 60)} min).`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const resposta = await rl.question('Para confirmar, digite o número de destinatários: ');
    rl.close();
    if (resposta.trim() !== String(total)) throw new ErroAviso('Número diferente: nada foi enviado.');
    const e = fila.criarEnvio(r.id, op.por, total, { reenviar: op.reenviar });
    console.log(`Envio ${e.id} criado.`);
    iniciarProcessamento();
    return;
  }

  if (comando === 'processar') {
    const { fila } = await abrirFila();
    const proximo = fila.proximoEnvio();
    if (!proximo) return console.log(`[avisos] ${new Date().toISOString()} nada a enviar`);
    const enviar = remetente(fila.rascunho(proximo.rascunho_id)!.contato);
    await processar({ fila, segredo: segredo(), enviar });
    return;
  }

  if (comando === 'status') {
    const { fila } = await abrirFila();
    const lista = args[0] ? [fila.envio(numero(args[0], 'envio'))].filter((e) => e !== undefined) : fila.envios().slice(0, 10);
    if (!lista.length) return console.log(args[0] ? `Envio ${args[0]} não existe.` : 'Nenhum envio ainda.');
    for (const e of lista) console.log(linhaEnvio(e));
    const vez = fila.processador();
    const pendente = fila.proximoEnvio();
    if (vez) {
      console.log(`\nProcessando agora (ritmo de ~1 e-mail a cada 2,5 s; vez ocupada até ${hora(vez.expira_em)}).`);
      // sem e-mail novo há mais de 1 min: espera depois de falha do SMTP (até 15 min) ou o processo caiu
      if (pendente && Date.now() - Date.parse(pendente.atualizado_em) > 60_000) {
        console.log(`Nenhum e-mail saiu desde ${hora(pendente.atualizado_em)}. Pode ser a espera depois de uma falha do SMTP (veja ${LOG}).`);
        console.log(`Se nada mudar, rode retomar ${pendente.id} depois de ${hora(vez.expira_em)}.`);
      }
    } else if (pendente) console.log(`\nHá envio "enviando" sem processamento ativo: rode retomar ${pendente.id}.`);
    return;
  }

  if (comando === 'retomar') {
    const { fila } = await abrirFila();
    const e = await fila.retomar(numero(args[0], 'envio'));
    console.log(`Envio ${e.id} retomado: faltam ${Math.max(e.total_previsto - e.enviados - e.falhas, 0)} de ${e.total_previsto} (a conta usa a lista de inscritos de agora).`);
    iniciarProcessamento();
    return;
  }

  if (comando === 'cancelar') {
    const { fila } = await abrirFila();
    const e = fila.cancelar(numero(args[0], 'envio'));
    console.log(`Envio ${e.id} cancelado: ${e.enviados} já tinham recebido. O resto não recebe.`);
    return;
  }

  if (comando === 'limpar') {
    const { limpeza } = await abrirFila();
    console.log(`[avisos] ${new Date().toISOString()} limpeza: ${limpeza.cancelados} envios parados cancelados, ${limpeza.apagadas} entregas apagadas`);
    return;
  }

  throw new Uso(`Comando desconhecido: ${comando}\n\n${AJUDA}`);
}

principal().catch((e: unknown) => {
  if (e instanceof Uso || e instanceof ErroAviso || e instanceof EnvioIndisponivel) console.error(e.message);
  else console.error('Erro inesperado:', e);
  process.exitCode = 1;
});
