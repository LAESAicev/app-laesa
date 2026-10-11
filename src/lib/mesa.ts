// Peças da tela de avisos (/mesa) no servidor: fila e painel (um por processo), manifesto publicado, remetente
// dos avisos, processamento em segundo plano e login por link. As regras ficam em src/lib/avisos/acoes.ts e src/lib/painel.ts, as mesmas do comando (scripts/avisar.ts);
// aqui só entra o ambiente do site.
import { appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { AVISOS_LOG, AVISOS_MANIFESTO, ENVIO_REAL, INSCRICAO_SECRET, INSCRITOS_DB, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';
import { ErroAviso, criarFila, quando, type Envio, type Fila } from './avisos/fila';
import { lerManifesto, type Manifesto } from './avisos/manifesto';
import { processar } from './avisos/processar';
import { criarRemetente } from './avisos/remetente';
import { resumoErro } from './http';
import { enviar } from './mailer';
import { painelEm } from './painel';
import { chaveIp, criarLimite } from './rate-limit';
import { EnvioIndisponivel, ambienteAtual, envioRealLiberado } from './smtp';

const MIN = 60_000;

/** INSCRICAO_SECRET (assina os links de descadastro dos avisos). */
export function segredo(): string {
  if (!INSCRICAO_SECRET) throw new EnvioIndisponivel('INSCRICAO_SECRET não definido.');
  return INSCRICAO_SECRET;
}

let fila: Fila | undefined;
/** A fila dos avisos, uma por processo (mesmo banco dos inscritos). */
export const filaDaMesa = (): Fila => (fila ??= criarFila(INSCRITOS_DB, segredo()));

export const painel = () => painelEm(INSCRITOS_DB);

/** O que está publicado no site, lido do manifesto gerado no build (o mesmo arquivo que o comando lê). */
export function manifesto(): Manifesto {
  try {
    return lerManifesto(resolve(AVISOS_MANIFESTO || 'dist/client/avisos/itens.json'));
  } catch (e) {
    console.error('[mesa]', (e as Error).message);
    throw new ErroAviso('Não consegui ler o que está publicado no site (avisos/itens.json). Quem cuida do servidor precisa gerar o site de novo.');
  }
}

/** Remetente dos avisos, com a trava de SMTP local fora de produção (src/lib/smtp.ts). Lança EnvioIndisponivel. */
export const remetente = () =>
  criarRemetente({
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    pass: SMTP_PASS,
    liberado: envioRealLiberado(ENVIO_REAL),
    ambiente: ambienteAtual(),
    contato: PUBLIC_CONTACT_EMAIL,
  });

const LOG = AVISOS_LOG || join(dirname(INSCRITOS_DB), 'avisos.log');

/** Uma linha no registro dos avisos (o mesmo arquivo do comando). Nunca passe e-mail, token, sessão ou código. */
export function registrar(linha: string): void {
  const texto = `[avisos] ${new Date().toISOString()} ${linha}`;
  try {
    appendFileSync(LOG, `${texto}\n`);
  } catch {
    console.log(texto); // sem permissão no arquivo (dev): vai para a saída do servidor
  }
}

/**
 * Processa a fila dentro do próprio servidor, sem esperar. A vez do processador (fila.pegarVez) impede dois
 * processamentos ao mesmo tempo, inclusive com o comando. Lança EnvioIndisponivel antes de começar se o SMTP
 * não estiver configurado: quem chama confere com remetente() antes de mudar qualquer coisa.
 */
export function iniciarProcessamento(): void {
  const enviarAviso = remetente();
  void processar({ fila: filaDaMesa(), segredo: segredo(), enviar: enviarAviso, log: registrar }).catch((e: unknown) =>
    registrar(`processamento parou com erro (${JSON.stringify(resumoErro(e))}); o envio continua "enviando": use Retomar`),
  );
}

export const ROTULO_STATUS: Record<Envio['status'], string> = { enviando: 'enviando', pausado: 'pausado', concluido: 'concluído', cancelado: 'cancelado' };

// ---- login por link
export const limites = {
  pedidoPorIp: criarLimite(3, 15 * MIN),
  pedidosNoDia: criarLimite(20, 24 * 60 * MIN),
  entradaPorIp: criarLimite(10, 15 * MIN),
};

/** Chave do limite por IP. O AstroContainer dos testes não tem endereço do cliente: vira "desconhecido". */
export function ipDe(astro: { clientAddress: string }): string {
  try {
    return chaveIp(astro.clientAddress);
  } catch {
    return chaveIp(undefined);
  }
}

/** E-mail com o link de entrada, sempre para a caixa da LAESA. Texto puro. */
export function emailDeEntrada(token: string, base: URL, agora = new Date()) {
  const link = new URL(`/mesa/entrar?t=${token}`, base);
  return {
    to: PUBLIC_CONTACT_EMAIL,
    subject: 'Link para entrar na tela de avisos da LAESA',
    text: [
      `Alguém pediu para entrar na tela de avisos do site da LAESA em ${quando(agora.toISOString())} (horário de Teresina).`,
      '',
      `Para entrar, abra o link no mesmo navegador em que fez o pedido. Ele vale 15 minutos e funciona uma vez só: ${link}`,
      '',
      'Se não foi alguém da Mesa, ignore este e-mail e avise a coordenação.',
      '',
      '— Site da LAESA',
    ].join('\n'),
  };
}

/**
 * Pede um link de entrada para a caixa da LAESA. Não diz se mandou: barrado pelo limite, com 5 links valendo
 * ou com o SMTP fora, quem chama responde igual. O destino nunca vem do pedido. O e-mail sai sem esperar:
 * esperar o SMTP só quando o pedido é aceito deixaria o tempo de resposta contar o que a resposta esconde.
 */
export function pedirLinkDeEntrada(ip: string, nonce: string, base: URL): void {
  if (!limites.pedidoPorIp(ip)) return void console.warn('[mesa] pedido de link barrado pelo limite por IP');
  if (!limites.pedidosNoDia('todos')) return void console.warn('[mesa] pedido de link barrado pelo limite diário');
  const token = painel().pedirLink(nonce);
  if (!token) return void console.warn('[mesa] pedido de link recusado: já há 5 links valendo');
  void enviar(emailDeEntrada(token, base)).catch((e: unknown) => console.error('[mesa] falha ao enviar o link de entrada', resumoErro(e)));
}

/** O que a tela mostra de um erro: a mensagem do ErroAviso (escrita para a Mesa) ou uma frase genérica, nunca a crua. */
export function mensagemDoErro(e: unknown, onde: string): string {
  if (e instanceof ErroAviso) return e.naTela ?? e.message;
  if (e instanceof EnvioIndisponivel) {
    console.warn(`[mesa] ${onde}: envio indisponível`);
    return 'O envio de e-mail não está disponível no servidor agora. Nada foi enviado. Avise quem cuida do servidor.';
  }
  console.error(`[mesa] ${onde}: erro inesperado`, resumoErro(e));
  return 'Algo deu errado do nosso lado. Tente de novo em instantes; se continuar, avise quem cuida do servidor.';
}

/** 422 para recusa (ErroAviso, ou SMTP não configurado: nada foi feito); 500 para o resto. */
export const statusDoErro = (e: unknown) => (e instanceof ErroAviso || e instanceof EnvioIndisponivel ? 422 : 500);
