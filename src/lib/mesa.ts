// Peças da tela de avisos (/mesa) no servidor: fila e painel (um por processo), manifesto publicado e login por
// link. As regras ficam em src/lib/avisos/acoes.ts e src/lib/painel.ts, as mesmas do comando (scripts/avisar.ts);
// aqui só entra o ambiente do site.
import { resolve } from 'node:path';
import { AVISOS_MANIFESTO, INSCRICAO_SECRET, INSCRITOS_DB } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';
import { ErroAviso, criarFila, quando, type Envio, type Fila } from './avisos/fila';
import { lerManifesto, type Manifesto } from './avisos/manifesto';
import { resumoErro } from './http';
import { enviar } from './mailer';
import { painelEm } from './painel';
import { chaveIp, criarLimite } from './rate-limit';
import { EnvioIndisponivel } from './smtp';

const MIN = 60_000;

function segredo(): string {
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
 * ou com o SMTP fora, quem chama responde igual. O destino nunca vem do pedido.
 */
export async function pedirLinkDeEntrada(ip: string, nonce: string, base: URL): Promise<void> {
  if (!limites.pedidoPorIp(ip)) return void console.warn('[mesa] pedido de link barrado pelo limite por IP');
  if (!limites.pedidosNoDia('todos')) return void console.warn('[mesa] pedido de link barrado pelo limite diário');
  const token = painel().pedirLink(nonce);
  if (!token) return void console.warn('[mesa] pedido de link recusado: já há 5 links valendo');
  try {
    await enviar(emailDeEntrada(token, base));
  } catch (e) {
    console.error('[mesa] falha ao enviar o link de entrada', resumoErro(e));
  }
}

/** O que a tela mostra de um erro: a mensagem do ErroAviso (escrita para a Mesa) ou uma frase genérica, nunca a crua. */
export function mensagemDoErro(e: unknown, onde: string): string {
  if (e instanceof ErroAviso) return e.message;
  if (e instanceof EnvioIndisponivel) {
    console.warn(`[mesa] ${onde}: envio indisponível`);
    return 'O envio de e-mail não está disponível no servidor agora. Nada foi enviado. Avise quem cuida do servidor.';
  }
  console.error(`[mesa] ${onde}: erro inesperado`, resumoErro(e));
  return 'Algo deu errado do nosso lado. Tente de novo em instantes; se continuar, avise quem cuida do servidor.';
}

/** 422 para recusa explicada (ErroAviso); 500 para o resto. */
export const statusDoErro = (e: unknown) => (e instanceof ErroAviso ? 422 : 500);
