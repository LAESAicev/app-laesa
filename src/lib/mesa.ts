// Peças da tela de avisos (/mesa) no servidor: painel (um por processo) e login por link. As regras ficam em
// src/lib/painel.ts, as mesmas do comando (scripts/avisar.ts); aqui só entra o ambiente do site.
import { INSCRITOS_DB } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';
import { quando } from './avisos/fila';
import { resumoErro } from './http';
import { enviar } from './mailer';
import { painelEm } from './painel';
import { chaveIp, criarLimite } from './rate-limit';

const MIN = 60_000;

export const painel = () => painelEm(INSCRITOS_DB);

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
